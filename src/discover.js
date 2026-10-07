import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { processArgs, processCwd, parseLaunchFlags } from './session.js';

const HARNESS = [[/(^|\/)claude$/, 'claude'], [/(^|\/)codex$/, 'codex'], [/(^|\/)opencode$/, 'opencode']];

// Agent harness processes running right now, with the cwd they booted in and their launch flags.
export function listRunning() {
  let out = '';
  try { out = execFileSync('ps', ['-axo', 'pid=,comm='], { encoding: 'utf8' }); } catch { return []; }
  const rows = [];
  for (const line of out.split('\n')) {
    const m = line.trim().match(/^(\d+)\s+(.*)$/);
    const hit = m && HARNESS.find(([re]) => re.test(m[2]));
    if (!hit) continue;
    const pid = Number(m[1]);
    const cwd = processCwd(pid);
    if (!cwd) continue;
    const argv = processArgs(pid) || [];
    // Codex app-server / exec-server processes host many threads, each with its own cwd;
    // the process cwd says nothing about any session, so they are reported separately.
    const host = argv.join(' ').match(/(?:^| )(app-server|exec-server|mcp-server)(?: |$)/)?.[1];
    if (host) { rows.push({ pid, harness: hit[1], host, cwd: null }); continue; }
    const i = argv.indexOf('--session-id');
    rows.push({ pid, harness: hit[1], cwd, sessionId: i >= 0 ? argv[i + 1] : null, launch: parseLaunchFlags(argv, cwd) });
  }
  return rows.sort((a, b) => String(a.cwd).localeCompare(String(b.cwd)));
}

const firstLines = (f, n = 40) => {
  try {
    const fd = fs.openSync(f, 'r'); const buf = Buffer.alloc(1 << 18); const len = fs.readSync(fd, buf, 0, buf.length, 0); fs.closeSync(fd);
    return buf.subarray(0, len).toString('utf8').split('\n').slice(0, n);
  } catch { return []; }
};

// Most recent session per (harness, cwd) from the harnesses' own logs.
export function listRecent({ home = os.homedir(), hours = 72, limit = 40 } = {}) {
  const since = Date.now() - hours * 3600e3;
  const rows = [];
  const claudeBase = path.join(home, '.claude/projects');
  for (const d of safeDir(claudeBase)) {
    for (const f of safeDir(path.join(claudeBase, d)).filter((x) => x.endsWith('.jsonl'))) {
      const p = path.join(claudeBase, d, f); const st = safeStat(p);
      if (!st || st.mtimeMs < since || st.size < 2000) continue;
      for (const l of firstLines(p)) {
        try { const j = JSON.parse(l); if (j.cwd && !j.isSidechain) { rows.push({ harness: 'claude', cwd: j.cwd, sessionId: f.slice(0, -6), at: st.mtimeMs }); break; } } catch {}
      }
    }
  }
  const codexBase = path.join(process.env.CODEX_HOME || path.join(home, '.codex'), 'sessions');
  const walk = (d, depth) => {
    for (const e of safeDir(d, true)) {
      const p = path.join(d, e.name);
      if (e.isDirectory() && depth < 3) walk(p, depth + 1);
      else if (e.name.endsWith('.jsonl')) {
        const st = safeStat(p);
        if (!st || st.mtimeMs < since) continue;
        try { const j = JSON.parse(firstLines(p, 1)[0]); if (j.type === 'session_meta') rows.push({ harness: 'codex', cwd: j.payload.cwd, sessionId: j.payload.id, at: st.mtimeMs }); } catch {}
      }
    }
  };
  walk(codexBase, 0);
  const seen = new Set();
  return rows.sort((a, b) => b.at - a.at).filter((r) => {
    const k = `${r.harness}|${r.cwd}`;
    if (seen.has(k) || !fs.existsSync(r.cwd)) return false;
    seen.add(k); return true;
  }).slice(0, limit);
}

function safeDir(d, withTypes = false) { try { return fs.readdirSync(d, withTypes ? { withFileTypes: true } : undefined); } catch { return []; } }
function safeStat(p) { try { return fs.statSync(p); } catch { return null; } }

// Subdirectories of a folder, for the folder picker. Marks folders that carry agent config.
export function listFolder(dir) {
  const abs = path.resolve(dir);
  const MARKERS = ['CLAUDE.md', 'AGENTS.md', '.claude', '.codex', '.agents', '.opencode', 'opencode.json', '.mcp.json', '.git'];
  const entries = safeDir(abs, true)
    .filter((e) => (e.isDirectory() || e.isSymbolicLink()) && !e.name.startsWith('.') && safeStat(path.join(abs, e.name))?.isDirectory())
    .map((e) => e.name).sort((a, b) => a.localeCompare(b));
  const markers = MARKERS.filter((m) => fs.existsSync(path.join(abs, m)));
  return { dir: abs, parent: path.dirname(abs) === abs ? null : path.dirname(abs), markers, entries };
}
