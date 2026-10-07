import os from 'node:os';
import { SCHEMA_VERSION } from './model.js';
import { canonical } from './fsutil.js';
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
    try {
      report.harnesses[name] = ADAPTERS[name](ctx);
    } catch (e) {
      report.harnesses[name] = { items: [], chain: [], warnings: [`adapter crashed: ${e.stack || e}`] };
    }
    if (opts.live && LIVE[name]) {
      const sid = opts.sessionId || (session.harness === name ? session.sessionId : null);
      try {
        report.harnesses[name].live = LIVE[name]({ cwd, home, env, sessionId: sid });
      } catch (e) {
        report.harnesses[name].live = { error: String(e.message || e) };
      }
    }
  }
  return report;
}
