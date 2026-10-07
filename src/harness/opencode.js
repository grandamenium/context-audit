// OpenCode adapter. Rules were checked against `opencode debug config|skill|paths`
// (opencode 1.18.32) and the opencode.ai docs. Where the two disagree or the docs are
// silent, the choice is noted inline.
import fs from 'node:fs';
import path from 'node:path';
import { item, redact } from '../model.js';
import {
  ancestors, findRoot, fileSize, isDir, isFile, listDir, readFrontmatter, readJsonc, subdirs,
} from '../fsutil.js';

const CONFIG_NAMES = ['opencode.json', 'opencode.jsonc'];
const SCRIPT_EXT = /\.[cm]?[jt]s$/;
const MD_EXT = /\.md$/;
const GLOB_CHARS = /[*?[\]{}]/;
const WALK_SKIP = new Set(['node_modules', '.git']);
// opencode globs **/SKILL.md with no depth cap (verified: it lists skills 10 levels
// deep inside content-run folders); the cap here only guards pathological trees.
const MAX_SKILL_DEPTH = 32;
// Compiled into the binary, so not on disk. Seen in `opencode debug skill` on 1.18.32.
const BUILTIN_SKILLS = ['customize-opencode'];
const HOOK_NOTE = 'Code plugin: the hooks it registers are only known at runtime; not statically analyzed.';

const isObj = (v) => v != null && typeof v === 'object' && !Array.isArray(v);
const flagSet = (env, name) => {
  const v = env[name];
  return v != null && v !== '' && v !== '0' && v.toLowerCase() !== 'false';
};
const safeUrl = (u) => {
  try { const x = new URL(String(u)); return x.origin + x.pathname; } catch { return '<unparseable url>'; }
};
const pick = (v, keys) => (isObj(v) ? Object.fromEntries(keys.filter((k) => v[k] !== undefined).map((k) => [k, v[k]])) : {});

function mk({ kind, name, scope, status = 'active', path: p, reason, details }) {
  const f = { harness: 'opencode', kind, name, scope, status, path: p };
  if (reason) f.reason = reason;
  if (details && Object.keys(details).length) f.details = details;
  return item(f);
}

function globalDir(ctx) {
  const xdg = ctx.env?.XDG_CONFIG_HOME;
  return xdg ? path.join(xdg, 'opencode') : path.join(ctx.home, '.config', 'opencode');
}

function managedDirFor(ctx) {
  if (ctx.managedDir !== undefined) return ctx.managedDir;
  if (ctx.platform === 'darwin') return '/Library/Application Support/opencode';
  if (ctx.platform === 'linux') return '/etc/opencode';
  return null;
}

// Last definition of a name wins; earlier ones are shadowed. `defs` is ordered lowest
// to highest precedence. A def with `off` (a reason string) is disabled and never wins.
function resolveDefs(defs) {
  const winner = new Map();
  for (const d of defs) if (!d.off) winner.set(d.name, d);
  return defs.map((d) => {
    if (d.off) return { ...d, status: 'disabled', reason: d.off };
    const w = winner.get(d.name);
    if (w !== d) return { ...d, status: 'shadowed', reason: `same name defined later in ${w.path}` };
    return { ...d, status: 'active' };
  });
}

function mcpDetails(v) {
  if (!isObj(v)) return {};
  const argv = Array.isArray(v.command) ? v.command : [v.command];
  const d = { type: v.type ?? null, timeout: v.timeout ?? null };
  if (v.type === 'local' || Array.isArray(v.command)) {
    d.command = argv[0] ?? null;          // argv tail may hold tokens; only its length is reported
    d.argCount = Math.max(argv.length - 1, 0);
    if (v.cwd) d.cwd = v.cwd;
    if (v.environment) d.environment = v.environment;   // redact() keeps names only
  }
  if (v.url !== undefined) d.url = safeUrl(v.url);
  if (v.headers) d.headers = v.headers;                  // redact() keeps names only
  if (v.oauth !== undefined) d.oauth = v.oauth;
  return redact(d);
}

// Glob expansion without a dependency. Supports * ? ** per path segment. Braces and
// character classes are matched literally, so unsupported patterns simply match nothing.
function segRegex(seg) {
  const re = seg.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]');
  return new RegExp(`^${re}$`);
}

