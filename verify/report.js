// Build one human-readable verification report from the three oracles:
//   verify/out/scorecard.json (live sessions), blind.json (hand audit), canary.json (real boots)
//   node verify/report.js  ->  verify/out/verification.html
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, 'out');
const load = (f) => { try { return JSON.parse(fs.readFileSync(path.join(out, f), 'utf8')); } catch { return null; } };
const card = load('scorecard.json'), blind = load('blind.json'), canary = load('canary.json');
const adjs = (() => { try { return JSON.parse(fs.readFileSync(path.join(here, 'local', 'adjudications.json'), 'utf8')); } catch { return []; } })();
const ver = (cmd, args) => { try { return execFileSync(cmd, args, { encoding: 'utf8', timeout: 15000 }).trim().split('\n')[0]; } catch { return 'unknown'; } };
const versions = { claude: ver('claude', ['--version']), codex: ver('codex', ['--version']), opencode: ver('opencode', ['--version']) };

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pct = (x) => (x == null ? '–' : `${(x * 100).toFixed(1)}%`);
const tone = (x) => (x == null ? 'na' : x >= 0.98 ? 'good' : x >= 0.9 ? 'warn' : 'bad');
const cell = (x) => `<td class="num"><span class="pill ${tone(x)}">${pct(x)}</span></td>`;
const HARN = ['claude', 'codex', 'opencode'];
const NAME = { claude: 'Claude Code', codex: 'Codex', opencode: 'OpenCode' };

