import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { auditOpencode, expandGlob } from '../src/harness/opencode.js';

const made = [];
after(() => { for (const d of made) fs.rmSync(d, { recursive: true, force: true }); });

// Fixture tree under a fresh tmp dir. Keys are relative paths; values are file bodies.
function fixture(files) {
  const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'oc-audit-')));
  made.push(base);
  for (const [rel, body] of Object.entries(files)) {
    const p = path.join(base, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, body);
  }
  return base;
}

// A git marker makes proj the project root, so the ancestor walk stops there.
const GIT = { 'proj/.git/HEAD': 'ref: refs/heads/main\n' };
const ctxFor = (base, over = {}) => ({
  home: path.join(base, 'home'),
  cwd: path.join(base, 'proj'),
  env: {},
  platform: 'linux',
  managedDir: null,
  ...over,
});
const sig = (r) => r.items.map((i) => `${i.kind}|${i.name}|${i.scope}|${i.status}`).sort();
const skill = (name, description) => `---\nname: ${name}\ndescription: ${description}\n---\nbody\n`;

test('global config: mcp local/remote/disabled, plugin, and secrets stay out of output', () => {
  const base = fixture({
    ...GIT,
    'home/.config/opencode/opencode.jsonc': `{
  // global config
  "mcp": {
    "local": { "type": "local", "command": ["npx", "-y", "srv", "--token", "TOKEN_VALUE_1"], "environment": { "API_KEY": "ENV_VALUE_1" } },
    "remote": { "type": "remote", "url": "https://mcp.example.com/v1?key=QUERY_VALUE_1", "headers": { "Authorization": "Bearer HDR_VALUE_1" } },
    "off": { "type": "local", "command": ["x"], "enabled": false },
  },
  "plugin": ["opencode-wakatime@1.0.0"],
}`,
  });
  const r = auditOpencode(ctxFor(base));
  assert.deepEqual(sig(r), [
    'mcp|local|user|active',
    'mcp|off|user|disabled',
    'mcp|remote|user|active',
    'plugin|opencode-wakatime@1.0.0|user|active',
  ]);
  const json = JSON.stringify(r);
  for (const secret of ['TOKEN_VALUE_1', 'ENV_VALUE_1', 'QUERY_VALUE_1', 'HDR_VALUE_1']) {
    assert.ok(!json.includes(secret), `leaked ${secret}`);
  }
  const local = r.items.find((i) => i.name === 'local');
  assert.equal(local.details.command, 'npx');
  assert.equal(local.details.argCount, 4);
  assert.deepEqual(local.details.environment, { API_KEY: '<redacted>' });
  const remote = r.items.find((i) => i.name === 'remote');
  assert.equal(remote.details.url, 'https://mcp.example.com/v1');
  assert.deepEqual(remote.details.headers, { Authorization: '<redacted>' });
  assert.equal(r.items.find((i) => i.name === 'off').reason, 'enabled: false');
});

test('project AGENTS.md walk: ancestor scope, CLAUDE.md shadowed by AGENTS.md', () => {
  const base = fixture({
    ...GIT,
    'proj/sub/AGENTS.md': 'sub rules',
    'proj/CLAUDE.md': 'root claude',
    'proj/sub/deep/.keep': '',
  });
  const r = auditOpencode(ctxFor(base, { cwd: path.join(base, 'proj/sub/deep') }));
  assert.deepEqual(sig(r), [
    'bootstrap|AGENTS.md|ancestor|active',
    'bootstrap|CLAUDE.md|project|shadowed',
  ]);
  assert.equal(r.projectRoot, path.join(base, 'proj'));
});

test('CLAUDE.md fallback honors OPENCODE_DISABLE_CLAUDE_CODE and _PROMPT', () => {
  const base = fixture({ ...GIT, 'proj/CLAUDE.md': 'p', 'home/.claude/CLAUDE.md': 'g' });
  assert.deepEqual(sig(auditOpencode(ctxFor(base))), [
    'bootstrap|CLAUDE.md|project|active',
    'bootstrap|CLAUDE.md|user|active',
  ]);
  assert.deepEqual(sig(auditOpencode(ctxFor(base, { env: { OPENCODE_DISABLE_CLAUDE_CODE_PROMPT: '1' } }))), [
    'bootstrap|CLAUDE.md|project|active',
    'bootstrap|CLAUDE.md|user|disabled',
  ]);
  assert.deepEqual(sig(auditOpencode(ctxFor(base, { env: { OPENCODE_DISABLE_CLAUDE_CODE: '1' } }))), [
    'bootstrap|CLAUDE.md|project|disabled',
    'bootstrap|CLAUDE.md|user|disabled',
  ]);
});

