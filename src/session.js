import { execFileSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { codexThreadCwd } from './live/codex.js';

const HARNESS_BY_COMM = [
  [/(^|\/)claude$/, 'claude'],
  [/(^|\/)codex$|codex-[a-z0-9_-]+$/, 'codex'],
  [/(^|\/)opencode$/, 'opencode'],
];

function ps(pid) {
  try {
    const out = execFileSync('ps', ['-o', 'ppid=,comm=', '-p', String(pid)], { encoding: 'utf8' }).trim();
    const m = out.match(/^(\d+)\s+(.*)$/);
    return m ? { ppid: Number(m[1]), comm: m[2] } : null;
  } catch { return null; }
}

// cwd of another process. macOS has no /proc, so use lsof; Linux uses /proc.
export function processCwd(pid) {
  try {
    if (process.platform === 'linux') return execFileSync('readlink', [`/proc/${pid}/cwd`], { encoding: 'utf8' }).trim();
    const out = execFileSync('lsof', ['-a', '-p', String(pid), '-d', 'cwd', '-Fn'], { encoding: 'utf8' });
    const line = out.split('\n').find((l) => l.startsWith('n'));
    return line ? line.slice(1) : null;
  } catch { return null; }
}

/**
 * Figure out which agent harness (if any) invoked us and the directory it booted in.
 * The harness's boot cwd matters, not our own cwd: an agent may `cd` before calling us.
 */
export function detectSession(env = process.env, startPid = process.ppid) {
  const s = { harness: null, pid: null, sessionId: null, bootCwd: null, detectedBy: [] };

  if (env.CLAUDECODE === '1' || env.CLAUDE_CODE_SESSION_ID) {
    s.harness = 'claude';
    s.sessionId = env.CLAUDE_CODE_SESSION_ID || null;
    if (env.CLAUDE_PID) s.pid = Number(env.CLAUDE_PID);
    s.detectedBy.push('env');
  } else if (env.CODEX_THREAD_ID || env.CODEX_SESSION_ID || env.CODEX_MANAGED_BY_NPM || env.CODEX_SANDBOX) {
    s.harness = 'codex';
    s.sessionId = env.CODEX_THREAD_ID || env.CODEX_SESSION_ID || null;
    s.detectedBy.push('env');
  } else if (env.OPENCODE || env.OPENCODE_SESSION_ID) {
    s.harness = 'opencode';
    s.sessionId = env.OPENCODE_SESSION_ID || null;
    s.detectedBy.push('env');
  }

  if (!s.pid) {
    let pid = startPid;
    for (let i = 0; i < 12 && pid > 1; i++) {
      const info = ps(pid);
      if (!info) break;
      const hit = HARNESS_BY_COMM.find(([re]) => re.test(info.comm));
      if (hit && (!s.harness || s.harness === hit[1])) {
        s.harness = hit[1];
        s.pid = pid;
        s.detectedBy.push('process-tree');
        break;
      }
      pid = info.ppid;
    }
  }

  let argv = null;
  if (s.pid) {
    argv = processArgs(s.pid);
    // A Codex app-server/exec-server hosts many threads; its process cwd is not the session's.
    const host = argv && /(?:^| )(app-server|exec-server)(?: |$)/.test(argv.join(' '));
    const cwd = host ? null : processCwd(s.pid);
    if (cwd) { s.bootCwd = path.resolve(cwd); s.detectedBy.push('process-cwd'); }
    if (host) s.detectedBy.push('codex-host-process');
  }
  // Codex exposes its thread id to the shell; the thread's rollout records the exact boot cwd.
  if (s.harness === 'codex' && s.sessionId) {
    const cwd = codexThreadCwd({ home: os.homedir(), env, threadId: s.sessionId });
    if (cwd) { s.bootCwd = path.resolve(cwd); s.detectedBy.push('codex-rollout-cwd'); }
  }
  if (argv) s.launch = parseLaunchFlags(argv, s.bootCwd || process.cwd());
  return s;
}

export function processArgs(pid) {
  try {
    if (process.platform === 'linux') {
      return execFileSync('cat', [`/proc/${pid}/cmdline`], { encoding: 'utf8' }).split('\0').filter(Boolean);
    }
    // macOS `ps` joins argv with spaces; KERN_PROCARGS2 isn't reachable from node, so
    // split on " --" boundaries, which is safe for the path/JSON values we care about.
    const raw = execFileSync('ps', ['-ww', '-o', 'args=', '-p', String(pid)], { encoding: 'utf8' }).trim();
    const parts = raw.split(/ (?=--?[A-Za-z])/);
    const out = [];
    for (const p of parts) {
      const m = p.match(/^(--?[A-Za-z][\w-]*)(?:[ =]([\s\S]*))?$/);
      if (m) { out.push(m[1]); if (m[2] !== undefined) out.push(m[2]); } else out.push(p);
    }
    return out;
  } catch { return null; }
}

// Launch flags change what loads independent of the cwd (e.g. cortextos agents pass
// --settings with their hooks). Values that are inline JSON are kept parsed; paths resolved.
const MULTI = {
  '--settings': 'settings', '--mcp-config': 'mcpConfig', '--plugin-dir': 'pluginDirs', '--add-dir': 'addDirs',
  '--append-system-prompt-file': 'appendSystemPromptFiles', '--system-prompt-file': 'systemPromptFiles',
  '--agents': 'agents', '-c': 'configOverrides', '--config': 'configOverrides', '--profile': 'profile',
};
const BOOL = { '--strict-mcp-config': 'strictMcpConfig', '--append-system-prompt': 'appendSystemPrompt', '--system-prompt': 'systemPrompt', '--bare': 'bare' };

export function parseLaunchFlags(argv, baseDir) {
  const launch = { argv0: argv[0] };
  for (let i = 1; i < argv.length; i++) {
    const flag = argv[i];
    if (MULTI[flag] && i + 1 < argv.length) {
      const key = MULTI[flag];
      let val = argv[++i];
      if (/^[{[]/.test(val.trim())) {
        try { val = { inline: JSON.parse(val) }; } catch { val = { inline: null, unparsed: true }; }
      } else if (key !== 'configOverrides' && key !== 'profile') {
        val = { path: path.resolve(baseDir, val) };
      }
      (launch[key] ||= []).push(val);
    } else if (BOOL[flag]) {
      launch[BOOL[flag]] = true;
      // prompt-text flags take a value we deliberately do not capture
      if ((flag === '--append-system-prompt' || flag === '--system-prompt') && i + 1 < argv.length && !argv[i + 1].startsWith('-')) i++;
    }
  }
  return launch;
}