// ---- live oracle
const liveRows = Object.entries(card?.aggregate || {}).sort();
const liveTable = `<table><thead><tr><th>Harness / category</th><th class="num">Sessions</th><th class="num">Predicted</th><th class="num">Observed</th><th class="num">Matched</th><th class="num">Precision, raw</th><th class="num">Precision, explained extras removed</th><th class="num">Recall, raw</th><th class="num">Recall, file-backed</th><th class="num">Uncertain</th><th class="num">Recall, determinable</th><th class="num">Unexplained misses</th></tr></thead><tbody>${
  liveRows.map(([k, a]) => `<tr><td>${esc(k.replace(/^(\w+)\//, (_, h) => NAME[h] + ' / '))}</td><td class="num">${a.sessions}</td><td class="num">${a.predicted || '–'}</td><td class="num">${a.observed}</td><td class="num">${a.matched}</td><td class="num muted">${pct(a.precision)}</td>${cell(a.precisionAdjusted ?? a.precision)}<td class="num muted">${pct(a.recall)}</td>${cell(a.recallFileBacked)}<td class="num">${a.uncertain || 0}</td>${cell(a.recallDeterminable)}<td class="num"><span class="pill ${a.unexplained ? 'bad' : 'good'}">${a.unexplained}</span></td></tr>`).join('')
}</tbody></table>`;

const sessionDetails = (card?.sessions || []).map((s) => {
  const cats = Object.entries(s.categories || {}).filter(([, c]) => c);
  const lines = cats.map(([cat, c]) => {
    const parts = [];
    const list = (label, arr, cls) => arr?.length ? `<div class="miss ${cls}"><b>${label} (${arr.length})</b> ${arr.slice(0, 40).map((x) => `<code>${esc(typeof x === 'string' ? x : `${x.name}${x.reason ? ` · ${x.reason}` : ''}`)}</code>`).join(' ')}${arr.length > 40 ? ` <i>+${arr.length - 40} more</i>` : ''}</div>` : '';
    parts.push(list('Unexplained misses', c.unexplainedMissing ?? (c.builtinMissing ? [] : c.missing), 'bad'));
    parts.push(list('Built into the harness (no file)', c.builtinMissing, 'na'));
    parts.push(list('Unverifiable on disk', c.unverifiableMissing, 'warn'));
    parts.push(list('Predicted, explained', c.extraExplained, 'na'));
    parts.push(list('Predicted, not observed', c.extraUnexplained ?? (c.extraExplained ? [] : c.extra), 'warn'));
    const body = parts.join('');
    return body ? `<div class="cat"><h4>${esc(cat)} <span class="muted">${c.matched}/${c.observed} observed matched</span></h4>${body}</div>` : '';
  }).join('');
  const clean = !lines;
  const unexplained = cats.some(([, c]) => (c.unexplainedMissing ?? c.missing ?? []).length || (c.extraUnexplained ?? []).length);
  return `<details class="session"${clean ? '' : ''}><summary><span class="pill ${s.liveError ? 'warn' : clean ? 'good' : unexplained ? 'bad' : 'na'}">${s.liveError ? 'no log' : clean ? 'exact' : unexplained ? 'unexplained' : 'explained'}</span> <b>${NAME[s.harness]}</b> <code>${esc(s.cwd)}</code>${s.launchFlags ? ' <span class="tag">launch flags applied</span>' : ''}</summary>${s.liveError ? `<p class="muted">${esc(s.liveError)}</p>` : lines || '<p class="muted">Every observed item was predicted.</p>'}</details>`;
}).join('');

// ---- blind audit
const blindRows = Object.entries(blind?.aggregate || {}).filter(([, a]) => a.truth || a.predicted).sort();
const blindTable = `<table><thead><tr><th>Harness / category</th><th class="num">Cases</th><th class="num">Truth</th><th class="num">Predicted</th><th class="num">Precision, raw</th><th class="num">Recall, raw</th><th class="num">Precision, adjudicated</th><th class="num">Recall, adjudicated</th><th class="num">Adjudications</th></tr></thead><tbody>${
  blindRows.map(([k, a]) => `<tr><td>${esc(k.replace(/^(\w+)\//, (_, h) => NAME[h] + ' / '))}</td><td class="num">${a.cases}</td><td class="num">${a.truth}</td><td class="num">${a.predicted}</td>${cell(a.predicted ? a.matched / a.predicted : null)}${cell(a.truth ? a.matched / a.truth : null)}${cell(a.predicted ? a.adjMatched / a.predicted : null)}${cell(a.adjTruth ? a.adjMatched / a.adjTruth : null)}<td class="num">${a.adjudications}</td></tr>`).join('')
}</tbody></table>`;
const byVerdict = (v) => adjs.filter((a) => a.verdict === v);
const adjList = (arr) => `<ul class="adj">${arr.map((a) => `<li><span class="tag">${NAME[a.harness]} · ${esc(a.category)}</span> <code>${esc(a.key)}</code> <span class="muted">in ${esc(a.cwd)}</span><div class="ev">${esc(a.evidence)}</div></li>`).join('')}</ul>`;
// collapse the repetitive per-cwd adjudications into unique keys for readability
const uniq = (arr) => [...new Map(arr.map((a) => [`${a.harness}|${a.category}|${a.key}`, a])).values()];

// ---- canary
const canaryBlocks = HARN.filter((h) => canary?.harnesses?.[h]).map((h) => {
  const r = canary.harnesses[h];
  const checks = Object.entries(r).filter(([, v]) => v && typeof v === 'object' && 'pass' in v);
  const label = { bootstrapTokens: 'Bootstrap doc markers the model saw', canarySkills: 'Project skills in the session log', canaryMcp: 'Project MCP server connected' };
  return `<div class="canary"><h4>${NAME[h]}</h4>${r.run?.error ? `<p class="pill bad">${esc(r.run.error)}</p>` : ''}${checks.map(([k, v]) => `<div class="check"><span class="pill ${v.pass ? 'good' : 'bad'}">${v.pass ? 'pass' : 'fail'}</span> ${label[k] || k}<div class="sets"><span>predicted</span><div>${v.predicted.map((x) => `<code>${esc(x)}</code>`).join(' ') || '<i>none</i>'}</div><span>observed</span><div>${v.observed.map((x) => `<code>${esc(x)}</code>`).join(' ') || '<i>none</i>'}</div></div></div>`).join('')}</div>`;
}).join('');

// ---- verdict strip
const liveFor = (h) => liveRows.filter(([k]) => k.startsWith(h + '/'));
const verdict = HARN.map((h) => {
  const c = canary?.harnesses?.[h];
  const checks = c ? Object.values(c).filter((v) => v && typeof v === 'object' && 'pass' in v) : [];
  const cPass = checks.filter((v) => v.pass).length;
  const lv = liveFor(h);
  const unexpl = lv.reduce((n, [, a]) => n + (a.unexplained || 0), 0);
  const obs = lv.reduce((n, [, a]) => n + a.observed, 0);
  const bl = blindRows.filter(([k]) => k.startsWith(h + '/'));
  const bt = bl.reduce((n, [, a]) => n + a.adjTruth, 0), bm = bl.reduce((n, [, a]) => n + a.adjMatched, 0);
  return `<div class="verdict"><h3>${NAME[h]}</h3><div class="ver muted">${esc(versions[h])}</div>
    <dl><dt>Canary boot</dt><dd><span class="pill ${checks.length && cPass === checks.length ? 'good' : 'bad'}">${checks.length ? `${cPass}/${checks.length} checks` : 'not run'}</span></dd>
    <dt>Live sessions</dt><dd><span class="pill ${unexpl ? 'warn' : 'good'}">${unexpl} unexplained of ${obs} observed</span></dd>
    <dt>Blind audit</dt><dd><span class="pill ${tone(bt ? bm / bt : null)}">${bt ? `${bm}/${bt} agreed after adjudication` : 'n/a'}</span></dd></dl></div>`;
}).join('');

// Machine-specific findings live in verify/local/known-limits.html (gitignored); the generic list ships.
const knownLimits = (() => { try { return fs.readFileSync(path.join(here, 'local', 'known-limits.html'), 'utf8'); } catch { return `<ul class="limits">
      <li><b>Launch flags of ended sessions.</b> context-audit reads launch flags (for example <code>--settings</code>) only from running processes. Hooks from flags of sessions that have ended cannot be predicted.</li>
      <li><b>Headless MCP records.</b> <code>claude -p</code> transcripts record only MCP servers connected before the first turn, so slow HTTP servers and interactive-only servers can show as predicted but not observed.</li>
      <li><b>Account and binary items.</b> claude.ai connectors and harness built-in skills do not come from local files. They are labeled, never counted as errors.</li>
      <li><b>Codex skill-list budget.</b> Codex trims its skill listing to roughly 2% of the session context window. The value was fitted from session logs. Skills whose inclusion depends on a context window set at launch are reported as unknown.</li>
      <li><b>Not modeled yet.</b> Lazily loaded nested CLAUDE.md files, Codex requirements.toml or MDM policy, OpenCode remote .well-known config.</li>
    </ul>`; } })();
const html = `<title>Context Audit Verification</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
/* Layout: calibration-sheet; verdict strip first, then one section per oracle, evidence collapsed. */
:root { --bg:#f6f7f9; --panel:#ffffff; --fg:#17202b; --muted:#5d6a78; --line:#dde2e8; --accent:#1f5fbf;
  --good:#17784a; --good-bg:#e3f4ea; --warn:#8a5a00; --warn-bg:#fbf0d9; --bad:#b3261e; --bad-bg:#fbe5e3; --na-bg:#eceff3;
  --sans:"IBM Plex Sans", system-ui, -apple-system, sans-serif; --mono:"IBM Plex Mono", ui-monospace, Menlo, monospace; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg:#0f141a; --panel:#161d25; --fg:#e4e9ef; --muted:#93a1b0; --line:#28323d; --accent:#7fb0ff;
  --good:#6fd39b; --good-bg:#15301f; --warn:#f0c26a; --warn-bg:#33280f; --bad:#ff8c84; --bad-bg:#3a1714; --na-bg:#202832; color-scheme: dark; } }
:root[data-theme="dark"] { --bg:#0f141a; --panel:#161d25; --fg:#e4e9ef; --muted:#93a1b0; --line:#28323d; --accent:#7fb0ff;
  --good:#6fd39b; --good-bg:#15301f; --warn:#f0c26a; --warn-bg:#33280f; --bad:#ff8c84; --bad-bg:#3a1714; --na-bg:#202832; color-scheme: dark; }
body { background:var(--bg); color:var(--fg); font:15px/1.55 var(--sans); padding-inline:16px; padding-block:28px 64px; }
main { max-width:1180px; margin:0 auto; display:flex; flex-direction:column; gap:28px; }
h1 { font-size:28px; font-weight:600; margin:0; text-wrap:balance; } h2 { font-size:19px; font-weight:600; margin:0 0 6px; } h3 { margin:0; font-size:16px; } h4 { margin:0 0 6px; font-size:14px; }
p { margin:0; max-width:72ch; } .muted { color:var(--muted); } code { font:12.5px var(--mono); overflow-wrap:anywhere; }
.lede { display:flex; flex-direction:column; gap:8px; }
.eyebrow { font:500 12px var(--mono); letter-spacing:.08em; text-transform:uppercase; color:var(--accent); }
section { background:var(--panel); border:1px solid var(--line); border-radius:10px; padding:20px; display:flex; flex-direction:column; gap:14px; min-width:0; }
.verdicts { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:14px; }
.verdict { background:var(--panel); border:1px solid var(--line); border-radius:10px; padding:16px; display:flex; flex-direction:column; gap:8px; }
.verdict dl { display:grid; grid-template-columns:auto 1fr; gap:6px 12px; margin:4px 0 0; align-items:center; } .verdict dt { color:var(--muted); font-size:13px; } .verdict dd { margin:0; }
.ver { font:12px var(--mono); }
.scroll { overflow-x:auto; } table { border-collapse:collapse; width:100%; font-size:13.5px; font-variant-numeric:tabular-nums; }
th, td { text-align:left; padding:7px 10px; border-bottom:1px solid var(--line); white-space:nowrap; } th { font-weight:500; color:var(--muted); font-size:12.5px; } .num { text-align:right; }
.pill { display:inline-block; padding:1px 8px; border-radius:999px; font:500 12px var(--mono); background:var(--na-bg); color:var(--fg); }
.pill.good { background:var(--good-bg); color:var(--good); } .pill.warn { background:var(--warn-bg); color:var(--warn); } .pill.bad { background:var(--bad-bg); color:var(--bad); }
.tag { font:12px var(--mono); color:var(--muted); border:1px solid var(--line); border-radius:4px; padding:0 5px; }
details.session { border-top:1px solid var(--line); padding:8px 0; } details.session summary { cursor:pointer; display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
details summary:focus-visible { outline:2px solid var(--accent); outline-offset:2px; }
.cat { margin:10px 0 0 14px; } .miss { margin:4px 0; font-size:13px; } .miss b { font-weight:500; margin-right:6px; } .miss code { background:var(--na-bg); padding:0 4px; border-radius:3px; margin:2px 2px; display:inline-block; }
.miss.bad b { color:var(--bad); } .miss.warn b { color:var(--warn); }
.canaries { display:grid; grid-template-columns:repeat(auto-fit,minmax(300px,1fr)); gap:14px; }
.canary { display:flex; flex-direction:column; gap:10px; min-width:0; } .check { font-size:13.5px; }
.sets { display:grid; grid-template-columns:auto 1fr; gap:3px 10px; margin:6px 0 0 4px; font-size:12px; } .sets span { color:var(--muted); } .sets div { min-width:0; display:flex; flex-wrap:wrap; gap:2px 8px; }
ul.adj { list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:10px; } ul.adj .ev { color:var(--muted); font-size:13px; margin-top:2px; overflow-wrap:anywhere; }
ul.limits { margin:0; padding-left:20px; display:flex; flex-direction:column; gap:8px; max-width:90ch; } ol.method { margin:0; padding-left:20px; display:flex; flex-direction:column; gap:6px; max-width:80ch; }
</style>
<main>
  <header class="lede">
    <div class="eyebrow">context-audit · verification</div>
    <h1>Context Audit Verification</h1>
    <p class="muted">Does context-audit report exactly what Claude Code, Codex and OpenCode load? Three independent oracles check it on this machine. Generated ${esc(new Date().toISOString())}.</p>
  </header>
  <div class="verdicts">${verdict}</div>

  <section><h2>1 · Canary boots</h2>
    <p class="muted">A throwaway git repo is built with uniquely tagged CLAUDE.md, AGENTS.md, rules, an @import, three project skills and a working stdio MCP server. The real harness is then booted in a subdirectory. Each check compares what context-audit predicted with what the session loaded, using the model's own report of tags it saw and the harness's own session log.</p>
    <div class="canaries">${canaryBlocks || '<p class="muted">Not run.</p>'}</div>
  </section>

  <section><h2>2 · Live sessions on this machine</h2>
    <p class="muted">For the newest real session in each working directory over the last ${card?.windowHours ?? '?'} hours, context-audit predicts that directory's context. The prediction is scored against what the session recorded loading: Claude Code transcripts, Codex rollouts plus <code>codex mcp list</code>, and <code>opencode debug skill/config</code>. File-backed recall excludes items built into the harness binary, which no file can predict. Uncertain items exist on disk but load or not depending on runtime state no file records. For Codex this is the skill-list budget, which scales with the context window cortextos passes at launch. Determinable recall excludes those items. Hooks are scored only against hooks that actually fired.</p>
    <div class="scroll">${liveTable}</div>
    <div>${sessionDetails}</div>
  </section>

  <section><h2>3 · Blind hand audit</h2>
    <p class="muted">A separate agent that never saw the tool's code hand-collected ground truth for ${blind?.cases?.length ?? 0} directory and harness pairs from config files and docs. Each disagreement was then settled with objective evidence, such as session transcripts or harness CLI output. Raw and adjudicated scores are both shown.</p>
    <div class="scroll">${blindTable}</div>
    <details><summary><b>Settled for the tool</b> (${uniq(byVerdict('tool-correct')).length} distinct items, with evidence)</summary>${adjList(uniq(byVerdict('tool-correct')))}</details>
    <details${byVerdict('unresolved').length ? ' open' : ''}><summary><b>Unresolved</b> (${uniq(byVerdict('unresolved')).length}). Not counted either way.</summary>${adjList(uniq(byVerdict('unresolved')))}</details>
  </section>

  <section><h2>Known limits</h2>
    ${knownLimits}
  </section>

  <section><h2>How to rerun</h2>
    <ol class="method">
      <li><code>npm test</code> runs the fixture unit tests for all three adapters, the live parsers and the renderers.</li>
      <li><code>node verify/run.js --hours 24</code> runs the live-session scorecard.</li>
      <li><code>node verify/blind.js</code> scores against <code>verify/local/ground-truth</code> and applies <code>verify/local/adjudications.json</code>.</li>
      <li><code>node verify/canary.js claude,codex,opencode &lt;tmpdir&gt;</code> boots the real harnesses. This costs a few model calls.</li>
      <li><code>node verify/report.js</code> rebuilds this page.</li>
    </ol>
  </section>
</main>`;
fs.writeFileSync(path.join(out, 'verification.html'), html);
console.log(path.join(out, 'verification.html'));