test('global AGENTS.md takes precedence over ~/.claude/CLAUDE.md', () => {
  const base = fixture({
    ...GIT,
    'home/.config/opencode/AGENTS.md': 'global agents',
    'home/.claude/CLAUDE.md': 'global claude',
  });
  assert.deepEqual(sig(auditOpencode(ctxFor(base))), [
    'bootstrap|AGENTS.md|user|active',
    'bootstrap|CLAUDE.md|user|shadowed',
  ]);
});

test('skills: discovery roots, nested SKILL.md, frontmatter name, shadowing, and skipped files', () => {
  const base = fixture({
    ...GIT,
    'home/.claude/skills/alpha/SKILL.md': skill('alpha', 'global alpha'),
    'home/.agents/skills/beta/SKILL.md': skill('beta', 'b'),
    'home/.config/opencode/skills/gamma/SKILL.md': skill('gamma', 'g'),
    'home/.claude/skills/synced/uuid-1/nested-dir/SKILL.md': skill('nested-one', 'n'),
    'home/.claude/skills/bare/SKILL.md': '# no frontmatter\n',
    'proj/.opencode/skills/delta/SKILL.md': skill('delta', 'd'),
    'proj/.claude/skills/epsilon/SKILL.md': skill('epsilon', 'e'),
    'proj/.claude/skills/alpha/SKILL.md': skill('alpha', 'project alpha'),
    'proj/.opencode/skills/renamed-dir/SKILL.md': skill('renamed', 'r'),
  });
  const r = auditOpencode(ctxFor(base));
  assert.deepEqual(sig(r), [
    'skill|alpha|project|active',
    'skill|alpha|user|shadowed',
    'skill|beta|user|active',
    'skill|delta|project|active',
    'skill|epsilon|project|active',
    'skill|gamma|user|active',
    'skill|nested-one|user|active',
    'skill|renamed|project|active',
  ]);
  assert.ok(r.warnings.some((w) => /"renamed" differs from directory "renamed-dir"/.test(w)));
  assert.ok(r.warnings.some((w) => /no name\/description frontmatter/.test(w)));
});

test('OPENCODE_DISABLE_CLAUDE_CODE_SKILLS disables .claude skill roots only', () => {
  const base = fixture({
    ...GIT,
    'home/.claude/skills/alpha/SKILL.md': skill('alpha', 'a'),
    'home/.agents/skills/beta/SKILL.md': skill('beta', 'b'),
    'proj/.claude/skills/epsilon/SKILL.md': skill('epsilon', 'e'),
  });
  const r = auditOpencode(ctxFor(base, { env: { OPENCODE_DISABLE_CLAUDE_CODE_SKILLS: '1' } }));
  assert.deepEqual(sig(r), [
    'skill|alpha|user|disabled',
    'skill|beta|user|active',
    'skill|epsilon|project|disabled',
  ]);
});

test('built-in customize-opencode skill is attributed to the binary on PATH', () => {
  const base = fixture({ ...GIT, 'bin/opencode': '#!/bin/sh\n' });
  const bin = path.join(base, 'bin', 'opencode');
  const r = auditOpencode(ctxFor(base, { env: { PATH: path.join(base, 'bin') } }));
  const b = r.items.find((i) => i.name === 'customize-opencode');
  assert.equal(b.scope, 'builtin');
  assert.equal(b.status, 'active');
  assert.equal(b.path, fs.realpathSync(bin));
  assert.equal(r.warnings.length, 0);
});

