// Live-oracle scorecard: for every recent real session on this machine, compare what
// context-audit predicts for that session's cwd against what the harness actually
// loaded (its own transcript / rollout / debug output). Emits verify/out/scorecard.{json,md}.
//
//   node verify/run.js [--hours 24] [--max 15] [--harness claude,codex,opencode]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { audit } from '../src/index.js';
import { compareLive } from '../src/render/diff.js';
import { processCwd, processArgs, parseLaunchFlags } from '../src/session.js';

const { values: args } = parseArgs({ options: {
  hours: { type: 'string', default: '24' }, max: { type: 'string', default: '15' },
  harness: { type: 'string', default: 'claude,codex,opencode' }, out: { type: 'string', default: 'verify/out' },
} });
const HOME = os.homedir();
const since = Date.now() - Number(args.hours) * 3600e3;
const MAX = Number(args.max);
const want = new Set(args.harness.split(','));

const firstJson = (f, pred, limit = 400) => {
  const fd = fs.openSync(f, 'r'); const buf = Buffer.alloc(1 << 20); const n = fs.readSync(fd, buf, 0, buf.length, 0); fs.closeSync(fd);
  for (const l of buf.subarray(0, n).toString('utf8').split('\n').slice(0, limit)) { try { const j = JSON.parse(l); if (pred(j)) return j; } catch {} }
  return null;
};

// Launch flags for sessions whose process is still alive (keyed by session id).
function liveLaunches() {
  const map = new Map();
  let out = '';
  try { out = execFileSync('ps', ['-axo', 'pid=,comm='], { encoding: 'utf8' }); } catch { return map; }
  for (const line of out.split('\n')) {
    const m = line.trim().match(/^(\d+)\s+(.*)$/);
    if (!m || !/(^|\/)(claude|codex)$/.test(m[2])) continue;
    const argv = processArgs(Number(m[1])); if (!argv) continue;
    const sid = argv[argv.indexOf('--session-id') + 1];
    const cwd = processCwd(Number(m[1]));
    if (sid && argv.includes('--session-id')) map.set(sid, parseLaunchFlags(argv, cwd || '/'));
  }
  return map;
}

function claudeSessions() {
  const base = path.join(HOME, '.claude/projects');
  const rows = [];
  for (const d of fs.readdirSync(base)) {
    for (const f of fs.readdirSync(path.join(base, d)).filter((x) => x.endsWith('.jsonl'))) {
      const p = path.join(base, d, f); const st = fs.statSync(p);
      if (st.mtimeMs < since || st.size < 2000) continue;
      const j = firstJson(p, (x) => x.cwd && !x.isSidechain);
      if (j) rows.push({ cwd: j.cwd, sessionId: f.replace(/\.jsonl$/, ''), mtime: st.mtimeMs, file: p });
    }
  }
  return pickPerCwd(rows);
}

function codexSessions() {
  const base = path.join(process.env.CODEX_HOME || path.join(HOME, '.codex'), 'sessions');
  const rows = [];
  const walk = (d, depth) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory() && depth < 3) walk(p, depth + 1);
    else if (e.name.endsWith('.jsonl')) { const st = fs.statSync(p); if (st.mtimeMs >= since) {
      const j = firstJson(p, (x) => x.type === 'session_meta', 3);
      if (j) rows.push({ cwd: j.payload.cwd, sessionId: j.payload.id, mtime: st.mtimeMs, file: p });
    } }
  } };
  try { walk(base, 0); } catch {}
  return pickPerCwd(rows);
}

// One most-recent session per cwd, so a single busy agent doesn't dominate the score.
function pickPerCwd(rows) {
  const by = new Map();
  for (const r of rows.sort((a, b) => b.mtime - a.mtime)) if (!by.has(r.cwd) && fs.existsSync(r.cwd)) by.set(r.cwd, r);
  return [...by.values()].slice(0, MAX);
}

// Every hook the session saw fire must be one we predicted (by event + command).
function hookCheck(h) {
  const fired = h.live?.observed?.hooks || [];
  if (!fired.length) return null;
  const preds = h.items.filter((i) => i.kind === 'hook' && i.status !== 'disabled');
  const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim();
  const missing = fired.filter((f) => !preds.some((p) => p.details?.event === f.event && (!f.command || norm(p.details?.command) === norm(f.command) || norm(f.command).includes(norm(p.details?.command)))));
  return { observed: fired.length, matched: fired.length - missing.length, missing: missing.map((f) => `${f.event}:${f.matcher ?? ''} ${String(f.command || '').slice(0, 80)}`), recall: (fired.length - missing.length) / fired.length };
}

