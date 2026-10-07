// Fixed-format chat summary for agents. Every agent that runs context-audit relays this
// block as-is, so users get the same shape of answer from Claude Code, Codex or OpenCode.
import path from 'node:path';
import { compareLive } from './diff.js';

const NAME = { claude: 'Claude Code', codex: 'Codex', opencode: 'OpenCode' };
const KIND = [['bootstrap', 'Bootstrap docs'], ['skill', 'Skills'], ['hook', 'Hooks'], ['mcp', 'MCP servers'], ['plugin', 'Plugins'], ['command', 'Commands'], ['agent', 'Agents'], ['rule', 'Rules']];
const ATTENTION = ['needs-approval', 'disabled', 'shadowed', 'unknown'];
const kb = (b) => (b == null ? '?' : b >= 1024 ? `${(b / 1024).toFixed(1)} KB` : `${b} B`);
const pct = (x) => (x == null ? 'n/a' : `${Math.round(x * 100)}%`);

// Where a skill comes from, coarse enough to group: the plugin, or the folder holding the skills dir.
function skillSource(it, tild) {
  if (it.plugin) return `plugin ${it.plugin}`;
  const m = it.path.match(/^(.*?\/(?:\.claude|\.codex|\.agents|\.opencode|opencode)\/skills)\//);
  if (m) return tild(m[1]);
  // symlinked or nested trees: group by the directory two levels above SKILL.md, folding
  // per-agent copies (…/agents/<name>/…) into one source so fleets read as one line
  return tild(path.dirname(path.dirname(path.dirname(it.path)))).replace(/\/agents\/[^/]+\//, '/agents/*/');
}

export function renderSummary(report, { harness, htmlPath, opened, maxList = 8 } = {}) {
  const home = report.home;
  const tild = (p) => (p && home && p.startsWith(home + '/') ? '~' + p.slice(home.length) : p);
  const h = report.harnesses[harness];
  const items = h.items || [];
  const s = report.session || {};
  const out = [];
  const flags = Object.entries(s.launch || {}).filter(([k]) => k !== 'argv0')
    .map(([k, v]) => `--${k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())}${Array.isArray(v) ? ' ' + v.map((x) => tild(x.path) || (x.inline ? '<inline>' : String(x))).join(', ') : ''}`);

  out.push(`## Context audit: ${NAME[harness] || harness}`);
  out.push('');
  out.push(s.harness === harness && (s.pid || s.sessionId)
    ? `**Session:** ${NAME[harness]} ${s.pid ? `pid ${s.pid}` : `session ${s.sessionId}`}, booted in \`${tild(report.cwd)}\`${flags.length ? `, launch flags: ${flags.join('; ')}` : ''}`
    : `**Folder:** \`${tild(report.cwd)}\` (what a new ${NAME[harness]} session started here would load)`);
  if (htmlPath) out.push(`**Interactive report:** ${htmlPath}${opened ? ' (opened in your browser)' : ''}`);
  out.push('');

  out.push('| Kind | Active | Not active |');
  out.push('|---|---|---|');
  for (const [k, label] of KIND) {
    const all = items.filter((i) => i.kind === k);
    if (!all.length) continue;
    const on = all.filter((i) => i.status === 'active').length;
    out.push(`| ${label} | ${on} | ${all.length - on} |`);
  }
  out.push('');

  // Claude's .claude/rules are prompt text; Codex .rules files are exec policy, not context.
  const boot = items.filter((i) => (i.kind === 'bootstrap' || (i.kind === 'rule' && harness === 'claude')) && i.status === 'active')
    .sort((a, b) => (a.details?.order ?? 99) - (b.details?.order ?? 99));
  if (boot.length) {
    out.push(`**Bootstrap docs, in load order** (${kb(boot.reduce((n, i) => n + (i.details?.bytes || 0), 0))} total):`);
    boot.forEach((i, n) => out.push(`${n + 1}. \`${tild(i.path)}\` ${kb(i.details?.bytes)}, ${i.scope}`));
    out.push('');
  }

  const skills = items.filter((i) => i.kind === 'skill' && i.status === 'active');
  if (skills.length) {
    const by = new Map();
    for (const it of skills) { const k = skillSource(it, tild); by.set(k, (by.get(k) || 0) + 1); }
    const top = [...by.entries()].sort((a, b) => b[1] - a[1]);
    out.push(`**Skills by source** (${skills.length} active):`);
    top.slice(0, maxList).forEach(([k, n]) => out.push(`- ${n} from \`${k}\``));
    if (top.length > maxList) out.push(`- ${top.slice(maxList).reduce((n, [, c]) => n + c, 0)} more from ${top.length - maxList} other sources`);
    out.push('');
  }

  const mcp = items.filter((i) => i.kind === 'mcp' && i.status === 'active');
  if (mcp.length) {
    out.push(`**MCP servers** (${mcp.length} active): ${mcp.map((i) => `${i.name} (${i.scope})`).join(', ')}`);
    out.push('');
  }
  const hooks = items.filter((i) => i.kind === 'hook' && i.status === 'active');
  if (hooks.length) {
    const ev = {};
    for (const i of hooks) { const e = i.details?.event || i.name.split(':')[0]; ev[e] = (ev[e] || 0) + 1; }
    const files = [...new Set(hooks.map((i) => tild(i.path)))];
    out.push(`**Hooks** (${hooks.length} active): ${Object.entries(ev).map(([e, n]) => `${e} ${n}`).join(', ')}. Defined in: ${files.slice(0, 5).map((f) => `\`${f}\``).join(', ')}${files.length > 5 ? ` +${files.length - 5} more` : ''}`);
    out.push('');
  }

  const cmp = h.live && !h.live.error ? compareLive(h) : null;
  if (cmp) {
    out.push('**Live check against this session\'s own log:**');
    out.push('');
    out.push('| | Predicted | Seen | Matched | Recall (file-backed) | Not file-backed / unverifiable |');
    out.push('|---|---|---|---|---|---|');
    for (const [k, label] of [['bootstrap', 'Bootstrap docs'], ['skills', 'Skills'], ['mcp', 'MCP servers']]) {
      const c = cmp[k];
      if (!c) { out.push(`| ${label} | - | - | - | not recorded in this harness's log | - |`); continue; }
      const other = (c.builtinMissing?.length || 0) + (c.unverifiableMissing?.length || 0);
      out.push(`| ${label} | ${c.predicted} | ${c.observed} | ${c.matched} | ${pct(c.recallFileBacked)} | ${other} |`);
    }
    const unexplained = ['bootstrap', 'skills', 'mcp'].flatMap((k) => cmp[k]?.unexplainedMissing || []);
    out.push('');
    out.push(unexplained.length ? `Loaded but not predicted (worth checking): ${unexplained.slice(0, maxList).join(', ')}` : 'Everything the session loaded from files was predicted.');
    out.push('');
  }

  const attention = items.filter((i) => ATTENTION.includes(i.status) && i.kind !== 'skill');
  const shadowedSkills = items.filter((i) => i.kind === 'skill' && i.status !== 'active');
  const hygiene = (report.hygiene || []).filter((x) => x.harnesses.includes(harness));
  if (attention.length || shadowedSkills.length || hygiene.length || h.warnings?.length) {
    out.push('**Needs attention:**');
    // Account-level connectors share one reason; one line instead of one per connector.
    const connectors = attention.filter((i) => i.status === 'unknown' && i.scope === 'remote');
    if (connectors.length) out.push(`- [unknown] ${connectors.length} claude.ai connectors (${connectors.map((i) => i.details?.connector || i.name).join(', ')}): set on the account, not in files, so whether each loads depends on the login`);
    for (const st of ATTENTION) {
      const group = attention.filter((i) => i.status === st && !connectors.includes(i));
      group.slice(0, maxList).forEach((i) => out.push(`- [${st}] ${i.kind} \`${i.name}\`: ${i.reason || tild(i.path)}`));
      if (group.length > maxList) out.push(`- [${st}] ${group.length - maxList} more ${st} items in the report`);
    }
    if (shadowedSkills.length) {
      const why = {};
      for (const i of shadowedSkills) { const r = i.details?.reason || i.reason || i.status; why[r] = (why[r] || 0) + 1; }
      Object.entries(why).sort((a, b) => b[1] - a[1]).slice(0, 4).forEach(([r, n]) => out.push(`- [skills] ${n} not shown to the model: ${r}`));
    }
    hygiene.slice(0, maxList).forEach((x) => out.push(`- [skill hygiene] \`${tild(x.path)}\`: ${x.issue}`));
    if (hygiene.length > maxList) out.push(`- [skill hygiene] ${hygiene.length - maxList} more in the report`);
    (h.warnings || []).slice(0, 3).forEach((w) => out.push(`- [note] ${w}`));
    out.push('');
  }
  return out.join('\n');
}