test('instructions globs, remote URLs, missing entries, plugins, hooks, agents, commands', () => {
  const base = fixture({
    ...GIT,
    'proj/opencode.json': JSON.stringify({
      instructions: ['docs/*.md', 'https://example.com/rules.md', 'missing/*.md'],
      plugin: ['local-plugin'],
      agent: { reviewer: { description: 'reviews', prompt: 'SECRET PROMPT' } },
      command: { ship: { description: 'ships', template: 'SECRET TEMPLATE' } },
    }),
    'proj/docs/a.md': 'a',
    'proj/docs/b.md': 'b',
    'proj/docs/c.txt': 'c',
    'proj/.opencode/plugins/hook-one.js': 'export default {}',
    'proj/.opencode/plugins/readme.md': 'not a hook',
    'proj/.opencode/plugin/hook-three.mjs': 'export default {}',
    'home/.config/opencode/plugins/hook-two.ts': 'export default {}',
    'proj/.opencode/agents/planner.md': '---\ndescription: plans\n---\nbody',
    'home/.config/opencode/commands/deploy.md': 'run deploy',
    'proj/.opencode/commands/git/commit.md': 'commit',
  });
  const r = auditOpencode(ctxFor(base));
  assert.deepEqual(sig(r), [
    'agent|planner|project|active',
    'agent|reviewer|project|active',
    'command|deploy|user|active',
    'command|git/commit|project|active',
    'command|ship|project|active',
    'hook|hook-one|project|active',
    'hook|hook-three|project|active',
    'hook|hook-two|user|active',
    'plugin|local-plugin|project|active',
    'rule|docs/a.md|project|active',
    'rule|docs/b.md|project|active',
    'rule|https://example.com/rules.md|remote|unknown',
  ]);
  assert.ok(r.warnings.some((w) => w.includes('missing/*.md')));
  const json = JSON.stringify(r);
  assert.ok(!json.includes('SECRET PROMPT') && !json.includes('SECRET TEMPLATE'));
  const hook = r.items.find((i) => i.name === 'hook-one');
  assert.match(hook.details.note, /runtime/);
});

test('config precedence: global < OPENCODE_CONFIG < project; project wins and disables', () => {
  const base = fixture({
    ...GIT,
    'home/.config/opencode/opencode.json': JSON.stringify({ mcp: { srv: { type: 'local', command: ['a'] } } }),
    'custom.json': JSON.stringify({ mcp: { srv: { type: 'remote', url: 'https://b.example.com/mcp' } } }),
    'proj/opencode.json': JSON.stringify({ mcp: { srv: { type: 'local', command: ['c'], enabled: false } } }),
  });
  const r = auditOpencode(ctxFor(base, { env: { OPENCODE_CONFIG: path.join(base, 'custom.json') } }));
  assert.deepEqual(sig(r), [
    'mcp|srv|project|disabled',
    'mcp|srv|user|shadowed',
    'mcp|srv|user|shadowed',
  ]);
  assert.deepEqual(r.chain.map((c) => c.path), [
    path.join(base, 'home/.config/opencode/opencode.json'),
    path.join(base, 'custom.json'),
    path.join(base, 'proj/opencode.json'),
  ]);
});

test('managed config is read at highest precedence', () => {
  const base = fixture({
    ...GIT,
    'managed/opencode.json': JSON.stringify({ mcp: { m: { type: 'local', command: ['x'] } } }),
  });
  const r = auditOpencode(ctxFor(base, { managedDir: path.join(base, 'managed') }));
  assert.deepEqual(sig(r), ['mcp|m|managed|active']);
  assert.equal(r.chain[0].scope, 'managed');
});

test('unparseable config is skipped with a warning, not thrown', () => {
  const base = fixture({ ...GIT, 'proj/opencode.json': 'not json at all' });
  const r = auditOpencode(ctxFor(base));
  assert.deepEqual(r.items, []);
  assert.ok(r.warnings.some((w) => w.includes('skipped')));
});

test('empty tree yields no items and no crash', () => {
  const base = fixture({ 'proj/readme.txt': 'x' });
  const r = auditOpencode(ctxFor(base));
  assert.deepEqual(sig(r), []);
  assert.equal(r.harness, 'opencode');
});

test('expandGlob: * ** and literal paths', () => {
  const base = fixture({ 'x/a.md': '', 'x/y/b.md': '', 'x/y/z/c.txt': '' });
  assert.deepEqual(expandGlob('x/*.md', base).map((f) => path.relative(base, f)), ['x/a.md']);
  assert.deepEqual(expandGlob('x/**/*.md', base).map((f) => path.relative(base, f)), ['x/a.md', 'x/y/b.md']);
  assert.deepEqual(expandGlob('x/a.md', base).map((f) => path.relative(base, f)), ['x/a.md']);
  assert.deepEqual(expandGlob('x/nope/*.md', base), []);
});
