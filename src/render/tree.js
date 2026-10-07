import os from 'node:os';
import { compareLive, pct } from './diff.js';

const KIND_ORDER = ['bootstrap', 'skill', 'hook', 'mcp', 'plugin', 'command', 'agent', 'rule'];
const KIND_LABEL = { bootstrap: 'Bootstrap docs', skill: 'Skills', hook: 'Hooks', mcp: 'MCP servers', plugin: 'Plugins', command: 'Commands', agent: 'Agents', rule: 'Rules' };
const STATUS_COLOR = { active: 32, conditional: 36, disabled: 90, shadowed: 33, 'needs-approval': 35, unknown: 90 };

export const tildify = (p, home = os.homedir()) => (p && home && (p === home || p.startsWith(home + '/')) ? '~' + p.slice(home.length) : p);
const fmtBytes = (n) => (n == null ? '' : n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`);
const chainPath = (c) => (typeof c === 'string' ? c : c?.path ?? '');

export function renderTree(report, opts = {}) {
  const color = opts.color ?? (process.stdout.isTTY && !process.env.NO_COLOR);
  const home = report.home || os.homedir();
  const paint = (code, s) => (color ? `\x1b[${code}m${s}\x1b[0m` : s);
  const dim = (s) => paint(2, s);
  const bold = (s) => paint(1, s);
  const t = (p) => tildify(p, home);
  const kinds = opts.kinds?.length ? opts.kinds : null;
  const out = [];
  const W = 100;

  for (const [name, h] of Object.entries(report.harnesses || {})) {
    const items = h.items || [];
    out.push('', bold(`== ${name} ==`) + dim(`  project root: ${t(h.projectRoot || h.root || report.cwd)}`));
    const chain = (h.chain || []).map(chainPath).filter(Boolean);
    if (chain.length) out.push(dim('   chain: ' + chain.map(t).join(' > ')));
    for (const w of h.warnings || []) out.push(paint(33, `   warning: ${w}`.slice(0, W)));

    const hidden = items.filter((i) => ['disabled', 'shadowed'].includes(i.status));
    const shown = items.filter((i) => (!kinds || kinds.includes(i.kind)) && (opts.all || !['disabled', 'shadowed'].includes(i.status)));

    for (const kind of KIND_ORDER) {
      const group = shown.filter((i) => i.kind === kind);
      if (!group.length) continue;
      out.push('', bold(`${KIND_LABEL[kind]} (${group.length})`));
      for (const it of group) {
        const st = paint(STATUS_COLOR[it.status] || 0, it.status.padEnd(9));
        const indent = kind === 'bootstrap' ? '  '.repeat(1 + (it.details?.depth ?? it.details?.importDepth ?? 0)) : '  ';
        const order = kind === 'bootstrap' && it.details?.order != null ? `${it.details.order}. ` : '';
        const size = kind === 'bootstrap' ? fmtBytes(it.details?.bytes) : '';
        const left = `${indent}${order}${it.name}`;
        const tag = `[${it.scope}]`;
        out.push(`${left.padEnd(34)} ${tag.padEnd(11)} ${st} ${size ? size.padStart(8) + ' ' : ''}${dim(t(it.path))}`);
        if (it.reason && it.status !== 'active') out.push(dim(`${indent}  ${it.reason}`.slice(0, W)));
      }
    }

    const count = (key, list) => {
      const m = {};
      for (const i of list) m[i[key]] = (m[i[key]] || 0) + 1;
      return Object.entries(m).map(([k, v]) => `${k} ${v}`).join(', ') || 'none';
    };
    out.push('', bold('Summary: ') + `${items.length} items`);
    out.push(`  by kind:  ${count('kind', items)}`);
    out.push(`  by scope: ${count('scope', items)}`);
    const dis = hidden.filter((i) => i.status === 'disabled').length;
    const sh = hidden.filter((i) => i.status === 'shadowed').length;
    out.push(`  disabled ${dis}, shadowed ${sh}${opts.all ? '' : ' (hidden; use --all to show)'}`);

    const cmp = compareLive(h);
    if (h.live?.error) out.push('', paint(33, `Live: ${h.live.error}`));
    if (cmp) {
      out.push('', bold('Live vs predicted') + dim(cmp.source ? `  (${t(String(cmp.source))})` : ''));
      for (const k of ['bootstrap', 'skills', 'mcp']) {
        const c = cmp[k];
        out.push(`  ${k.padEnd(10)} pred ${c.predicted}  obs ${c.observed}  match ${c.matched}  recall ${pct(c.recall)} (file-backed ${pct(c.recallFileBacked)})  precision ${pct(c.precision)} (adjusted ${pct(c.precisionAdjusted)})`);
        const list = (label, arr, code) => {
          if (!arr?.length) return;
          out.push((code ? paint(code, `    ${label}`) : dim(`    ${label}`)) + dim(`: ${arr.slice(0, 6).map((x) => t(x.name ?? x)).join(', ')}${arr.length > 6 ? `, ... (+${arr.length - 6})` : ''}`));
        };
        list(`UNEXPLAINED missing (observed, not predicted) ${c.unexplainedMissing?.length}`, c.unexplainedMissing, '1;31');
        list(`UNEXPLAINED extra (predicted, not observed) ${c.extraUnexplained?.length}`, c.extraUnexplained, '1;31');
        list(`builtin ${c.builtinMissing?.length}`, c.builtinMissing);
        list(`unverifiable ${c.unverifiableMissing?.length}`, c.unverifiableMissing);
        for (const reason of ['failed-connection', 'stale-session', 'remote-unverifiable']) {
          const e = (c.extraExplained || []).filter((x) => x.reason === reason);
          list(`${reason} ${e.length}`, e);
        }
      }
    }
  }
  return out.join('\n') + '\n';
}