function walkGlob(dir, segs, out) {
  if (segs.length === 0) { if (isFile(dir)) out.push(dir); return; }
  const [seg, ...rest] = segs;
  if (seg === '**') {
    walkGlob(dir, rest, out);
    for (const s of subdirs(dir)) if (!WALK_SKIP.has(s)) walkGlob(path.join(dir, s), segs, out);
    return;
  }
  if (GLOB_CHARS.test(seg)) {
    const re = segRegex(seg);
    for (const e of listDir(dir)) if (re.test(e.name)) walkGlob(path.join(dir, e.name), rest, out);
    return;
  }
  walkGlob(path.join(dir, seg), rest, out);
}

export function expandGlob(pattern, base) {
  const abs = path.normalize(path.isAbsolute(pattern) ? pattern : path.join(base, pattern));
  const segs = abs.slice(path.parse(abs).root.length).split(path.sep).filter(Boolean);
  let start = path.parse(abs).root;
  let i = 0;
  while (i < segs.length && !GLOB_CHARS.test(segs[i])) start = path.join(start, segs[i++]);
  const out = [];
  walkGlob(start, segs.slice(i), out);
  return [...new Set(out)].sort();
}

function listFiles(dir, re) {
  return listDir(dir)
    .filter((e) => re.test(e.name) && isFile(path.join(dir, e.name)))
    .map((e) => path.join(dir, e.name))
    .sort();
}

// Markdown files under dir, recursively. Nested names use '/', e.g. "git/commit".
function walkMarkdown(dir, prefix = '', out = []) {
  for (const e of listDir(dir)) {
    const full = path.join(dir, e.name);
    if (isDir(full)) {
      walkMarkdown(full, `${prefix}${e.name}/`, out);
    } else if (MD_EXT.test(e.name) && isFile(full)) {
      out.push({ name: prefix + e.name.replace(MD_EXT, ''), file: full });
    }
  }
  return out;
}

// SKILL.md files at any depth under root. opencode lists nested skills (e.g.
// skills/<group>/<uuid>/<name>/SKILL.md), so discovery is not limited to direct children.
function findSkillFiles(root, depth = 0, out = [], seen = new Set()) {
  if (depth > MAX_SKILL_DEPTH) return out;
  let real;
  try { real = fs.realpathSync(root); } catch { return out; }
  if (seen.has(real)) return out; // symlink cycle
  seen.add(real);
  for (const s of subdirs(root)) {
    if (WALK_SKIP.has(s)) continue;
    const dir = path.join(root, s);
    const f = path.join(dir, 'SKILL.md');
    if (isFile(f)) out.push(f);
    findSkillFiles(dir, depth + 1, out, seen);
  }
  return out;
}

function findBinary(env) {
  for (const d of (env.PATH || '').split(path.delimiter)) {
    if (!d) continue;
    const p = path.join(d, 'opencode');
    if (isFile(p)) { try { return fs.realpathSync(p); } catch { return p; } }
  }
  return null;
}

/**
 * @param {{cwd:string, home:string, env:Object, platform:string, managedDir?:string|null}} ctx
 */
