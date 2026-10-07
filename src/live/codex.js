import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
import path from 'node:path';

const realOr = (p) => { try { return fs.realpathSync(p); } catch { return p; } };

// Rollouts are YYYY/MM/DD/rollout-<timestamp>-<id>.jsonl, so a descending path sort is newest-first.
function listRollouts(sessionsDir) {
  const out = [];
  const sub = (d) => { try { return fs.readdirSync(d, { withFileTypes: true }); } catch { return []; } };
  const desc = (a, b) => b.name.localeCompare(a.name);
  for (const y of sub(sessionsDir).filter((e) => e.isDirectory()).sort(desc))
    for (const m of sub(path.join(sessionsDir, y.name)).filter((e) => e.isDirectory()).sort(desc))
      for (const d of sub(path.join(sessionsDir, y.name, m.name)).filter((e) => e.isDirectory()).sort(desc))
        for (const f of sub(path.join(sessionsDir, y.name, m.name, d.name)).filter((e) => e.isFile() && /^rollout-.*\.jsonl$/.test(e.name)).sort(desc))
          out.push(path.join(sessionsDir, y.name, m.name, d.name, f.name));
  return out;
}

// The first line (session_meta) embeds the full base instructions and can be tens of KB,
// so read it incrementally instead of loading the whole rollout.
function readMeta(file) {
  let fd;
  try {
    fd = fs.openSync(file, 'r');
    const buf = Buffer.alloc(65536);
    let acc = '';
    for (;;) {
      const n = fs.readSync(fd, buf, 0, buf.length, null);
      if (!n) break;
      acc += buf.toString('utf8', 0, n);
      const nl = acc.indexOf('\n');
      if (nl >= 0) { acc = acc.slice(0, nl); break; }
      if (acc.length > 4e6) return null;
    }
    const r = JSON.parse(acc);
    return r.type === 'session_meta' ? r.payload : null;
  } catch { return null; } finally { if (fd !== undefined) fs.closeSync(fd); }
}

function findRollout(sessionsDir, cwd, sessionId) {
  const files = listRollouts(sessionsDir);
  if (sessionId) {
    const byName = files.find((f) => f.endsWith(`-${sessionId}.jsonl`));
    if (byName) return byName;
    return files.find((f) => readMeta(f)?.id === sessionId) || null;
  }
  const want = path.resolve(cwd);
  for (const f of files) {
    const cw = readMeta(f)?.cwd;
    if (cw && path.resolve(cw) === want) return f;
  }
  return null;
}

const textOf = (payload) => (payload.content || []).map((c) => c?.text || '').join('\n');

// "- name: description (file: r0/foo/SKILL.md)" where rN is a root from the roots table.
// The description may be absent or truncated, and names can contain ':' (e.g. "plugin:skill").
function parseSkills(text) {
  const roots = {};
  const skills = [];
  for (const line of text.split('\n')) {
    const rm = /^- `(r\d+)` = `(.+)`$/.exec(line);
    if (rm) { roots[rm[1]] = rm[2]; continue; }
    if (!line.startsWith('- ')) continue;
    const fm = /\(file: (\S+)\)\s*$/.exec(line);
    if (!fm) continue;
    const head = line.slice(2, fm.index);
    const colon = head.indexOf(': ');
    const name = (colon < 0 ? head.replace(/:\s*$/, '') : head.slice(0, colon)).trim();
    const rel = fm[1];
    const root = /^(r\d+)\//.exec(rel);
    const p = root && roots[root[1]] ? path.join(roots[root[1]], rel.slice(root[1].length + 1)) : rel;
    skills.push({ name, path: p, realPath: realOr(p) });
  }
  return skills;
}

function resolveAgentsFiles(bootstrap, texts, codexHome) {
  if (!texts.length) return;
  const blob = texts.join('\n');
  const norm = (x) => x.replace(/\s+/g, ' ').trim();
  const nb = norm(blob);
  const dirs = new Set([codexHome]);
  for (const d of [...bootstrap.keys()]) { for (let c = d; ; c = path.dirname(c)) { dirs.add(c); if (path.dirname(c) === c) break; } }
  const found = new Map();
  for (const d of dirs) {
    for (const n of ['AGENTS.override.md', 'AGENTS.md']) {
      const f = path.join(d, n);
      let c; try { c = fs.readFileSync(f, 'utf8'); } catch { continue; }
      if (!c.trim()) continue;
      if (nb.includes(norm(c))) found.set(f, { path: f, dir: d, inferred: true, contentMatched: true });
    }
  }
  if (!found.size) return;
  // Header-derived guesses are superseded by what the injected text actually contains.
  bootstrap.clear();
  for (const v of found.values()) bootstrap.set(v.path, v);
}

