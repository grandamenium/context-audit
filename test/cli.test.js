import { test } from 'node:test';
import assert from 'node:assert/strict';
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