export function auditOpencode(ctx) {
  const env = ctx.env || {};
  const home = ctx.home;
  const cwd = path.resolve(ctx.cwd);
  const warnings = [];
  const items = [];
  const chain = [];
  const gDir = globalDir(ctx);
  const projectRoot = findRoot(cwd) ?? cwd;
  const walk = ancestors(cwd, projectRoot);     // nearest first
  const scopeOf = (dir) => (dir === cwd || dir === projectRoot ? 'project' : 'ancestor');
  const claudeCodeOff = flagSet(env, 'OPENCODE_DISABLE_CLAUDE_CODE');
  const claudePromptOff = claudeCodeOff || flagSet(env, 'OPENCODE_DISABLE_CLAUDE_CODE_PROMPT');
  const claudeSkillsOff = claudeCodeOff || flagSet(env, 'OPENCODE_DISABLE_CLAUDE_CODE_SKILLS');

  // 1. Config files, ascending precedence: global, OPENCODE_CONFIG, project (farthest
  //    first), managed. Remote .well-known and OPENCODE_CONFIG_CONTENT are not read.
  const cfgFiles = [];
  const addCfg = (dir, scope) => {
    for (const n of CONFIG_NAMES) {
      const f = path.join(dir, n);
      if (isFile(f)) cfgFiles.push({ path: f, scope });
    }
  };
  addCfg(gDir, 'user');
  if (env.OPENCODE_CONFIG) {
    const f = path.resolve(cwd, env.OPENCODE_CONFIG);
    if (isFile(f)) cfgFiles.push({ path: f, scope: 'user' });
    else warnings.push(`OPENCODE_CONFIG points at a missing file: ${f}`);
  }
  for (const dir of [...walk].reverse()) addCfg(dir, scopeOf(dir));
  const managed = managedDirFor(ctx);
  if (managed) addCfg(managed, 'managed');

  const cfg = { mcp: [], agent: [], command: [], plugin: [], instructions: [] };
  for (const c of cfgFiles) {
    const data = readJsonc(c.path);
    if (data?.__parseError || !isObj(data)) {
      warnings.push(`${c.path}: ${data?.__parseError ?? 'not a JSON object'}; skipped`);
      continue;
    }
    chain.push({ path: c.path, scope: c.scope });
    for (const kind of ['mcp', 'agent', 'command']) {
      if (isObj(data[kind])) {
        for (const [name, value] of Object.entries(data[kind])) cfg[kind].push({ name, path: c.path, scope: c.scope, value });
      }
    }
    if (Array.isArray(data.plugin)) {
      for (const v of data.plugin) if (typeof v === 'string') cfg.plugin.push({ name: v, path: c.path, scope: c.scope });
    }
    if (Array.isArray(data.instructions)) {
      for (const v of data.instructions) if (typeof v === 'string') cfg.instructions.push({ entry: v, path: c.path, scope: c.scope });
    }
  }

  // 2. mcp: an enabled:false entry that wins its name is disabled.
  for (const d of resolveDefs(cfg.mcp)) {
    let { status, reason } = d;
    if (status === 'active' && d.value?.enabled === false) { status = 'disabled'; reason = 'enabled: false'; }
    items.push(mk({ kind: 'mcp', name: d.name, scope: d.scope, status, path: d.path, reason, details: mcpDetails(d.value) }));
  }

  // 3. agent / command / plugin config keys.
  for (const kind of ['agent', 'command']) {
    for (const d of resolveDefs(cfg[kind])) {
      items.push(mk({
        kind, name: d.name, scope: d.scope, status: d.status, path: d.path, reason: d.reason,
        details: redact(pick(d.value, ['description', 'mode', 'model', 'agent', 'subtask'])),
      }));
    }
  }
  for (const d of resolveDefs(cfg.plugin)) {
    items.push(mk({ kind: 'plugin', name: d.name, scope: d.scope, status: d.status, path: d.path, reason: d.reason }));
  }

  // 4. instructions: globs relative to the defining config's directory; URLs are not fetched.
  for (const d of cfg.instructions) {
    if (/^https?:\/\//i.test(d.entry)) {
      items.push(mk({
        kind: 'rule', name: safeUrl(d.entry), scope: 'remote', status: 'unknown', path: d.path,
        reason: 'remote instructions are fetched at runtime; not checked',
      }));
      continue;
    }
    const base = path.dirname(d.path);
    const matches = expandGlob(d.entry, base);
    if (!matches.length) warnings.push(`instructions entry "${d.entry}" in ${d.path} matched no files`);
    for (const f of matches) {
      items.push(mk({ kind: 'rule', name: path.relative(base, f), scope: d.scope, path: f, details: { bytes: fileSize(f) } }));
    }
  }

  // 5. Bootstrap docs. Project: every AGENTS.md on the walk loads; CLAUDE.md is only a
  //    fallback when none is found. Global: ~/.config/opencode/AGENTS.md, else ~/.claude/CLAUDE.md.
  const boot = (file, scope, status = 'active', reason) => mk({
    kind: 'bootstrap', name: path.basename(file), scope, status, path: file, reason, details: { bytes: fileSize(file) },
  });
  const projAgents = walk.map((d) => path.join(d, 'AGENTS.md')).filter(isFile);
  const projClaude = walk.map((d) => path.join(d, 'CLAUDE.md')).filter(isFile);
  for (const f of projAgents) items.push(boot(f, scopeOf(path.dirname(f))));
  for (const f of projClaude) {
    const sc = scopeOf(path.dirname(f));
    if (projAgents.length) items.push(boot(f, sc, 'shadowed', 'CLAUDE.md is used only when no AGENTS.md is found'));
    else if (claudeCodeOff) items.push(boot(f, sc, 'disabled', 'OPENCODE_DISABLE_CLAUDE_CODE is set'));
    else items.push(boot(f, sc));
  }
  const gAgents = path.join(gDir, 'AGENTS.md');
  const gClaude = path.join(home, '.claude', 'CLAUDE.md');
  if (isFile(gAgents)) items.push(boot(gAgents, 'user'));
  if (isFile(gClaude)) {
    if (claudePromptOff) items.push(boot(gClaude, 'user', 'disabled', 'OPENCODE_DISABLE_CLAUDE_CODE(_PROMPT) is set'));
    else if (isFile(gAgents)) items.push(boot(gClaude, 'user', 'shadowed', '~/.config/opencode/AGENTS.md takes precedence'));
    else items.push(boot(gClaude, 'user'));
  }

  // 6. Skills. Ascending precedence: built-in, global (.agents, .claude, opencode), then
  //    project dirs farthest first (.agents, .claude, .opencode). Within a dir, the name
  //    comes from frontmatter. A SKILL.md without name and description is skipped by opencode.
  const skillRoots = [];
  skillRoots.push({ dir: path.join(home, '.agents', 'skills'), scope: 'user' });
  skillRoots.push({ dir: path.join(home, '.claude', 'skills'), scope: 'user', claude: true });
  skillRoots.push({ dir: path.join(gDir, 'skills'), scope: 'user' });
  for (const dir of [...walk].reverse()) {
    const sc = scopeOf(dir);
    skillRoots.push({ dir: path.join(dir, '.agents', 'skills'), scope: sc });
    skillRoots.push({ dir: path.join(dir, '.claude', 'skills'), scope: sc, claude: true });
    skillRoots.push({ dir: path.join(dir, '.opencode', 'skills'), scope: sc });
  }
  const binary = findBinary(env);
  const skillDefs = [];
  if (binary) {
    for (const name of BUILTIN_SKILLS) skillDefs.push({ name, path: binary, scope: 'builtin', details: {} });
  } else {
    warnings.push('built-in skills not listed: no opencode binary found on PATH');
  }
  const seenRoots = new Set();
  for (const root of skillRoots) {
    if (seenRoots.has(root.dir) || !listDir(root.dir).length) continue;
    seenRoots.add(root.dir);
    for (const file of findSkillFiles(root.dir)) {
      const fm = readFrontmatter(file)?.data ?? {};
      const name = typeof fm.name === 'string' ? fm.name.trim() : '';
      const description = typeof fm.description === 'string' ? fm.description.trim() : '';
      if (!name || !description) {
        warnings.push(`skill at ${file} has no name/description frontmatter; opencode does not list it`);
        continue;
      }
      dirNameCheck(file, name, warnings);
      skillDefs.push({
        name,
        path: file,
        scope: root.scope,
        off: root.claude && claudeSkillsOff ? 'OPENCODE_DISABLE_CLAUDE_CODE(_SKILLS) is set' : undefined,
        details: { description, bytes: fileSize(file) },
      });
    }
  }
  for (const d of resolveDefs(skillDefs)) {
    items.push(mk({ kind: 'skill', name: d.name, scope: d.scope, status: d.status, path: d.path, reason: d.reason, details: d.details }));
  }

  // 7. Code plugins (files) and markdown agents/commands. Plugin dirs take plural and
  //    singular names. Only files at the top level of each plugin dir are loaded.
  const opencodeDirs = [{ base: gDir, scope: 'user' }, ...[...walk].reverse().map((d) => ({ base: path.join(d, '.opencode'), scope: scopeOf(d) }))];
  const hookSeen = new Set();
  for (const { base, scope } of opencodeDirs) {
    for (const sub of ['plugins', 'plugin']) {
      for (const f of listFiles(path.join(base, sub), SCRIPT_EXT)) {
        if (hookSeen.has(f)) continue;
        hookSeen.add(f);
        items.push(mk({
          kind: 'hook', name: path.basename(f).replace(SCRIPT_EXT, ''), scope, path: f,
          details: { bytes: fileSize(f), note: HOOK_NOTE },
        }));
      }
    }
  }
  const mdDefs = (subs) => {
    const defs = [];
    for (const { base, scope } of opencodeDirs) {
      for (const sub of subs) {
        for (const { name, file } of walkMarkdown(path.join(base, sub))) {
          const description = readFrontmatter(file)?.data?.description;
          defs.push({ name, path: file, scope, details: description ? { description: String(description) } : {} });
        }
      }
    }
    return defs;
  };
  for (const [kind, subs] of [['agent', ['agents', 'agent']], ['command', ['commands', 'command']]]) {
    for (const d of resolveDefs(mdDefs(subs))) {
      items.push(mk({ kind, name: d.name, scope: d.scope, status: d.status, path: d.path, reason: d.reason, details: d.details }));
    }
  }

  return { harness: 'opencode', projectRoot, chain, items, warnings };
}

// Warn when the frontmatter name differs from the directory. opencode lists the skill
// under the frontmatter name (seen with taste-skill -> design-taste-frontend).
function dirNameCheck(file, name, warnings) {
  const dirName = path.basename(path.dirname(file));
  if (dirName !== name) {
    warnings.push(`skill frontmatter name "${name}" differs from directory "${dirName}" (${file}); using frontmatter name`);
  }
}
