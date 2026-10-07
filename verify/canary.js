// End-to-end canary test: build a throwaway project whose bootstrap docs, skills and
// MCP config carry unique CANARY_* markers, boot the REAL harnesses in it, and check
// that what they actually loaded equals what context-audit predicts.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { audit } from '../src/index.js';
import { liveClaude } from '../src/live/claude.js';
import { liveCodex } from '../src/live/codex.js';

const write = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); };
const skill = (name) => `---\nname: ${name}\ndescription: Canary skill ${name} used by context-audit verification. Never invoke.\n---\nCanary.\n`;

export function buildCanary(base) {
  const root = fs.mkdtempSync(path.join(base, 'ca-canary-'));
  const id = path.basename(root).slice(-6).toUpperCase().replace(/[^A-Z0-9]/g, 'X');
  const tok = (s) => `CANARY_${s}_${id}`;
  execFileSync('git', ['init', '-q', root]);
  write(path.join(root, 'CLAUDE.md'), `# root\n${tok('ROOT_CLAUDE')}\n@extra.md\n`);
  write(path.join(root, 'extra.md'), `${tok('IMPORT')}\n`);
  write(path.join(root, 'AGENTS.md'), `# root agents\n${tok('ROOT_AGENTS')}\n`);
  write(path.join(root, '.claude/rules/always.md'), `${tok('RULE')}\n`);
  write(path.join(root, '.claude/rules/scoped.md'), `---\npaths:\n  - "**/*.never"\n---\n${tok('SCOPED_RULE')}\n`);
  write(path.join(root, '.claude/skills/canary-claude-skill/SKILL.md'), skill('canary-claude-skill'));
  write(path.join(root, '.agents/skills/canary-agents-skill/SKILL.md'), skill('canary-agents-skill'));
  write(path.join(root, '.opencode/skills/canary-opencode-skill/SKILL.md'), skill('canary-opencode-skill'));
  // Minimal real stdio MCP server, so a harness that loads it shows it as connected.
  write(path.join(root, 'canary-mcp.mjs'), MCP_SERVER);
  write(path.join(root, '.mcp.json'), JSON.stringify({ mcpServers: { 'canary-mcp': { command: process.execPath, args: [path.join(root, 'canary-mcp.mjs')] } } }, null, 2));
  const cwd = path.join(root, 'sub');
  write(path.join(cwd, 'CLAUDE.md'), `${tok('SUB_CLAUDE')}\n`);
  write(path.join(cwd, 'AGENTS.md'), `${tok('SUB_AGENTS')}\n`);
  write(path.join(cwd, 'nested/CLAUDE.md'), `${tok('NESTED_LAZY')}\n`); // must NOT load at boot
  return { root, cwd: fs.realpathSync.native(cwd), id };
}

const MCP_SERVER = `import readline from 'node:readline';
const send = (m) => process.stdout.write(JSON.stringify(m) + '\\n');
readline.createInterface({ input: process.stdin }).on('line', (l) => {
  let m; try { m = JSON.parse(l); } catch { return; }
  if (m.id === undefined) return;
  if (m.method === 'initialize') send({ jsonrpc: '2.0', id: m.id, result: { protocolVersion: m.params?.protocolVersion || '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'canary-mcp', version: '0.0.1' } } });
  else if (m.method === 'tools/list') send({ jsonrpc: '2.0', id: m.id, result: { tools: [{ name: 'canary_ping', description: 'canary', inputSchema: { type: 'object', properties: {} } }] } });
  else send({ jsonrpc: '2.0', id: m.id, result: {} });
});
`;

const PROMPT = 'Do not use any tools. List every distinct string that begins with "CANARY_" that appears anywhere in your system prompt, instructions, or context (not in this message). Output only those strings, one per line, nothing else. If none, output NONE.';

// Strip our own session's identity so the child is a fresh top-level session.
function childEnv() {
  const e = { ...process.env };
  for (const k of Object.keys(e)) if (/^(CLAUDECODE|CLAUDE_CODE_|CLAUDE_PID|CODEX_THREAD|CODEX_SESSION|OPENCODE_SESSION)/.test(k)) delete e[k];
  return e;
}

const tokensIn = (text, id) => [...new Set((text || '').match(new RegExp(`CANARY_[A-Z_]+_${id}`, 'g')) || [])].sort();

// Tokens contained in the bootstrap files the audit says are active at boot.
function predictedTokens(h, id) {
  const files = h.items.filter((i) => (i.kind === 'bootstrap' || i.kind === 'rule') && i.status === 'active').map((i) => i.path);
  return tokensIn(files.map((f) => { try { return fs.readFileSync(f, 'utf8'); } catch { return ''; } }).join('\n'), id);
}
const canaryNames = (arr) => [...new Set(arr.filter((n) => /canary/.test(n)))].sort();

