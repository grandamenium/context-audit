import os from 'node:os';
import { SCHEMA_VERSION } from './model.js';
import path from 'node:path';
import { canonical, readFrontmatter } from './fsutil.js';
import { detectSession } from './session.js';
import { auditClaude } from './harness/claude.js';
import { auditCodex } from './harness/codex.js';
import { auditOpencode } from './harness/opencode.js';
import { liveClaude } from './live/claude.js';
import { liveCodex } from './live/codex.js';

export const ADAPTERS = { claude: auditClaude, codex: auditCodex, opencode: auditOpencode };
const LIVE = { claude: liveClaude, codex: liveCodex };

/**
 * @param {Object} opts
 * @param {string} [opts.cwd]        directory to audit; defaults to the invoking agent's boot cwd, else process.cwd()
 * @param {string[]} [opts.harnesses] subset of ADAPTERS keys; defaults to all
 * @param {string} [opts.home]       override home dir (tests)
 * @param {Object} [opts.env]        override env (tests)
 * @param {boolean} [opts.live]      also read the live session transcript, if one is detectable
 * @param {string} [opts.sessionId]  explicit session id for live mode
 * @param {Object} [opts.session]    pre-computed session (tests); skips detection
 */
export function audit(opts = {}) {
  const env = opts.env || process.env;
  const home = canonical(opts.home || os.homedir());
  const session = opts.session || (opts.cwd ? { harness: null, detectedBy: [] } : detectSession(env));
  const cwd = canonical(opts.cwd || session.bootCwd || process.cwd());
  const names = opts.harnesses?.length ? opts.harnesses : Object.keys(ADAPTERS);

  const report = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    cwd,
    home,
    platform: process.platform,
    session,
    harnesses: {},
  };

  for (const name of names) {
    // launch flags only apply to the harness that was actually launched with them
    const launch = opts.launch || (session.harness === name ? session.launch : undefined);
    const ctx = { cwd, home, env, platform: process.platform, launch };
    const sid = opts.sessionId || (session.harness === name ? session.sessionId : null);
    // Read the live log first: for Codex it records the session's context window, which
    // decides how many skills fit in the listing.
    let live;
    if (opts.live && LIVE[name]) {
      try { live = LIVE[name]({ cwd, home, env, sessionId: sid }); } catch (e) { live = { error: String(e.message || e) }; }
      if (live?.contextWindow) ctx.contextWindow = live.contextWindow;
    }
    try {
      report.harnesses[name] = ADAPTERS[name](ctx);
    } catch (e) {
      report.harnesses[name] = { items: [], chain: [], warnings: [`adapter crashed: ${e.stack || e}`] };
    }
    if (live) report.harnesses[name].live = live;
  }
  report.hygiene = skillHygiene(report);
  return report;
}

// Skill files whose frontmatter will confuse a harness or a reader: missing name/description,
// or a name that differs from its folder (harnesses disagree on which one wins).
function skillHygiene(report) {
  const byPath = new Map();
  for (const [h, r] of Object.entries(report.harnesses)) {
    for (const it of r.items || []) {
      if (it.kind !== 'skill' || !/SKILL\.md$/.test(it.path || '')) continue;
      const e = byPath.get(it.path) || { path: it.path, harnesses: [] };
      if (!e.harnesses.includes(h)) e.harnesses.push(h);
      byPath.set(it.path, e);
    }
  }
  const out = [];
  for (const e of byPath.values()) {
    const fm = readFrontmatter(e.path);
    if (!fm) continue;
    const dir = path.basename(path.dirname(e.path));
    const name = fm.data?.name, desc = fm.data?.description;
    if (!name && !desc) out.push({ ...e, issue: 'no name or description in frontmatter (OpenCode skips it; others fall back to the folder name)' });
    else if (!desc) out.push({ ...e, issue: 'no description in frontmatter, so the model cannot tell when to use it' });
    else if (!name) out.push({ ...e, issue: `no name in frontmatter; harnesses fall back to the folder name "${dir}"` });
    else if (String(name) !== dir) out.push({ ...e, issue: `frontmatter name "${name}" differs from folder "${dir}"; Claude Code lists it by folder, OpenCode and Codex by name` });
  }
  return out;
}
