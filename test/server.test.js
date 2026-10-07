import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startServer } from '../src/server.js';

test('serve: binds to loopback and serves app, report, json, folder listing', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ca-serve-'));
  fs.writeFileSync(path.join(dir, 'AGENTS.md'), 'hello\n');
  const { server, url } = await startServer({ port: 0 });
  try {
    assert.match(url, /^http:\/\/127\.0\.0\.1:\d+\/$/);
    const app = await fetch(url).then((r) => r.text());
    assert.match(app, /Running agents/);
    const rep = await fetch(`${url}report?dir=${encodeURIComponent(dir)}&harness=codex`);
    assert.equal(rep.status, 200);
    const json = await fetch(`${url}api/audit?dir=${encodeURIComponent(dir)}&harness=codex`).then((r) => r.json());
    assert.ok(json.harnesses.codex.items.some((i) => i.kind === 'bootstrap' && i.path.endsWith('AGENTS.md')));
    const ls = await fetch(`${url}api/ls?dir=${encodeURIComponent(dir)}`).then((r) => r.json());
    assert.deepEqual(ls.markers, ['AGENTS.md']);
    assert.equal((await fetch(`${url}report?dir=/definitely/not/here`)).status, 404);
  } finally { server.close(); }
});
