import fs from 'node:fs';
import path from 'node:path';

// Claude Code names the per-project transcript dir after the absolute cwd with every
// non-alphanumeric char replaced by '-' (so "/a/.b" becomes "-a--b").
export const claudeSlug = (cwd) => cwd.replace(/[^a-zA-Z0-9]/g, '-');

const uniqSorted = (arr) => [...new Set(arr)].sort();

// Hook commands are user config and may embed inline credentials; mask obvious ones.
function redactCommand(cmd) {
  return String(cmd)
    .replace(/\b([A-Za-z0-9_]*(?:token|secret|key|password|passwd|auth)[A-Za-z0-9_]*)=("[^"]*"|'[^']*'|\S+)/gi, '$1=<redacted>')
    .replace(/(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/g, '$1 <redacted>');
}

// MCP tool names embed the server name with every char outside [A-Za-z0-9_-] turned into '_'.
const normMcp = (name) => String(name).replace(/[^a-zA-Z0-9_-]/g, '_');

function findTranscript({ cwd, home, sessionId }) {
  const projects = path.join(home, '.claude', 'projects');
  const dirs = [cwd];
  try { dirs.push(fs.realpathSync(cwd)); } catch { /* cwd may no longer exist */ }
  for (const d of [...new Set(dirs)]) {
    const dir = path.join(projects, claudeSlug(d));
    if (!fs.existsSync(dir)) continue;
    if (sessionId) {
      const p = path.join(dir, `${sessionId}.jsonl`);
      if (fs.existsSync(p)) return p;
      continue;
    }
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.jsonl'))
      .map((f) => ({ p: path.join(dir, f), t: fs.statSync(path.join(dir, f)).mtimeMs }))
      .sort((a, b) => b.t - a.t);
    if (files.length) return files[0].p;
  }
  return null;
}

export function liveClaude({ cwd, home, env, sessionId } = {}) {
  const transcript = findTranscript({ cwd, home, sessionId });
  if (!transcript) {
    return { error: `no Claude transcript found for ${cwd}${sessionId ? ` session ${sessionId}` : ''} under ${path.join(home, '.claude', 'projects', claudeSlug(cwd))}` };
  }

  const bootstrap = new Map(); // path -> {path,type}
  const skills = new Set();
  const tools = new Set();
  const mcp = new Set();
  const mcpFailed = new Set();
  const hooks = new Map();
  const agents = new Set();

  const addHook = (a) => {
    const hn = String(a.hookName || '');
    const i = hn.indexOf(':');
    const event = a.hookEvent || (i < 0 ? hn : hn.slice(0, i));
    const matcher = i < 0 ? '' : hn.slice(i + 1);
    const command = a.command ? redactCommand(a.command) : null;
    hooks.set(`${event}\0${matcher}\0${command}`, { event, matcher, command });
  };

  for (const line of fs.readFileSync(transcript, 'utf8').split('\n')) {
    if (!line.includes('"attachment"')) continue;
    let r;
    try { r = JSON.parse(line); } catch { continue; }
    const a = r.attachment;
    if (!a || typeof a !== 'object') continue;
    switch (a.type) {
      case 'instructions':
        for (const f of a.files || []) if (f?.path) bootstrap.set(f.path, { path: f.path, type: f.type || null });
        break;
      case 'nested_memory': {
        const p = a.path || a.content?.path;
        // Loaded mid-session (path-scoped / subdirectory), so flag it as conditional rather than boot-time.
        if (p && !bootstrap.has(p)) bootstrap.set(p, { path: p, type: a.content?.type || null, nested: true });
        break;
      }
      case 'skill_listing': {
        // `names` is already clean; content lines look like "- name: desc" or "- dir (name): desc".
        const names = Array.isArray(a.names) ? a.names
          : String(a.content || '').split('\n').filter((l) => l.startsWith('- '))
            .map((l) => l.slice(2).split(': ')[0].replace(/\s+\(.*\)$/, ''));
        for (const n of names) skills.add(n);
        break;
      }
      case 'mcp_instructions_delta':
        for (const n of a.addedNames || []) mcp.add(normMcp(n));
        for (const n of a.removedNames || []) mcp.delete(normMcp(n));
        break;
      case 'deferred_tools_delta':
        for (const n of a.addedNames || []) tools.add(n);
        for (const n of a.removedNames || []) tools.delete(n);
        for (const f of a.failedMcpServers || []) if (f?.name) mcpFailed.add(f.name);
        break;
      case 'hook_success':
      case 'hook_cancelled':
      case 'hook_non_blocking_error':
        addHook(a);
        break;
      case 'agent_listing_delta':
        for (const n of a.addedTypes || []) agents.add(n);
        for (const n of a.removedTypes || []) agents.delete(n);
        break;
      default:
    }
  }

  for (const t of tools) {
    const m = /^mcp__(.+?)__/.exec(t);
    if (m) mcp.add(m[1]);
  }

  const sortedHooks = [...hooks.values()].sort((x, y) =>
    `${x.event}\0${x.matcher}\0${x.command}`.localeCompare(`${y.event}\0${y.matcher}\0${y.command}`));

  return {
    source: transcript,
    sessionId: path.basename(transcript, '.jsonl'),
    observed: {
      bootstrap: [...bootstrap.values()].sort((a, b) => a.path.localeCompare(b.path)),
      skills: uniqSorted(skills),
      mcpServers: uniqSorted(mcp),
      mcpFailed: uniqSorted(mcpFailed),
      hooks: sortedHooks,
      agents: uniqSorted(agents),
    },
  };
}