function omittedMcp(codexHome, threadId) {
  if (!threadId) return [];
  const dbPath = path.join(codexHome, 'logs_2.sqlite');
  if (!fs.existsSync(dbPath)) return [];
  let db;
  try {
    const { DatabaseSync } = require('node:sqlite');
    db = new DatabaseSync(dbPath, { readOnly: true });
    const rows = db.prepare("SELECT feedback_log_body AS b FROM logs WHERE thread_id = ? AND feedback_log_body LIKE '%omitting MCP server%'").all(threadId);
    return [...new Set(rows.map((r) => /server_name=(\S+)/.exec(r.b)?.[1]).filter(Boolean))].sort();
  } catch { return []; } finally { try { db?.close(); } catch { /* ignore */ } }
}

export function liveCodex({ cwd, home, env = {}, sessionId } = {}) {
  const codexHome = env.CODEX_HOME || path.join(home, '.codex');
  const sessionsDir = path.join(codexHome, 'sessions');
  const rollout = findRollout(sessionsDir, cwd, sessionId);
  if (!rollout) {
    return { error: `no Codex rollout found for ${sessionId ? `session ${sessionId}` : `cwd ${cwd}`} under ${sessionsDir}` };
  }

  const meta = readMeta(rollout);
  const bootstrap = new Map();
  const skills = new Map();
  const mcp = new Set();
  const disabledPlugins = new Set();
  // The injected text is the chain's AGENTS files concatenated under one header naming only the cwd, so the
  // contributing files are recovered by checking which candidate files' contents appear in that text.
  const agentsTexts = [];
  const addText = (t) => { if (typeof t === 'string' && t) agentsTexts.push(t); };
  const addDir = (dir) => {
    if (dir) bootstrap.set(dir, { path: path.join(dir, 'AGENTS.md'), dir, inferred: true });
  };

  for (const line of fs.readFileSync(rollout, 'utf8').split('\n')) {
    if (!line) continue;
    const isMsg = line.includes('"type":"message"');
    const isWorld = line.includes('"type":"world_state"') || line.includes('"type":"turn_context"');
    const isCall = line.includes('mcp__') || line.includes('mcp_tool_call');
    if (!isMsg && !isWorld && !isCall) continue;
    let r;
    try { r = JSON.parse(line); } catch { continue; }
    const p = r.payload || {};

    if (r.type === 'response_item' && p.type === 'message' && (p.role === 'user' || p.role === 'developer')) {
      const t = textOf(p);
      // Only the leading header counts; the same string also shows up inside tool output and quoted history.
      if (t.startsWith('# AGENTS.md instructions for ')) {
        for (const m of t.matchAll(/^# AGENTS\.md instructions for (.+)$/gm)) addDir(m[1].trim());
        addText(t);
      }
      if (p.role === 'developer' && t.startsWith('<skills_instructions>')) {
        // A resumed rollout holds one block per (re)start; only the latest reflects what the model last saw.
        skills.clear();
        for (const s of parseSkills(t)) skills.set(`${s.name}\0${s.path}`, s);
      }
    } else if (r.type === 'world_state') {
      addDir(p.state?.agents_md?.directory);
      addText(p.state?.agents_md?.text);
    } else if (r.type === 'turn_context') {
      for (const id of p.disabled_plugin_ids || []) disabledPlugins.add(id);
    } else if (r.type === 'response_item' && /function_call|tool_call/.test(p.type || '') && typeof p.name === 'string') {
      const m = /^mcp__(.+?)__/.exec(p.name);
      if (m) mcp.add(m[1]);
    } else if (r.type === 'event_msg' && /^mcp_tool_call/.test(p.type || '')) {
      const s = p.invocation?.server;
      if (s) mcp.add(s);
    }
  }

  resolveAgentsFiles(bootstrap, agentsTexts, codexHome);

  return {
    source: rollout,
    sessionId: meta?.id || path.basename(rollout, '.jsonl').replace(/^rollout-.*?T[\d-]+-/, ''),
    cwd: meta?.cwd || null,
    observed: {
      bootstrap: [...bootstrap.values()].sort((a, b) => a.path.localeCompare(b.path)),
      skills: [...skills.values()].sort((a, b) => a.name.localeCompare(b.name) || a.path.localeCompare(b.path)),
      mcpServers: [...mcp].sort(),
      // Servers Codex logged as configured-but-not-ready ("omitting MCP server without an exact ready client").
      // Positive evidence of a ready server is not logged, so this is not part of mcpServers.
      mcpOmitted: omittedMcp(codexHome, meta?.id),
      disabledPlugins: [...disabledPlugins].sort(),
      hooks: [],
    },
  };
}
