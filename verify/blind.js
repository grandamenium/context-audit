// Score context-audit against hand-collected ground truth written by an auditor that
// never saw the tool's code (verify/ground-truth/*.json). Exact matching only.
//   node verify/blind.js [--out verify/out]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { audit } from '../src/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const gtDir = path.join(here, 'local', 'ground-truth');
const outDir = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : path.join(here, 'out');

// Account-level items (claude.ai connectors) are not derivable from disk; scored separately.
const isAccount = (m) => /claude\.ai|account|connector/i.test(`${m.definedIn} ${m.why}`);
const norm = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const hookKey = (e, m, c) => `${e}|${!m || m === '*' ? '*' : m}|${norm(c).slice(0, 60)}`;

function compare(truth, pred) {
  const t = [...truth], p = [...pred], matched = [];
  for (let i = t.length - 1; i >= 0; i--) {
    const j = p.indexOf(t[i]);
    if (j >= 0) { matched.push(t[i]); t.splice(i, 1); p.splice(j, 1); }
  }
  const n = matched.length;
  return { truth: truth.length, predicted: pred.length, matched: n, missing: t, extra: p,
    precision: pred.length ? n / pred.length : null, recall: truth.length ? n / truth.length : null };
}

const rows = [];
for (const f of fs.readdirSync(gtDir).filter((x) => x.endsWith('.json')).sort()) {
  const gt = JSON.parse(fs.readFileSync(path.join(gtDir, f), 'utf8'));
  const h = audit({ cwd: gt.cwd, harnesses: [gt.harness], session: { harness: null, detectedBy: [] } }).harnesses[gt.harness];
  const items = h.items || [];
  const on = (i) => i.status === 'active';
  const cats = {};

  cats.bootstrap = compare(
    (gt.bootstrap || []).map((b) => b.path),
    // Codex .rules are exec-policy, not prompt context; Claude .claude/rules are prompt context.
    items.filter((i) => (i.kind === 'bootstrap' || (i.kind === 'rule' && gt.harness === 'claude')) && on(i)).map((i) => i.path),
  );
  // '(project .mcp.json)' style entries are the auditor noting an absent file, not a server.
  const fileMcp = (gt.mcp || []).filter((m) => !isAccount(m) && !/^\(/.test(m.name));
  const mcpName = (i) => (i.plugin && gt.harness === 'claude' ? `plugin:${i.plugin.split('@')[0]}:${i.name}` : i.name);
  cats.mcp = compare(
    fileMcp.map((m) => `${m.name}|${m.enabled ? 'on' : 'off'}`),
    items.filter((i) => i.kind === 'mcp' && !(i.status === 'unknown' && i.scope === 'remote')).map((i) => `${mcpName(i)}|${on(i) ? 'on' : 'off'}`),
  );
  cats.hooks = compare(
    (gt.hooks || []).map((x) => hookKey(x.event, x.matcher, x.command)),
    items.filter((i) => i.kind === 'hook' && on(i)).map((i) => hookKey(i.details?.event, i.details?.matcher, i.details?.command ?? (i.details?.type === 'mcp_tool' ? `mcp_tool ${i.details.server}.${i.details.tool}` : i.details?.url))),
  );
  cats.plugins = compare(
    (gt.plugins || []).map((x) => `${x.id}|${x.enabled ? 'on' : 'off'}`),
    items.filter((i) => i.kind === 'plugin').map((i) => `${i.name}|${on(i) ? 'on' : 'off'}`),
  );
  cats.projectSkills = compare(
    (gt.projectSkills || []).map((s) => s.name),
    items.filter((i) => i.kind === 'skill' && ['project', 'ancestor'].includes(i.scope) && on(i)).map((i) => i.name),
  );
  rows.push({ file: f, harness: gt.harness, cwd: gt.cwd, accountMcp: (gt.mcp || []).filter(isAccount).map((m) => m.name), cats });
}

// Adjudications: disagreements where objective evidence (live transcripts, harness CLI
// output) showed the hand audit was wrong. Raw and adjudicated scores are both reported.
const adjPath = path.join(here, 'local', 'adjudications.json');
const adjs = fs.existsSync(adjPath) ? JSON.parse(fs.readFileSync(adjPath, 'utf8')) : [];
for (const r of rows) for (const [c, v] of Object.entries(r.cats)) {
  // one adjudication per disagreement key, however many times it was recorded
  const mine = [...new Map(adjs.filter((a) => a.harness === r.harness && a.cwd === r.cwd && a.category === c && a.verdict === 'tool-correct').map((a) => [a.key, a])).values()];
  const adj = { truth: v.truth, matched: v.matched, applied: [] };
  for (const a of mine) {
    if (v.missing.includes(a.key)) { adj.truth--; adj.applied.push(a); }
    else if (v.extra.includes(a.key)) { adj.truth++; adj.matched++; adj.applied.push(a); }
  }
  v.adjudicated = adj;
}

const agg = {};
for (const r of rows) for (const [c, v] of Object.entries(r.cats)) {
  const a = (agg[`${r.harness}/${c}`] ||= { cases: 0, truth: 0, predicted: 0, matched: 0, adjTruth: 0, adjMatched: 0, adjudications: 0 });
  a.cases++; a.truth += v.truth; a.predicted += v.predicted; a.matched += v.matched;
  a.adjTruth += v.adjudicated.truth; a.adjMatched += v.adjudicated.matched; a.adjudications += v.adjudicated.applied.length;
}
const pct = (n, d) => (d ? `${((n / d) * 100).toFixed(1)}%` : '-');
let md = '# Blind ground-truth comparison\n\nTruth = independent hand audit (verify/ground-truth); exact matching.\n\n| harness/category | cases | truth | predicted | matched | precision | recall | adjudicated precision | adjudicated recall | adjudications |\n|---|---|---|---|---|---|---|---|---|---|\n';
for (const [k, a] of Object.entries(agg).sort()) md += `| ${k} | ${a.cases} | ${a.truth} | ${a.predicted} | ${a.matched} | ${pct(a.matched, a.predicted)} | ${pct(a.matched, a.truth)} | ${pct(a.adjMatched, a.predicted)} | ${pct(a.adjMatched, a.adjTruth)} | ${a.adjudications} |\n`;
md += '\n## Disagreements\n';
for (const r of rows) {
  const lines = Object.entries(r.cats).filter(([, v]) => v.missing.length || v.extra.length)
    .map(([c, v]) => `  - ${c}: truth-only [${v.missing.join('; ')}] tool-only [${v.extra.join('; ')}]`);
  if (lines.length) md += `\n- **${r.harness}** \`${r.cwd}\`\n${lines.join('\n')}\n`;
}
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'blind.json'), JSON.stringify({ aggregate: agg, cases: rows }, null, 2));
fs.writeFileSync(path.join(outDir, 'blind.md'), md);
console.log(md);