function runClaude(c) {
  const r = spawnSync('claude', ['-p', '--model', 'haiku', '--output-format', 'json', PROMPT], { cwd: c.cwd, env: childEnv(), encoding: 'utf8', timeout: 180000 });
  let out = {};
  try { out = JSON.parse(r.stdout); } catch { return { error: `claude -p failed: ${(r.stderr || r.stdout || '').slice(0, 300)}` }; }
  const live = liveClaude({ cwd: c.cwd, home: os.homedir(), env: process.env, sessionId: out.session_id });
  return { reportedTokens: tokensIn(out.result, c.id), live, sessionId: out.session_id };
}

function runCodex(c) {
  const lastMsg = path.join(c.root, 'codex-last.txt');
  const r = spawnSync('codex', ['exec', '--skip-git-repo-check', '-c', 'model_reasoning_effort="low"', '-o', lastMsg, '--json', PROMPT], { cwd: c.cwd, env: childEnv(), encoding: 'utf8', timeout: 300000 });
  const started = (r.stdout || '').split('\n').map((l) => { try { return JSON.parse(l); } catch { return null; } }).find((e) => e && (e.thread_id || e.type === 'thread.started'));
  const sessionId = started?.thread_id || null;
  let text = '';
  try { text = fs.readFileSync(lastMsg, 'utf8'); } catch { return { error: `codex exec failed: ${(r.stderr || '').slice(-300)}` }; }
  const live = liveCodex({ cwd: c.cwd, home: os.homedir(), env: process.env, sessionId });
  return { reportedTokens: tokensIn(text, c.id), live, sessionId };
}

function runOpencode(c) {
  // opencode truncates stdout when it is a pipe, so capture via files.
  const out = path.join(c.root, 'oc-run.txt'), dbgOut = path.join(c.root, 'oc-skill.txt');
  const model = process.env.CANARY_OPENCODE_MODEL || 'opencode/big-pickle';
  const r = spawnSync('sh', ['-c', `opencode run -m "$1" "$2" > "$3" 2>/dev/null`, 'sh', model, PROMPT, out], { cwd: c.cwd, env: childEnv(), timeout: 300000 });
  const text = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '';
  if (r.status !== 0 && !text) return { error: 'opencode run failed' };
  spawnSync('sh', ['-c', `opencode debug skill > "$1" 2>/dev/null`, 'sh', dbgOut], { cwd: c.cwd, env: childEnv(), timeout: 60000 });
  const skills = [...new Set((fs.existsSync(dbgOut) ? fs.readFileSync(dbgOut, 'utf8') : '').match(/canary-[a-z]+-skill/g) || [])].sort();
  return { reportedTokens: tokensIn(text, c.id), live: { observed: { skills } }, via: 'opencode debug skill + model self-report' };
}

const RUNNERS = { claude: runClaude, codex: runCodex, opencode: runOpencode };

function setCompare(predicted, observed) {
  const p = new Set(predicted), o = new Set(observed);
  const matched = [...p].filter((x) => o.has(x));
  return {
    predicted: [...p].sort(), observed: [...o].sort(), matched: matched.sort(),
    missing: [...o].filter((x) => !p.has(x)).sort(), // loaded but tool did not predict
    extra: [...p].filter((x) => !o.has(x)).sort(),   // predicted but not loaded
    pass: matched.length === p.size && matched.length === o.size,
  };
}

export function runCanary({ base = os.tmpdir(), harnesses = ['claude', 'codex', 'opencode'] } = {}) {
  const c = buildCanary(base);
  const results = { fixture: c.root, cwd: c.cwd, id: c.id, harnesses: {} };
  for (const h of harnesses) {
    const rep = audit({ cwd: c.cwd, harnesses: [h], session: { harness: null, detectedBy: [] } }).harnesses[h];
    const run = RUNNERS[h](c);
    const res = { run: { ...run, live: run.live && { source: run.live.source, error: run.live.error } } };
    if (!run.error) {
      res.bootstrapTokens = setCompare(predictedTokens(rep, c.id), run.reportedTokens);
      const obsSkills = (run.live?.observed?.skills || []).map((s) => (typeof s === 'string' ? s : s.name));
      res.canarySkills = setCompare(canaryNames(rep.items.filter((i) => i.kind === 'skill' && i.status === 'active').map((i) => i.name)), canaryNames(obsSkills));
      if (h === 'claude') {
        res.canaryMcp = setCompare(
          canaryNames(rep.items.filter((i) => i.kind === 'mcp' && i.status === 'active').map((i) => i.name)),
          canaryNames(run.live?.observed?.mcpServers || []),
        );
        res.canaryMcp.note = 'claude -p loads unapproved project .mcp.json servers; interactive sessions would prompt';
      }
    }
    results.harnesses[h] = res;
  }
  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const hs = process.argv[2] ? process.argv[2].split(',') : undefined;
  const res = runCanary({ base: process.argv[3] || os.tmpdir(), harnesses: hs });
  const out = path.join(path.dirname(new URL(import.meta.url).pathname), 'out');
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'canary.json'), JSON.stringify({ generatedAt: new Date().toISOString(), ...res }, null, 2));
  console.log(JSON.stringify(res, null, 2));
}
