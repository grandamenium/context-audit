// Claude Code adapter. Resolves what a session booted in ctx.cwd would load.
// Never touches os.homedir()/process.env: only ctx.home and ctx.env.
import path from 'node:path';
import {
  exists, isDir, isFile, readText, fileSize, canonical, listDir, subdirs, readJson,
  readFrontmatter, ancestors, findRoot,
} from '../fsutil.js';
import { item, redact } from '../model.js';

const H = 'claude';
const IMPORT_MAX_HOPS = 4;
const SECRETISH = /(token|secret|key|password|bearer|credential|authorization)/i;

const defaultManagedDir = (platform) =>
  platform === 'darwin' ? '/Library/Application Support/ClaudeCode' : platform === 'win32' ? 'C:\\Program Files\\ClaudeCode' : '/etc/claude-code';

function globToRegex(g) {
  let re = '';
  for (let i = 0; i < g.length; i++) {
    const c = g[i];
    if (c === '*') {
      if (g[i + 1] === '*') { i++; if (g[i + 1] === '/') { i++; re += '(?:.*/)?'; } else re += '.*'; } else re += '[^/]*';
    } else if (c === '?') re += '[^/]';
    else re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`);
}

const asArray = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
const scrubUrl = (u) => { try { const x = new URL(u); x.username = ''; x.password = ''; x.search = ''; return x.toString(); } catch { return u; } };
const scrubArgs = (args) => asArray(args).map((a) => (typeof a === 'string' && SECRETISH.test(a) && /[=:]/.test(a) ? `${a.split(/[=:]/)[0]}=<redacted>` : a));

export function auditClaude(ctx) {
  const { home, env = {}, platform = process.platform } = ctx;
  const launch = ctx.launch || {};
  const cwd = canonical(ctx.cwd);
  const managedDir = ctx.managedDir || defaultManagedDir(platform);
  const warnings = [];
  const items = [];
  const push = (f) => { const it = item({ harness: H, ...f }); items.push(it); return it; };

  const projectRoot = findRoot(cwd) || cwd;
  const userDir = path.join(home, '.claude');
  const claudeJsonPath = path.join(home, '.claude.json');

  const loadJson = (p) => {
    const d = readJson(p);
    if (d && d.__parseError) { warnings.push(`parse error in ${p}: ${d.__parseError}`); return null; }
    return d;
  };

  // ---- ~/.claude.json (trust, local mcp) ----
  const claudeJson = loadJson(claudeJsonPath) || {};
  const projectsCfg = claudeJson.projects || {};
  const projKeys = [...new Set([cwd, projectRoot])];
  const trusted = ancestors(cwd).some((d) => projectsCfg[d]?.hasTrustDialogAccepted === true);
  const projCfgs = projKeys.map((k) => projectsCfg[k]).filter(Boolean);
  for (const k of projKeys) {
    if (!projectsCfg[k]) {
      const ci = Object.keys(projectsCfg).find((x) => x.toLowerCase() === k.toLowerCase());
      if (ci) warnings.push(`~/.claude.json has project key "${ci}" that differs only by case from "${k}"; Claude Code keys by exact string, so it does not apply`);
    }
  }

  // ---- settings layers, ascending precedence ----
  const sources = []; // {scope, path, data}
  const addSource = (scope, p, via) => {
    if (!isFile(p)) return;
    const data = loadJson(p);
    if (data && typeof data === 'object') sources.push({ scope, path: p, data, via });
  };
  addSource('user', path.join(userDir, 'settings.json'));
  // Project settings come from the launch cwd only: observed that hooks defined in an agent subdir's
  // .claude/settings.json fire although the git root is higher up. Whether a git-root settings.json is
  // also read from a subdir cwd could not be confirmed from transcripts (no visible effect), so it is not read.
  const settingsDirs = [cwd];
  for (const d of settingsDirs) addSource('project', path.join(d, '.claude', 'settings.json'));
  for (const d of settingsDirs) addSource('local', path.join(d, '.claude', 'settings.local.json'));
  // --settings layers sit between local and managed
  for (const s of asArray(launch.settings)) {
    if (s.path) addSource('local', s.path, '--settings');
    else if (s.inline && typeof s.inline === 'object') sources.push({ scope: 'local', path: 'inline:--settings', data: s.inline, via: '--settings' });
  }
  addSource('managed', path.join(managedDir, 'managed-settings.json'));
  const mdDir = path.join(managedDir, 'managed-settings.d');
  for (const e of listDir(mdDir).filter((x) => x.name.endsWith('.json')).sort((a, b) => a.name.localeCompare(b.name))) {
    addSource('managed', path.join(mdDir, e.name));
  }
  if (!trusted && sources.some((s) => s.scope === 'project')) {
    warnings.push('folder has no recorded trust in ~/.claude.json: project settings.json MCP approval keys and project hooks may be ignored');
  }

  const scalar = (key, pred = () => true) => {
    let v; let from = null;
    for (const s of sources) if (key in s.data && pred(s)) { v = s.data[key]; from = s.path; }
    return { v, from };
  };
  const union = (key, pred = () => true) => [...new Set(sources.filter(pred).flatMap((s) => asArray(s.data[key])))];

  // enabledPlugins merged by key, higher precedence wins
  const enabledPlugins = {};
  for (const s of sources) {
    for (const [k, v] of Object.entries(s.data.enabledPlugins || {})) enabledPlugins[k] = { v: !!v, from: s.path };
  }

  // disableAllHooks: non-managed last-wins; managed true disables everything
  const nonManagedDisable = scalar('disableAllHooks', (s) => s.scope !== 'managed').v === true;
  const managedDisable = scalar('disableAllHooks', (s) => s.scope === 'managed').v === true;

  // ---- bootstrap ----
  let order = 0;
  const excludes = union('claudeMdExcludes').map((g) => globToRegex(g.startsWith('~/') ? path.join(home, g.slice(2)) : g));
  const isExcluded = (p) => excludes.some((r) => r.test(p));
  const seenBoot = new Set();

  function addBootstrap(p, scope, status0, extra = {}, kind = 'bootstrap', hop = 0, importedBy = null, nameOverride = null) {
    const rp = canonical(p);
    if (seenBoot.has(rp)) return null;
    const text0 = readText(p);
    if (text0 !== null && !text0.trim()) return null; // empty files are not loaded (observed)
    let unreadable = false;
    if (text0 === null) { // present but unreadable now (e.g. iCloud dataless file, EDEADLK)
      unreadable = true;
      warnings.push(`unreadable now, status unknown: ${p}`);
    }
    seenBoot.add(rp);
    let status = status0; let reason = extra.reason;
    if (unreadable) { status = 'unknown'; reason = 'file exists but cannot be read now (iCloud-evicted or locked); may have loaded when the session started'; }
    if (scope !== 'managed' && isExcluded(p)) { status = 'disabled'; reason = 'matched claudeMdExcludes'; }
    const { reason: _r, ...rest } = extra;
    const it = push({
      kind, name: nameOverride || path.basename(p), scope, status, path: p, reason,
      details: { order: ++order, bytes: fileSize(p), ...(importedBy ? { importedBy, hop } : {}), ...rest },
    });
    expandImports(p, it, scope, hop);
    return it;
  }

  function findImports(text) {
    const stripped = text
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[^\n]*$/gm, '')
      .replace(/`[^`\n]*`/g, '');
    const out = [];
    for (const m of stripped.matchAll(/(?:^|[\s(])@((?:\\ |[^\s)\]`])+)/g)) out.push(m[1]);
    return out;
  }

  function resolveImport(raw, fromFile) {
    const tries = [raw, raw.replace(/[.,;:!?]+$/, '')];
    for (const t of tries) {
      let q = t.replace(/\\ /g, ' ');
      if (q === '~' || q.startsWith('~/')) q = path.join(home, q.slice(1));
      const abs = path.isAbsolute(q) ? q : path.resolve(path.dirname(fromFile), q);
      if (isFile(abs)) return abs;
    }
    return null;
  }

  function expandImports(file, parentItem, scope, hop) {
    if (hop >= IMPORT_MAX_HOPS) return;
    if (parentItem.status === 'disabled' || parentItem.status === 'shadowed') return;
    const text = readText(file);
    if (!text) return;
    for (const raw of findImports(text)) {
      const abs = resolveImport(raw, file);
      if (!abs) continue;
      let status = parentItem.status; let reason;
      const external = !abs.startsWith(cwd + path.sep) && abs !== cwd;
      if (external && scope !== 'user' && scope !== 'managed') {
        const approved = projCfgs.some((c) => c.hasClaudeMdExternalIncludesApproved === true);
        if (!approved) { status = 'needs-approval'; reason = 'external import outside cwd not yet approved (~/.claude.json hasClaudeMdExternalIncludesApproved)'; }
      }
      addBootstrap(abs, scope, status, { reason }, 'bootstrap', hop + 1, file, `@${raw}`);
    }
  }

  const ruleStatus = (p) => {
    const fm = readFrontmatter(p);
    const paths = asArray(fm?.data?.paths);
    return paths.length ? { status: 'conditional', extra: { paths, reason: 'path-scoped rule: loads when matching files are touched' } } : { status: 'active', extra: {} };
  };
  function walkRules(dir, scope) {
    const out = [];
    const rec = (d, rel) => {
      for (const e of listDir(d).sort((a, b) => a.name.localeCompare(b.name))) {
        const p = path.join(d, e.name);
        if (isDir(p)) rec(p, path.join(rel, e.name));
        else if (e.name.endsWith('.md') && isFile(p)) out.push([p, path.join(rel, e.name)]);
      }
    };
    rec(dir, '');
    for (const [p, rel] of out) { const r = ruleStatus(p); addBootstrap(p, scope, r.status, r.extra, 'rule', 0, null, rel); }
  }

  // managed CLAUDE.md, user CLAUDE.md, user rules
  if (isFile(path.join(managedDir, 'CLAUDE.md'))) addBootstrap(path.join(managedDir, 'CLAUDE.md'), 'managed', 'active');
  const userMd = path.join(userDir, 'CLAUDE.md');
  if (isFile(userMd)) addBootstrap(userMd, 'user', 'active');
  walkRules(path.join(userDir, 'rules'), 'user');

  // ancestors root -> cwd
  const chain = ancestors(cwd).reverse();
  const agentsCandidates = [];
  let haveClaudeMd = false;
  for (const d of chain) {
    const scopeFor = d === cwd || d === projectRoot ? 'project' : 'ancestor';
    for (const [rel, scope] of [['CLAUDE.md', scopeFor], ['.claude/CLAUDE.md', scopeFor], ['CLAUDE.local.md', 'local']]) {
      const p = path.join(d, rel);
      if (!isFile(p)) continue;
      if (canonical(p) === canonical(userMd)) continue; // user CLAUDE.md does not count for the AGENTS.md rule
      const t = readText(p);
      if (t !== null && !t.trim()) continue;
      haveClaudeMd = true;
      addBootstrap(p, scope, 'active');
    }
    for (const rel of ['AGENTS.md', '.claude/AGENTS.md']) {
      const p = path.join(d, rel);
      if (isFile(p)) agentsCandidates.push([p, scopeFor]);
    }
  }
  // AGENTS.md: read only when no CLAUDE.md-family file exists in cwd or above
  for (const [p, scope] of agentsCandidates) {
    if (haveClaudeMd) {
      push({ kind: 'bootstrap', name: path.basename(p), scope, status: 'shadowed', path: p, reason: 'AGENTS.md ignored: a CLAUDE.md/CLAUDE.local.md exists in cwd or above', details: { bytes: fileSize(p) } });
    } else addBootstrap(p, scope, 'active', { reason: 'AGENTS.md fallback: no CLAUDE.md found' });
  }

  // project rules (project root, and cwd if different)
  for (const d of new Set([projectRoot, cwd])) walkRules(path.join(d, '.claude', 'rules'), 'project');

  // auto memory: ~/.claude/projects/<slug of project root>/memory/MEMORY.md (type AutoMem in transcripts)
  const memFile = path.join(userDir, 'projects', projectRoot.replace(/[^a-zA-Z0-9]/g, '-'), 'memory', 'MEMORY.md');
  if (isFile(memFile)) addBootstrap(memFile, 'user', 'active', { autoMemory: true, reason: 'auto memory index (first 200 lines / 25KB)' });

  // --add-dir: CLAUDE.md family and rules from each added directory
  const addDirs = asArray(launch.addDirs).map((d) => d.path).filter(Boolean);
  for (const d of addDirs) {
    for (const rel of ['CLAUDE.md', '.claude/CLAUDE.md', 'CLAUDE.local.md']) {
      const p = path.join(d, rel);
      if (isFile(p)) addBootstrap(p, rel === 'CLAUDE.local.md' ? 'local' : 'project', 'active', { via: '--add-dir' });
    }
    walkRules(path.join(d, '.claude', 'rules'), 'project');
  }
  // prompt files from launch flags
  for (const [key, flag, reason] of [['appendSystemPromptFiles', '--append-system-prompt-file', 'appended to the system prompt'], ['systemPromptFiles', '--system-prompt-file', 'replaces the default system prompt']]) {
    for (const f of asArray(launch[key])) {
      if (!f.path) continue;
      push({ kind: 'bootstrap', name: path.basename(f.path), scope: 'local', status: isFile(f.path) ? 'active' : 'unknown', path: f.path, reason, details: { order: ++order, bytes: fileSize(f.path), via: flag } });
    }
  }

  // ---- hooks ----
  const hookKeys = new Set();
  function eventMap(map) { return map && typeof map === 'object' && !Array.isArray(map) ? map : {}; }
  function addHooks(map, base) {
    for (const [event, groups] of Object.entries(eventMap(map))) {
      for (const g of asArray(groups)) {
        for (const h of asArray(g?.hooks)) {
          const matcher = g.matcher || '';
          const details = { event, matcher, type: h.type || 'command' };
          if (base.via) details.via = base.via;
          if (h.command) details.command = h.command;
          if (h.url) details.url = scrubUrl(h.url);
          if (h.server) details.server = h.server;
          if (h.tool) details.tool = h.tool;
          if (h.prompt) details.prompt = String(h.prompt).slice(0, 120);
          let status = base.status || 'active'; let reason = base.reason;
          if (status === 'active' && base.disabled) { status = 'disabled'; reason = 'disableAllHooks is set'; }
          if (base.dedupe && status === 'active') {
            const key = JSON.stringify([event, matcher, h]);
            if (hookKeys.has(key)) { status = 'shadowed'; reason = 'identical handler already defined in a higher-precedence-listed settings file; runs once'; } else hookKeys.add(key);
          }
          push({ kind: 'hook', name: `${event}:${matcher || '*'}`, scope: base.scope, status, path: base.path, plugin: base.plugin, reason, details: redact(details) });
        }
      }
    }
  }
  for (const s of sources) {
    const disabled = s.scope === 'managed' ? managedDisable : (nonManagedDisable || managedDisable);
    addHooks(s.data.hooks, { scope: s.scope, path: s.path, disabled, dedupe: true, via: s.via });
  }

  // ---- plugins ----
  const installedPath = path.join(userDir, 'plugins', 'installed_plugins.json');
  const installed = loadJson(installedPath)?.plugins || {};
  const activePlugins = []; // {id, name, root, manifest, manifestPath, entry}
  const knownMkts = loadJson(path.join(userDir, 'plugins', 'known_marketplaces.json')) || {};
  const mktCache = {};
  function marketplaceEntry(id) {
    const [pname, mkt] = id.split('@');
    if (!mkt || !knownMkts[mkt]) return null;
    mktCache[mkt] ??= loadJson(path.join(knownMkts[mkt].installLocation || '', '.claude-plugin', 'marketplace.json')) || {};
    return asArray(mktCache[mkt].plugins).find((e) => e.name === pname) || null;
  }
  for (const [id, entries] of Object.entries(installed)) {
    const apps = asArray(entries).filter((e) => {
      if (e.scope === 'project' || e.scope === 'local') return e.projectPath && [cwd, projectRoot].some((k) => k === e.projectPath || k.startsWith(e.projectPath + path.sep));
      return true;
    });
    if (!apps.length) continue;
    const e = apps.find((x) => x.scope === 'project' || x.scope === 'local') || apps[0];
    const root = e.installPath;
    const manifestPath = path.join(root, '.claude-plugin', 'plugin.json');
    const manifest = isFile(manifestPath) ? loadJson(manifestPath) || {} : {};
    const en = enabledPlugins[id];
    let status; let reason;
    if (en) { status = en.v ? 'active' : 'disabled'; if (!en.v) reason = 'enabledPlugins is false'; }
    else if (manifest.defaultEnabled === false) { status = 'disabled'; reason = 'not in enabledPlugins and defaultEnabled is false'; }
    else { status = 'active'; reason = 'not in enabledPlugins; defaultEnabled defaults to true'; }
    if (status === 'active' && !isDir(root)) { status = 'disabled'; reason = `installPath missing: ${root}`; }
    const name = id.split('@')[0];
    const scope = ['user', 'project', 'local', 'managed'].includes(e.scope) ? e.scope : 'user';
    push({
      kind: 'plugin', name: id, scope, status, reason,
      path: isFile(manifestPath) ? manifestPath : installedPath, definedIn: en?.from || installedPath,
      details: { version: e.version, installPath: root, description: manifest.description, installScope: e.scope },
    });
    if (status === 'active') activePlugins.push({ id, name: manifest.name || name, root, manifest, manifestPath, entry: marketplaceEntry(id) });
  }

  // --plugin-dir: session-only plugins
  for (const pd of asArray(launch.pluginDirs)) {
    const root = pd.path;
    if (!root || !isDir(root)) { warnings.push(`--plugin-dir not found: ${root}`); continue; }
    const manifestPath = path.join(root, '.claude-plugin', 'plugin.json');
    const manifest = isFile(manifestPath) ? loadJson(manifestPath) || {} : {};
    const name = manifest.name || path.basename(root);
    const id = `${name}@inline`;
    push({ kind: 'plugin', name: id, scope: 'local', status: 'active', reason: 'loaded via --plugin-dir', path: isFile(manifestPath) ? manifestPath : root, details: { installPath: root, description: manifest.description, via: '--plugin-dir' } });
    activePlugins.push({ id, name, root, manifest, manifestPath });
  }

  // plugin hooks
  for (const pl of activePlugins) {
    const base = { scope: 'plugin', plugin: pl.id, disabled: nonManagedDisable || managedDisable };
    const hooksJson = path.join(pl.root, 'hooks', 'hooks.json');
    if (isFile(hooksJson)) addHooks(loadJson(hooksJson)?.hooks, { ...base, path: hooksJson });
    for (const h of asArray(pl.manifest.hooks)) {
      if (typeof h === 'string') {
        const hp = path.resolve(pl.root, h);
        if (isFile(hp)) addHooks(loadJson(hp)?.hooks, { ...base, path: hp });
      } else addHooks(h, { ...base, path: pl.manifestPath });
    }
  }

  // ---- mcp ----
  const mcpCands = []; // {rank, name, it fields}
  const RANK = { managed: 0, local: 1, project: 2, user: 3, plugin: 4 };
  function addMcp(name, cfg, scope, p, extra = {}) {
    if (!cfg || typeof cfg !== 'object') return;
    const transport = cfg.type || (cfg.url ? 'http' : 'stdio');
    const details = { transport };
    if (cfg.command) details.command = cfg.command;
    if (cfg.args) details.args = scrubArgs(cfg.args);
    if (cfg.url) details.url = scrubUrl(cfg.url);
    if (cfg.env) details.env = cfg.env;
    if (cfg.headers) details.headers = cfg.headers;
    if (extra.toolPrefix) details.toolPrefix = extra.toolPrefix;
    if (extra.via) details.via = extra.via;
    mcpCands.push({ name, scope, rank: RANK[scope], status: extra.status || 'active', reason: extra.reason, path: p, plugin: extra.plugin, definedIn: extra.definedIn, cli: !!extra.via, url: cfg.url ? String(cfg.url).replace(/\/+$/, '').toLowerCase() : undefined, details: redact(details) });
  }

  // managed
  const managedMcp = path.join(managedDir, 'managed-mcp.json');
  if (isFile(managedMcp)) {
    const d = loadJson(managedMcp);
    for (const [n, c] of Object.entries(d?.mcpServers || {})) addMcp(n, c, 'managed', managedMcp);
  }
  for (const s of sources.filter((x) => x.scope === 'managed')) {
    for (const [n, c] of Object.entries(s.data.managedMcpServers || {})) addMcp(n, c, 'managed', s.path);
  }
  // --mcp-config
  for (const m of asArray(launch.mcpConfig)) {
    const d = m.path ? loadJson(m.path) : m.inline;
    const map = d?.mcpServers || d || {};
    for (const [n, c] of Object.entries(map)) addMcp(n, c, 'local', m.path || 'inline:--mcp-config', { via: '--mcp-config' });
  }
  // local
  for (const k of projKeys) {
    for (const [n, c] of Object.entries(projectsCfg[k]?.mcpServers || {})) addMcp(n, c, 'local', claudeJsonPath, { reason: `projects["${k}"]` });
  }
  // project .mcp.json with approval state
  const projTrustedSetting = (s) => s.scope !== 'project' || trusted;
  const enableAll = scalar('enableAllProjectMcpServers', projTrustedSetting).v === true;
  const enabledNames = new Set([...union('enabledMcpjsonServers', projTrustedSetting), ...projCfgs.flatMap((c) => asArray(c.enabledMcpjsonServers))]);
  const disabledNames = new Set([...union('disabledMcpjsonServers', projTrustedSetting), ...projCfgs.flatMap((c) => asArray(c.disabledMcpjsonServers))]);
  // .mcp.json is read in cwd and every parent (observed: a cwd-level .mcp.json below the git root loads)
  const mcpJsonDirs = ancestors(cwd);
  const seenMcpNames = new Set();
  for (const dir of mcpJsonDirs) { // nearest first: closer file wins on a duplicate name
    const mcpJson = path.join(dir, '.mcp.json');
    if (!isFile(mcpJson)) continue;
    const d = loadJson(mcpJson);
    for (const [n, c] of Object.entries(d?.mcpServers || {})) {
      if (seenMcpNames.has(n)) continue;
      seenMcpNames.add(n);
      let status; let reason;
      if (disabledNames.has(n)) { status = 'disabled'; reason = 'in disabledMcpjsonServers'; }
      else if (enableAll) { status = 'active'; reason = 'enableAllProjectMcpServers'; }
      else if (enabledNames.has(n)) { status = 'active'; reason = 'in enabledMcpjsonServers'; }
      else { status = 'needs-approval'; reason = 'project .mcp.json server not yet approved'; }
      addMcp(n, c, 'project', mcpJson, { status, reason });
    }
  }
  // approvals that name a server no .mcp.json defines (stale)
  for (const [names, from] of [
    ...projCfgs.map((c) => [asArray(c.enabledMcpjsonServers), claudeJsonPath]),
    ...sources.filter(projTrustedSetting).map((src) => [asArray(src.data.enabledMcpjsonServers), src.path]),
  ]) {
    for (const n of names) {
      if (seenMcpNames.has(n) || mcpCands.some((c) => c.name === n && c.stale)) continue;
      mcpCands.push({ name: n, scope: 'project', rank: RANK.project, status: 'disabled', reason: 'listed in enabledMcpjsonServers but no .mcp.json defines it (stale approval)', path: from, stale: true, details: { transport: 'unknown' } });
    }
  }
  // user
  for (const [n, c] of Object.entries(claudeJson.mcpServers || {})) addMcp(n, c, 'user', claudeJsonPath);
  // plugin
  for (const pl of activePlugins) {
    const files = [path.join(pl.root, '.mcp.json')];
    const inline = [];
    for (const m of asArray(pl.manifest.mcpServers)) {
      if (typeof m === 'string') files.push(path.resolve(pl.root, m)); else inline.push(m);
    }
    const defs = [];
    for (const f of files) {
      if (!isFile(f) || !f.endsWith('.json')) continue;
      const d = loadJson(f);
      defs.push([f, d?.mcpServers || d || {}]);
    }
    for (const m of inline) defs.push([pl.manifestPath, m]);
    for (const [f, map] of defs) {
      for (const [n, c] of Object.entries(map)) {
        if (!c || typeof c !== 'object') continue;
        addMcp(n, c, 'plugin', f, { plugin: pl.id, toolPrefix: `mcp__plugin_${pl.name}_${n}__` });
      }
    }
  }
  // shadowing by name (and by identical URL), winner = highest precedence non-disabled
  if (launch.strictMcpConfig) {
    for (const c of mcpCands) if (!c.cli) { c.status = 'disabled'; c.reason = '--strict-mcp-config'; }
    warnings.push('--strict-mcp-config: only --mcp-config servers apply; claude.ai connectors are also excluded');
  }
  mcpCands.sort((a, b) => a.rank - b.rank);
  const winnerName = new Map(); const winnerUrl = new Map();
  for (const c of mcpCands) {
    if (c.status === 'disabled') continue;
    // plugin servers are namespaced (mcp__plugin_<plugin>_<server>), so they never collide by name, only by endpoint
    const byName = c.scope === 'plugin' ? null : winnerName.get(c.name);
    const byUrl = c.url && winnerUrl.get(c.url);
    if (byName || byUrl) {
      const w = byName || byUrl;
      c.status = 'shadowed'; c.reason = `overridden by ${w.scope} server "${w.name}" (${w.path})`;
    } else {
      if (c.scope !== 'plugin') winnerName.set(c.name, c);
      if (c.url) winnerUrl.set(c.url, c);
    }
  }
  for (const c of mcpCands) {
    push({ kind: 'mcp', name: c.name, scope: c.scope, status: c.status, path: c.path, plugin: c.plugin, reason: c.reason, details: c.details });
  }
  // claude.ai connectors and claude-in-chrome cannot be verified from files; ~/.claude.json only records that
  // they have connected before. Names follow the live naming (non-alphanumerics become '_').
  for (const n of asArray(claudeJson.claudeAiMcpEverConnected)) {
    push({ kind: 'mcp', name: String(n).replace(/[^a-zA-Z0-9_-]/g, '_'), scope: 'remote', status: 'unknown', path: claudeJsonPath, reason: 'claude.ai connector listed in claudeAiMcpEverConnected; whether it loads this session depends on the account', details: { transport: 'claude.ai', connector: n } });
  }
  if (claudeJson.hasCompletedClaudeInChromeOnboarding || claudeJson.claudeInChromeDefaultEnabled) {
    push({ kind: 'mcp', name: 'claude-in-chrome', scope: 'builtin', status: 'active', path: claudeJsonPath, reason: 'built-in Claude in Chrome integration (claudeInChromeDefaultEnabled / onboarding in ~/.claude.json); not defined by any server config', details: { transport: 'builtin' } });
  }
  // settings.json mcpServers is ignored by Claude Code: verified against 51 session logs, where a
  // server defined only there (sentry) never appeared in any MCP load record.
  const loadedNames = new Set(items.filter((i) => i.kind === 'mcp' && i.status === 'active').map((i) => i.name));
  for (const s of sources) {
    for (const [n, c] of Object.entries(s.data.mcpServers || {})) {
      const details = { transport: c?.type || (c?.url ? 'http' : 'stdio') };
      if (c?.command) details.command = c.command;
      if (c?.url) details.url = scrubUrl(c.url);
      const reason = loadedNames.has(n)
        ? `ignored here: Claude Code does not read mcpServers from settings files. "${n}" still loads from its definition in ~/.claude.json or .mcp.json`
        : 'ignored: Claude Code does not read mcpServers from settings files. Move it to ~/.claude.json (claude mcp add) or .mcp.json for it to load';
      push({ kind: 'mcp', name: n, scope: s.scope, status: 'disabled', path: s.path, reason, details: redact(details) });
    }
  }
  warnings.push('claude.ai connectors cannot be detected from local files; list them from a live session (/mcp)');

  // ---- skills / commands / agents ----
  const skillRank = { managed: 0, user: 1, project: 2 };
  const agentRank = { managed: 0, project: 1, user: 2 };
  const defs = { skill: [], command: [], agent: [] };

  const truthy = (v) => v === true || (typeof v === 'string' && /^(true|yes|on|1)$/i.test(v.trim())) || v === 1;
  const fmDetails = (fm, alias) => {
    const d = {};
    if (alias) d.alias = alias;
    d.modelInvocable = !truthy(fm?.data?.['disable-model-invocation']);
    if (fm?.data?.description) d.description = String(fm.data.description).slice(0, 300);
    for (const k of ['disable-model-invocation', 'user-invocable', 'context', 'model', 'paths']) if (fm?.data?.[k] != null) d[k] = fm.data[k];
    return d;
  };
  function skillFromDir(dir, scope, prefix, plugin, rootFallback = false) {
    const f = path.join(dir, 'SKILL.md');
    if (!isFile(f)) return;
    const fm = readFrontmatter(f);
    // The model-facing listing uses the directory name ("dir (frontmatter-name)"); the frontmatter name is an alias.
    // A plugin whose SKILL.md sits at its root has no meaningful dir name, so it falls back to frontmatter.
    const n = String(rootFallback ? (fm?.data?.name || path.basename(dir)) : path.basename(dir));
    const alias = fm?.data?.name && String(fm.data.name) !== n ? String(fm.data.name) : null;
    defs.skill.push({ name: prefix ? `${prefix}:${n}` : n, scope, path: f, plugin, fm, alias });
  }
  let rootDir = null;
  function skillsIn(dir, scope, prefix, plugin) {
    if (isFile(path.join(dir, 'SKILL.md'))) { skillFromDir(dir, scope, prefix, plugin, scope === 'plugin' && dir === rootDir); return; }
    for (const s of subdirs(dir)) skillFromDir(path.join(dir, s), scope, prefix, plugin);
  }
  function mdFiles(dir) {
    const out = [];
    const rec = (d, rel) => {
      for (const e of listDir(d).sort((a, b) => a.name.localeCompare(b.name))) {
        const p = path.join(d, e.name);
        if (isDir(p)) rec(p, [...rel, e.name]);
        else if (e.name.endsWith('.md') && isFile(p)) out.push([p, [...rel, e.name.slice(0, -3)]]);
      }
    };
    rec(dir, []);
    return out;
  }
  function cmdsIn(dir, scope, prefix, plugin) {
    for (const [p, parts] of mdFiles(dir)) {
      const n = parts.join(':');
      defs.command.push({ name: prefix ? `${prefix}:${n}` : n, scope, path: p, plugin, fm: readFrontmatter(p) });
    }
  }
  function agentsIn(dir, scope, prefix, plugin) {
    for (const [p, parts] of mdFiles(dir)) {
      const fm = readFrontmatter(p);
      const n = String(fm?.data?.name || parts.join(':'));
      defs.agent.push({ name: prefix ? `${prefix}:${n}` : n, scope, path: p, plugin, fm });
    }
  }

  const seenDirs = new Set();
  const scanClaudeDir = (cdir, scope) => {
    const rp = canonical(cdir);
    if (seenDirs.has(rp + scope)) return;
    seenDirs.add(rp + scope);
    skillsIn(path.join(cdir, 'skills'), scope);
    cmdsIn(path.join(cdir, 'commands'), scope);
    agentsIn(path.join(cdir, 'agents'), scope);
  };
  scanClaudeDir(managedDir.endsWith('.claude') ? managedDir : path.join(managedDir, '.claude'), 'managed');
  scanClaudeDir(userDir, 'user');
  // skills synced from the claude.ai account: ~/.claude/skills/synced/<bucket>/<skill>/SKILL.md, listed as anthropic-skills:<skill>
  const syncedRoot = path.join(userDir, 'skills', 'synced');
  for (const bucket of subdirs(syncedRoot)) skillsIn(path.join(syncedRoot, bucket), 'user', 'anthropic-skills');
  const userReal = canonical(userDir);
  for (const d of ancestors(cwd, projectRoot)) {
    if (canonical(path.join(d, '.claude')) === userReal) continue;
    scanClaudeDir(path.join(d, '.claude'), 'project');
  }

  for (const d of addDirs) scanClaudeDir(path.join(d, '.claude'), 'project');

  for (const pl of activePlugins) {
    const m = pl.manifest; const pre = pl.name;
    const resolve = (p) => path.resolve(pl.root, p);
    rootDir = pl.root;
    // A marketplace entry that lists specific skills dirs (source "./", strict:false) loads only those
    // (so two plugins sharing one repo dir each get their own skill).
    const entrySkills = asArray(pl.entry?.skills);
    if (entrySkills.length) for (const sk of entrySkills) skillsIn(resolve(sk), 'plugin', pre, pl.id);
    else if (isDir(path.join(pl.root, 'skills'))) skillsIn(path.join(pl.root, 'skills'), 'plugin', pre, pl.id);
    else if (isFile(path.join(pl.root, 'SKILL.md')) && !m.skills) skillFromDir(pl.root, 'plugin', pre, pl.id, true);
    for (const s of asArray(m.skills)) skillsIn(resolve(s), 'plugin', pre, pl.id);
    // commands: manifest replaces default dir
    if (m.commands == null) cmdsIn(path.join(pl.root, 'commands'), 'plugin', pre, pl.id);
    else if (typeof m.commands === 'object' && !Array.isArray(m.commands)) {
      for (const [n, v] of Object.entries(m.commands)) {
        const p = v?.source ? resolve(v.source) : pl.manifestPath;
        defs.command.push({ name: `${pre}:${n}`, scope: 'plugin', path: p, plugin: pl.id, fm: { data: { description: v?.description } } });
      }
    } else {
      for (const c of asArray(m.commands)) {
        const p = resolve(c);
        if (isDir(p)) cmdsIn(p, 'plugin', pre, pl.id);
        else if (isFile(p)) defs.command.push({ name: `${pre}:${path.basename(p, '.md')}`, scope: 'plugin', path: p, plugin: pl.id, fm: readFrontmatter(p) });
      }
    }
    // agents: manifest replaces default dir (files only)
    if (m.agents == null) agentsIn(path.join(pl.root, 'agents'), 'plugin', pre, pl.id);
    else {
      for (const a of asArray(m.agents)) {
        const p = resolve(a);
        if (!isFile(p)) continue;
        const fm = readFrontmatter(p);
        defs.agent.push({ name: `${pre}:${String(fm?.data?.name || path.basename(p, '.md'))}`, scope: 'plugin', path: p, plugin: pl.id, fm });
      }
    }
  }

  // collision shadowing among non-plugin definitions (plugin names are namespaced)
  const shadow = (list, rankMap, extraWinners = null) => {
    const best = new Map();
    for (const d of list) if (d.scope !== 'plugin') best.set(d.name, Math.min(best.get(d.name) ?? 99, rankMap[d.scope]));
    for (const d of list) {
      if (d.scope === 'plugin') { d.status = 'active'; continue; }
      const skillWin = extraWinners?.get(d.name);
      if (skillWin) { d.status = 'shadowed'; d.reason = `skill "${d.name}" of the same name wins (${skillWin})`; }
      else if (rankMap[d.scope] > best.get(d.name)) {
        d.status = 'shadowed';
        d.reason = `same-name ${Object.keys(rankMap).find((k) => rankMap[k] === best.get(d.name))}-scope item takes precedence`;
      } else d.status = 'active';
    }
  };
  shadow(defs.skill, skillRank);
  const skillPaths = new Map(defs.skill.filter((s) => s.status === 'active' && s.scope !== 'plugin').map((s) => [s.name, s.path]));
  shadow(defs.command, skillRank, skillPaths);
  shadow(defs.agent, agentRank);

  for (const kind of ['skill', 'command', 'agent']) {
    for (const d of defs[kind]) {
      let status = d.status; let reason = d.reason;
      if (status === 'active' && d.fm == null) { status = 'unknown'; reason = 'file exists but cannot be read now (iCloud-evicted or locked)'; }
      if (status === 'active' && kind === 'skill' && asArray(d.fm?.data?.paths).length) { status = 'conditional'; reason = 'skill has paths frontmatter: auto-loads for matching files'; }
      push({ kind, name: d.name, scope: d.scope, status, path: d.path, plugin: d.plugin, reason, details: fmDetails(d.fm, d.alias) });
      // frontmatter hooks register only when the skill/agent is used
      const fh = d.fm?.data?.hooks;
      if (fh && typeof fh === 'object' && d.path.endsWith('.md')) {
        addHooks(fh, { scope: d.scope, path: d.path, plugin: d.plugin, status: 'conditional', reason: `${kind} frontmatter hook: registers when the ${kind} is used` });
      }
    }
  }

  // ensure unique ids (several hook handlers can share event+matcher+file)
  const seenIds = new Map();
  for (const it of items) {
    const n = (seenIds.get(it.id) || 0) + 1;
    seenIds.set(it.id, n);
    if (n > 1) it.id += `#${n}`;
  }

  return { harness: H, projectRoot, chain, items, warnings };
}
