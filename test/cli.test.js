import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const bin = fileURLToPath(new URL('../bin/context-audit.js', import.meta.url));

// Regression: process.exit() after a large stdout write truncated piped JSON at ~64KB.
test('cli --json output is complete when piped', () => {
  const r = spawnSync(process.execPath, [bin, fileURLToPath(new URL('..', import.meta.url)), '--json'], { encoding: 'utf8', maxBuffer: 64 << 20 });
  assert.equal(r.status, 0, r.stderr);
  const report = JSON.parse(r.stdout);
  assert.equal(report.schemaVersion, 1);
  assert.ok(Object.keys(report.harnesses).length === 3);
});

test('cli --summary prints agent instructions and a fixed-format block, and writes the HTML report', () => {
  const dir = fileURLToPath(new URL('..', import.meta.url));
  const r = spawnSync(process.execPath, [bin, dir, '--summary', '--no-open', '--harness', 'codex'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^AGENT INSTRUCTIONS: /);
  assert.match(r.stdout, /===== BEGIN CONTEXT AUDIT =====\n## Context audit: Codex/);
  assert.match(r.stdout, /\| Kind \| Active \| Not active \|/);
  assert.match(r.stdout, /===== END CONTEXT AUDIT =====\n$/);
  const html = r.stdout.match(/\*\*Interactive report:\*\* (\S+\.html)/)[1];
  assert.ok(fs.existsSync(html));
});
