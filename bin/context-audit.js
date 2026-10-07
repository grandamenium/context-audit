#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { spawn } from 'node:child_process';

const USAGE = `Usage: context-audit [dir] [options]
       context-audit serve [--port 4747] [--no-open]   local web UI
  --harness a,b     claude,codex,opencode (default: all)
  --json            print the raw report as JSON
  --html [file]     write a self-contained HTML report (default ./context-audit.html)
  --open            open the HTML report (implies --html)
  --live            compare against the live session transcript
  --session <id>    session id for --live
  --kind a,b        only show these kinds (skill,mcp,hook,bootstrap,plugin,command,agent,rule)
  --all             include disabled and shadowed items
  -h, --help
`;

if (process.argv[2] === 'serve') {
  const { values: sv } = parseArgs({ args: process.argv.slice(3), options: { port: { type: 'string', default: '4747' }, 'no-open': { type: 'boolean' } } });
  const { startServer } = await import('../src/server.js');
  const { url } = await startServer({ port: Number(sv.port) });
  console.log(`context-audit UI running at ${url} (local only). Ctrl+C to stop.`);
  if (!sv['no-open']) spawn(process.platform === 'darwin' ? 'open' : 'xdg-open', [url], { stdio: 'ignore', detached: true }).unref();
} else {
await main();
}

async function main() {
// --html takes an optional value; parseArgs cannot express that, so pull it out first.
const argv = process.argv.slice(2);
let htmlFile = null;
let wantHtml = false;
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--html') {
    wantHtml = true;
    const next = argv[i + 1];
    if (next && !next.startsWith('-') && /\.html?$/i.test(next)) { htmlFile = next; argv.splice(i, 2); } else argv.splice(i, 1);
    break;
  }
}

let parsed;
try {
  parsed = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      harness: { type: 'string' }, json: { type: 'boolean' }, open: { type: 'boolean' }, live: { type: 'boolean' },
      session: { type: 'string' }, kind: { type: 'string' }, all: { type: 'boolean' }, help: { type: 'boolean', short: 'h' },
    },
  });
} catch (e) {
  console.error(`${e.message}\n\n${USAGE}`);
  process.exit(2);
}
const { values, positionals } = parsed;
if (values.help) { process.stdout.write(USAGE); process.exit(0); }

const list = (s) => (s ? s.split(',').map((x) => x.trim()).filter(Boolean) : undefined);
const { audit, ADAPTERS } = await import('../src/index.js');
const harnesses = list(values.harness);
const bad = harnesses?.filter((h) => !ADAPTERS[h]);
if (bad?.length) { console.error(`unknown harness: ${bad.join(', ')} (known: ${Object.keys(ADAPTERS).join(', ')})`); process.exit(2); }
const KIND_ALIAS = { skills: 'skill', hooks: 'hook', plugins: 'plugin', commands: 'command', agents: 'agent', rules: 'rule', docs: 'bootstrap' };
const kinds = list(values.kind)?.map((k) => KIND_ALIAS[k] || k);

const wantLive = values.live || !!values.session;
const report = audit({
  cwd: positionals[0] ? path.resolve(positionals[0]) : undefined,
  harnesses, live: wantLive, sessionId: values.session,
});

if (values.json) {
  // return instead of process.exit: exiting drops buffered stdout when piped (~64KB cap)
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  return;
}

const s = report.session || {};
const sessionLine = positionals[0]
  ? `auditing ${report.cwd}`
  : s.harness
    ? `session detected: ${s.harness}${s.pid ? ` pid ${s.pid}` : ''} cwd ${s.bootCwd || report.cwd}`
    : `no agent session detected; using cwd ${report.cwd}`;

if (wantHtml || values.open) {
  const { renderHtml } = await import('../src/render/html.js');
  const file = path.resolve(htmlFile || 'context-audit.html');
  fs.writeFileSync(file, renderHtml(report, { all: values.all }));
  console.log(sessionLine);
  console.log(file);
  if (values.open) {
    const child = spawn(process.platform === 'darwin' ? 'open' : 'xdg-open', [file], { stdio: 'ignore', detached: true });
    child.on('error', (e) => console.error(`could not open: ${e.message}`));
    child.unref();
  }
} else {
  const { renderTree } = await import('../src/render/tree.js');
  console.log(sessionLine);
  process.stdout.write(renderTree(report, { all: values.all, kinds }));
}
}
