import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { audit } from '../src/index.js';
import { redact } from '../src/model.js';
import { parseLaunchFlags } from '../src/session.js';
import { renderHtml } from '../src/render/html.js';
import { startServer } from '../src/server.js';

const CANARY = 'SYNTHETIC_AUDIT_VALUE_CANARY';
const request = (url, headers = {}, method = 'GET') => new Promise((resolve, reject) => {
  const req = http.request(url, { headers, method }, (res) => {
    let body = '';
    res.setEncoding('utf8');
    res.on('data', (chunk) => { body += chunk; });
    res.on('end', () => resolve({ status: res.statusCode, body }));
  });
  req.on('error', reject);
  req.end();
});

test('exported reports redact launch credentials without changing discovery input', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ca-private-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const launch = parseLaunchFlags(['claude', '--settings', JSON.stringify({
    env: { API_KEY: CANARY },
    hooks: { Stop: [{ hooks: [{ type: 'command', command: 'echo fixture' }] }] },
  })], dir);
  const report = audit({ cwd: dir, home: dir, env: {}, harnesses: ['claude'],
    session: { harness: 'claude', launch } });
  assert.ok(report.harnesses.claude.items.some((i) => i.kind === 'hook'));
  assert.equal(launch.settings[0].inline.env.API_KEY, CANARY);
  assert.ok(!JSON.stringify(report).includes(CANARY));
  assert.ok(!renderHtml(report).includes(CANARY));
  const codex = audit({ cwd: dir, home: dir, env: {}, harnesses: ['codex'],
    session: { harness: 'codex', launch: { configOverrides: [
      `mcp_servers.demo.env.API_KEY="${CANARY}"`,
      `mcp_servers.demo.env."QUOTED_KEY"="${CANARY}"`,
      'mcp_servers.demo.command="node"',
    ] } } });
  assert.ok(codex.harnesses.codex.items.some((i) => i.kind === 'mcp' && i.name === 'demo'));
  assert.ok(!JSON.stringify(codex).includes(CANARY));
  assert.ok(!renderHtml(codex).includes(CANARY));
});

test('redaction covers credential URLs, command arguments and non-string values', () => {
  const source = {
    url: `https://fixture:${CANARY}@example.invalid/mcp?api_key=${CANARY}&mode=read`,
    args: ['--token', CANARY, '--password=' + CANARY, '--format', 'json'],
    command: `API_KEY=${CANARY} tool --token '${CANARY}'`,
    environment: { VALUE: CANARY },
    password: [CANARY],
    access_token: 123456,
  };
  const result = redact(source);
  assert.ok(!JSON.stringify(result).includes(CANARY));
  assert.equal(result.access_token, '<redacted>');
  assert.equal(result.args.at(-1), 'json');
  assert.ok(result.url.includes('mode=read'));
  assert.equal(source.args[1], CANARY);
  for (const command of [
    `curl --data '{"api_key":"${CANARY}"}'`,
    `curl -H 'Authorization: Basic ${CANARY}'`,
    `curl -H 'Cookie: session=${CANARY}'`,
    `tool --cookie ${CANARY}`,
  ]) assert.ok(!JSON.stringify(redact({ command })).includes(CANARY));
  assert.ok(!JSON.stringify(redact({ args: ['-H', `Cookie: session=${CANARY}`] })).includes(CANARY));
  const opaque = 'SYNTHETIC_URL_USERINFO_CANARY';
  assert.ok(!redact({ command: `curl https://fixture:${opaque}@example.invalid/mcp` }).command.includes(opaque));
  assert.ok(!redact({ url: `https://example.invalid/#access_token=${opaque}` }).url.includes(opaque));
});

test('local server rejects foreign request authorities and origins', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ca-origin-'));
  fs.writeFileSync(path.join(dir, 'AGENTS.md'), 'synthetic fixture\n');
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const { server, url } = await startServer({ port: 0 });
  t.after(() => { server.closeAllConnections(); server.close(); });
  const endpoint = `${url}api/ls?dir=${encodeURIComponent(dir)}`;
  assert.equal((await fetch(endpoint)).status, 200);
  assert.equal((await fetch(endpoint, { headers: { origin: new URL(url).origin } })).status, 200);
  for (const headers of [
    { host: 'review.invalid' },
    { host: 'review.invalid', origin: 'http://review.invalid' },
    { origin: 'https://review.invalid' },
    { origin: 'null' },
    { 'sec-fetch-site': 'cross-site' },
    { 'sec-fetch-site': 'same-site' },
  ]) {
    const response = await request(endpoint, headers);
    assert.equal(response.status, 403, JSON.stringify(headers));
    assert.ok(!response.body.includes('AGENTS.md'));
  }
  assert.equal((await request(endpoint, {}, 'POST')).status, 405);
});

test('local server refuses a non-loopback bind address', async () => {
  await assert.rejects(startServer({ port: 0, host: '0.0.0.0' }), /loopback/i);
});