function opencodeCheck(cwd) {
  const tmp = path.join(os.tmpdir(), `ca-oc-${process.pid}.txt`);
  // `opencode debug skill` truncates when piped, so write to a file.
  const r = spawnSync('sh', ['-c', `opencode debug skill > "${tmp}" 2>/dev/null`], { cwd, timeout: 60000 });
  if (r.status !== 0) return { error: 'opencode debug skill failed' };
  let skills = [];
  const txt = fs.readFileSync(tmp, 'utf8');
  try { skills = JSON.parse(txt).map((s) => s.name); } catch { skills = [...txt.matchAll(/"name"\s*:\s*"([^"]+)"/g)].map((m) => m[1]); }
  const cfg = spawnSync('sh', ['-c', `opencode debug config > "${tmp}" 2>/dev/null`], { cwd, timeout: 60000 });
  let mcp = [];
  try { mcp = Object.keys(JSON.parse(fs.readFileSync(tmp, 'utf8')).mcp || {}); } catch {}
  fs.rmSync(tmp, { force: true });
  return { observed: { skills: [...new Set(skills)], mcpServers: mcp } };
}

const NOT_OBSERVABLE = { opencode: ['bootstrap'] };

// Codex rollouts don't list MCP servers, but `codex mcp list --json` is Codex's own resolver.
function codexMcp(cwd) {
  const r = spawnSync('codex', ['mcp', 'list', '--json'], { cwd, encoding: 'utf8', timeout: 60000 });
  try { const d = JSON.parse(r.stdout); return (Array.isArray(d) ? d : d.servers || []).filter((x) => x.enabled !== false).map((x) => x.name); } catch { return null; }
}
const results = [];
const launches = liveLaunches();
const samples = {};
if (want.has('claude')) samples.claude = claudeSessions();
if (want.has('codex')) samples.codex = codexSessions();
if (want.has('opencode')) samples.opencode = [...new Set([...(samples.claude || []), ...(samples.codex || [])].map((s) => s.cwd))].slice(0, MAX).map((cwd) => ({ cwd }));

for (const [harness, list] of Object.entries(samples)) {
  for (const s of list) {
    const launch = s.sessionId ? launches.get(s.sessionId) : undefined;
    const rep = audit({ cwd: s.cwd, harnesses: [harness], live: harness !== 'opencode', sessionId: s.sessionId, launch, session: { harness: null, detectedBy: [] } });
    const h = rep.harnesses[harness];
    if (harness === 'opencode') h.live = opencodeCheck(s.cwd);
    if (harness === 'codex' && h.live?.observed) { const m = codexMcp(s.cwd); if (m) h.live.observed.mcpServers = m; }
    const cmp = compareLive(h);
    // Categories a harness's own logs cannot reveal are scored by the canary/blind audits instead.
    if (cmp) for (const cat of NOT_OBSERVABLE[harness] || []) cmp[cat] = null;
    results.push({ harness, cwd: s.cwd, sessionId: s.sessionId || null, launchFlags: !!launch, liveError: h.live?.error || null,
      categories: cmp ? { bootstrap: cmp.bootstrap, skills: cmp.skills, mcp: cmp.mcp, hooks: harness === 'claude' ? hookCheck(h) : null } : null });
  }
}

// Aggregate: micro-averaged over all sessions per harness+category.
const agg = {};
for (const r of results) for (const [cat, c] of Object.entries(r.categories || {})) {
  if (!c) continue;
  const k = `${r.harness}/${cat}`; const a = (agg[k] ||= { sessions: 0, predicted: 0, observed: 0, matched: 0 });
  a.sessions++; a.observed += c.observed; a.matched += c.matched; a.predicted += c.predicted ?? 0;
  a.unexplained = (a.unexplained || 0) + (c.unexplainedMissing ? c.unexplainedMissing.length : (c.missing || []).length);
  a.fileBackedObserved = (a.fileBackedObserved || 0) + (c.observed - (c.builtinMissing?.length || 0));
  a.uncertain = (a.uncertain || 0) + (c.unverifiableMissing?.length || 0);
  a.explainedExtra = (a.explainedExtra || 0) + (c.extraExplained?.length || 0);
}
for (const a of Object.values(agg)) {
  a.recallFileBacked = a.fileBackedObserved ? a.matched / a.fileBackedObserved : null;
  // excluding items whose loading depends on runtime state no file records (e.g. Codex's launch-time context window)
  a.recallDeterminable = a.fileBackedObserved - (a.uncertain || 0) ? a.matched / (a.fileBackedObserved - (a.uncertain || 0)) : null;
  a.precisionAdjusted = a.predicted - (a.explainedExtra || 0) ? a.matched / (a.predicted - (a.explainedExtra || 0)) : null; a.precision = a.predicted ? a.matched / a.predicted : null; a.recall = a.observed ? a.matched / a.observed : null; }

fs.mkdirSync(args.out, { recursive: true });
const card = { generatedAt: new Date().toISOString(), windowHours: Number(args.hours), aggregate: agg, sessions: results };
fs.writeFileSync(path.join(args.out, 'scorecard.json'), JSON.stringify(card, null, 2));

const pct = (x) => (x == null ? '-' : `${(x * 100).toFixed(1)}%`);
let md = `# context-audit live-oracle scorecard\n\nGenerated ${card.generatedAt}; sessions active in the last ${args.hours}h, one per cwd.\n\n| harness/category | sessions | predicted | observed | matched | precision | recall (raw) | recall (file-backed) | unexplained misses |\n|---|---|---|---|---|---|---|---|---|\n`;
for (const [k, a] of Object.entries(agg).sort()) md += `| ${k} | ${a.sessions} | ${a.predicted || '-'} | ${a.observed} | ${a.matched} | ${pct(a.precision)} | ${pct(a.recall)} | ${pct(a.recallFileBacked)} | ${a.unexplained} |\n`;
md += '\n## Per-session misses\n';
for (const r of results) {
  if (r.liveError) { md += `\n- **${r.harness}** \`${r.cwd}\`: live error: ${r.liveError}\n`; continue; }
  const lines = Object.entries(r.categories || {}).filter(([, c]) => c && (c.missing?.length || c.extra?.length))
    .map(([cat, c]) => `  - ${cat}: missing [${(c.missing || []).join(', ')}]${c.extra ? ` extra [${c.extra.join(', ')}]` : ''}`);
  if (lines.length) md += `\n- **${r.harness}** \`${r.cwd}\`${r.launchFlags ? ' (launch flags applied)' : ''}\n${lines.join('\n')}\n`;
}
fs.writeFileSync(path.join(args.out, 'scorecard.md'), md);
console.log(md.split('## Per-session')[0]);
