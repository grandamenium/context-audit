import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { auditClaude } from '../src/harness/claude.js';

function mk() {
  const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ca-claude-')));
  const home = path.join(base, 'home');
  const managed = path.join(base, 'managed');
  const proj = path.join(home, 'work', 'proj');
  const cwd = path.join(proj, 'pkg');
  fs.mkdirSync(path.join(proj, '.git'), { recursive: true });
  fs.mkdirSync(cwd, { recursive: true });
  fs.mkdirSync(path.join(home, '.claude'), { recursive: true });
  fs.mkdirSync(managed, { recursive: true });
  const w = (p, c) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, typeof c === 'string' ? c : JSON.stringify(c)); return p; };
  const run = (launch) => auditClaude({ cwd, home, env: {}, platform: 'linux', managedDir: managed, launch });
  return { base, home, managed, proj, cwd, w, run };
}
const tuples = (r, kind) => r.items.filter((i) => i.kind === kind).map((i) => [i.name, i.scope, i.status].join('|')).sort();

test('ancestor walking, local, rules, AGENTS fallback', () => {
  const t = mk();
  t.w(path.join(t.managed, 'CLAUDE.md'), 'm');
  t.w(path.join(t.home, '.claude', 'CLAUDE.md'), 'u');
  t.w(path.join(t.home, '.claude', 'rules', 'a.md'), 'r');
  t.w(path.join(t.home, 'CLAUDE.md'), 'home-level');
  t.w(path.join(t.proj, 'CLAUDE.md'), 'p');
  t.w(path.join(t.proj, 'CLAUDE.local.md'), 'l');
  t.w(path.join(t.cwd, '.claude', 'CLAUDE.md'), 'c');
  t.w(path.join(t.proj, '.claude', 'rules', 'x', 'always.md'), 'a');
  t.w(path.join(t.proj, '.claude', 'rules', 'scoped.md'), '---\npaths:\n  - "src/**"\n---\nz');
  t.w(path.join(t.proj, 'AGENTS.md'), 'ag');
  const r = t.run();
  assert.equal(r.projectRoot, t.proj);
  assert.deepEqual(r.chain[r.chain.length - 1], t.cwd);
  assert.equal(r.chain[0], '/');
  assert.deepEqual(tuples(r, 'bootstrap'), [
    'AGENTS.md|project|shadowed', 'CLAUDE.local.md|local|active', 'CLAUDE.md|ancestor|active',
    'CLAUDE.md|managed|active', 'CLAUDE.md|project|active', 'CLAUDE.md|project|active', 'CLAUDE.md|user|active',
  ].sort());
  const rules = tuples(r, 'rule');
  assert.deepEqual(rules, ['a.md|user|active', 'scoped.md|project|conditional', 'x/always.md|project|active']);
  const orders = r.items.filter((i) => i.kind === 'bootstrap' && i.details.order).sort((a, b) => a.details.order - b.details.order);
  assert.equal(orders[0].scope, 'managed');
  assert.ok(orders.every((i) => i.details.bytes > 0));
  const h = r.items.find((i) => i.name === 'CLAUDE.md' && i.scope === 'ancestor');
  assert.equal(h.path, path.join(t.home, 'CLAUDE.md'));
});

test('AGENTS.md active when no CLAUDE.md', () => {
  const t = mk();
  t.w(path.join(t.proj, 'AGENTS.md'), 'ag');
  assert.deepEqual(tuples(t.run(), 'bootstrap'), ['AGENTS.md|project|active']);
});

test('imports: recursive, hop limit, code skipped, external approval', () => {
  const t = mk();
  t.w(path.join(t.proj, 'CLAUDE.md'), 'see @a.md\n`@ignored.md`\n```\n@fenced.md\n```\nmail me@x.com @/nonexistent');
  for (const f of ['ignored', 'fenced']) t.w(path.join(t.proj, `${f}.md`), 'x');
  t.w(path.join(t.proj, 'a.md'), '@b.md');
  t.w(path.join(t.proj, 'b.md'), '@c.md');
  t.w(path.join(t.proj, 'c.md'), '@d.md');
  t.w(path.join(t.proj, 'd.md'), '@e.md');
  t.w(path.join(t.proj, 'e.md'), '@f.md');
  t.w(path.join(t.proj, 'f.md'), 'too deep');
  const r = t.run();
  const imps = r.items.filter((i) => i.details?.importedBy);
  assert.deepEqual(imps.map((i) => i.name).sort(), ['@a.md', '@b.md', '@c.md', '@d.md']);
  assert.equal(imps.find((i) => i.name === '@b.md').details.importedBy, path.join(t.proj, 'a.md'));
  // proj (git root) is above cwd, so these are outside cwd: external and unapproved
  assert.ok(imps.every((i) => i.status === 'needs-approval'));
  t.w(path.join(t.home, '.claude.json'), { projects: { [t.proj]: { hasClaudeMdExternalIncludesApproved: true } } });
  assert.ok(t.run().items.filter((i) => i.details?.importedBy).every((i) => i.status === 'active'));
});

test('claudeMdExcludes disables matching file', () => {
  const t = mk();
  t.w(path.join(t.home, 'CLAUDE.md'), 'x');
  t.w(path.join(t.home, '.claude', 'settings.json'), { claudeMdExcludes: [path.join(t.home, 'CLAUDE.md')] });
  const r = t.run();
  assert.deepEqual(tuples(r, 'bootstrap'), ['CLAUDE.md|ancestor|disabled']);
});

function plugin(t, name, files) {
  const root = path.join(t.home, '.claude', 'plugins', 'cache', 'mk', name, 'v1');
  for (const [f, c] of Object.entries(files)) t.w(path.join(root, f), c);
  return root;
}

test('plugins enable/disable, plugin hooks/skills/mcp, project-scope install', () => {
  const t = mk();
  const mkPlug = (n) => plugin(t, n, {
    '.claude-plugin/plugin.json': { name: n },
    'skills/s1/SKILL.md': '---\nname: s1\ndescription: d\n---\nbody',
    'commands/c1.md': 'cmd',
    'agents/ag.md': 'agent',
    'hooks/hooks.json': { hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'echo' }] }] } },
    '.mcp.json': { mcpServers: { srv: { command: 'node', env: { SECRET_TOKEN: 'sekrit' } } } },
  });
  const on = mkPlug('on'); const off = mkPlug('off'); const other = mkPlug('other');
  t.w(path.join(t.home, '.claude', 'plugins', 'installed_plugins.json'), { version: 2, plugins: {
    'on@mk': [{ scope: 'user', installPath: on }],
    'off@mk': [{ scope: 'user', installPath: off }],
    'other@mk': [{ scope: 'project', projectPath: '/somewhere/else', installPath: other }],
  } });
  t.w(path.join(t.home, '.claude', 'settings.json'), { enabledPlugins: { 'on@mk': true, 'off@mk': true } });
  t.w(path.join(t.cwd, '.claude', 'settings.local.json'), { enabledPlugins: { 'off@mk': false } });
  const r = t.run();
  assert.deepEqual(tuples(r, 'plugin'), ['off@mk|user|disabled', 'on@mk|user|active']);
  assert.deepEqual(tuples(r, 'skill'), ['on:s1|plugin|active']);
  assert.deepEqual(tuples(r, 'command'), ['on:c1|plugin|active']);
  assert.deepEqual(tuples(r, 'agent'), ['on:ag|plugin|active']);
  assert.deepEqual(tuples(r, 'hook'), ['PreToolUse:Bash|plugin|active']);
  const mcp = r.items.find((i) => i.kind === 'mcp');
  assert.equal(mcp.details.toolPrefix, 'mcp__plugin_on_srv__');
  assert.ok(!JSON.stringify(r).includes('sekrit'));
});

test('hooks from settings, disableAllHooks, dedupe', () => {
  const t = mk();
  const hk = { hooks: { Stop: [{ hooks: [{ type: 'command', command: 'x' }] }] } };
  t.w(path.join(t.home, '.claude', 'settings.json'), hk);
  t.w(path.join(t.cwd, '.claude', 'settings.json'), hk);
  assert.deepEqual(tuples(t.run(), 'hook'), ['Stop:*|project|shadowed', 'Stop:*|user|active']);
  t.w(path.join(t.cwd, '.claude', 'settings.local.json'), { disableAllHooks: true });
  assert.ok(t.run().items.filter((i) => i.kind === 'hook').every((i) => i.status === 'disabled' || i.status === 'shadowed'));
});

test('--settings layer hooks', () => {
  const t = mk();
  const f = t.w(path.join(t.base, 'agent', 'settings.json'), { hooks: { SessionStart: [{ hooks: [{ type: 'command', command: 'a' }] }], PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'b' }] }] } });
  const r = t.run({ settings: [{ path: f }, { inline: { hooks: { Stop: [{ hooks: [{ type: 'command', command: 'c' }] }] } } }] });
  assert.deepEqual(tuples(r, 'hook'), ['PreToolUse:Bash|local|active', 'SessionStart:*|local|active', 'Stop:*|local|active']);
  assert.ok(r.items.filter((i) => i.kind === 'hook').every((i) => i.details.via === '--settings'));
  assert.equal(r.items.find((i) => i.name === 'SessionStart:*').path, f);
});

test('mcp: approval states, local, user, settings.json servers ignored', () => {
  const t = mk();
  t.w(path.join(t.proj, '.mcp.json'), { mcpServers: { undecided: { command: 'a' }, yes: { command: 'b' }, no: { command: 'c' } } });
  t.w(path.join(t.home, '.claude.json'), {
    hasX: 1,
    projects: { [t.proj]: { hasTrustDialogAccepted: true, mcpServers: { loc: { type: 'http', url: 'https://x.test/mcp?token=abc' } } } },
    mcpServers: { usr: { type: 'http', url: 'https://u.test', headers: { Authorization: 'Bearer zzz' } } },
  });
  t.w(path.join(t.cwd, '.claude', 'settings.json'), { enabledMcpjsonServers: ['yes'], disabledMcpjsonServers: ['no'] });
  t.w(path.join(t.home, '.claude', 'settings.json'), { mcpServers: { odd: { command: 'q' } } });
  const r = t.run();
  assert.deepEqual(tuples(r, 'mcp'), [
    'loc|local|active', 'no|project|disabled', 'odd|user|disabled', 'undecided|project|needs-approval', 'usr|user|active', 'yes|project|active',
  ]);
  const s = JSON.stringify(r);
  assert.ok(!s.includes('zzz') && !s.includes('abc'));
  // enableAll from user settings
  t.w(path.join(t.home, '.claude', 'settings.json'), { enableAllProjectMcpServers: true });
  assert.equal(t.run().items.find((i) => i.name === 'undecided').status, 'active');
});

test('mcp: untrusted folder ignores committed project approvals', () => {
  const t = mk();
  t.w(path.join(t.proj, '.mcp.json'), { mcpServers: { yes: { command: 'b' } } });
  t.w(path.join(t.cwd, '.claude', 'settings.json'), { enableAllProjectMcpServers: true });
  assert.equal(t.run().items.find((i) => i.name === 'yes').status, 'needs-approval');
});

test('mcp: shadowing by precedence and managed-mcp.json', () => {
  const t = mk();
  t.w(path.join(t.managed, 'managed-mcp.json'), { mcpServers: { dup: { command: 'm' } } });
  t.w(path.join(t.home, '.claude.json'), {
    projects: { [t.proj]: { hasTrustDialogAccepted: true, mcpServers: { dup2: { command: 'l' } } } },
    mcpServers: { dup: { command: 'u' }, dup2: { command: 'u' } },
  });
  const r = t.run();
  assert.deepEqual(tuples(r, 'mcp'), ['dup2|local|active', 'dup2|user|shadowed', 'dup|managed|active', 'dup|user|shadowed']);
});

test('--mcp-config and --strict-mcp-config', () => {
  const t = mk();
  t.w(path.join(t.home, '.claude.json'), { mcpServers: { usr: { command: 'u' } } });
  const f = t.w(path.join(t.base, 'm.json'), { mcpServers: { cli: { command: 'c' } } });
  assert.deepEqual(tuples(t.run({ mcpConfig: [{ path: f }] }), 'mcp'), ['cli|local|active', 'usr|user|active']);
  const r = t.run({ mcpConfig: [{ path: f }], strictMcpConfig: true });
  assert.deepEqual(tuples(r, 'mcp'), ['cli|local|active', 'usr|user|disabled']);
  assert.equal(r.items.find((i) => i.name === 'usr').reason, '--strict-mcp-config');
});

test('skills/commands/agents: walk to git root, frontmatter name, shadowing', () => {
  const t = mk();
  t.w(path.join(t.home, '.claude', 'skills', 'dup', 'SKILL.md'), '---\nname: dup\n---\n');
  t.w(path.join(t.proj, '.claude', 'skills', 'dup', 'SKILL.md'), '---\nname: dup\n---\n');
  t.w(path.join(t.proj, '.claude', 'skills', 'dirname', 'SKILL.md'), '---\nname: custom\ndescription: hi\n---\n');
  t.w(path.join(t.cwd, '.claude', 'skills', 'nofm', 'SKILL.md'), 'plain');
  t.w(path.join(t.home, '.claude', 'skills', 'above', 'SKILL.md'), 'x');
  t.w(path.join(t.home, 'work', '.claude', 'skills', 'outside-root', 'SKILL.md'), 'x');
  t.w(path.join(t.proj, '.claude', 'commands', 'dup.md'), 'c');
  t.w(path.join(t.proj, '.claude', 'commands', 'ns', 'sub.md'), 'c');
  t.w(path.join(t.home, '.claude', 'agents', 'a.md'), '---\nname: a\n---\n');
  t.w(path.join(t.proj, '.claude', 'agents', 'a.md'), '---\nname: a\n---\n');
  const r = t.run();
  assert.deepEqual(tuples(r, 'skill'), [
    'above|user|active', 'dirname|project|active', 'dup|project|shadowed', 'dup|user|active', 'nofm|project|active',
  ]);
  assert.deepEqual(tuples(r, 'command'), ['dup|project|shadowed', 'ns:sub|project|active']);
  assert.deepEqual(tuples(r, 'agent'), ['a|project|active', 'a|user|shadowed']);
});

test('--plugin-dir, --add-dir, prompt files', () => {
  const t = mk();
  const pd = path.join(t.base, 'devplug');
  t.w(path.join(pd, 'skills', 'k', 'SKILL.md'), 'x');
  const ad = path.join(t.base, 'extra');
  t.w(path.join(ad, 'CLAUDE.md'), 'e');
  t.w(path.join(ad, '.claude', 'skills', 'es', 'SKILL.md'), 'x');
  const pf = t.w(path.join(t.base, 'p.txt'), 'prompt');
  const r = t.run({ pluginDirs: [{ path: pd }], addDirs: [{ path: ad }], appendSystemPromptFiles: [{ path: pf }] });
  assert.deepEqual(tuples(r, 'plugin'), ['devplug@inline|local|active']);
  assert.deepEqual(tuples(r, 'skill'), ['devplug:k|plugin|active', 'es|project|active']);
  assert.deepEqual(tuples(r, 'bootstrap'), ['CLAUDE.md|project|active', 'p.txt|local|active']);
});

test('items have unique ids and valid shape', () => {
  const t = mk();
  t.w(path.join(t.home, '.claude', 'settings.json'), { hooks: { Stop: [{ hooks: [{ type: 'command', command: 'a' }, { type: 'command', command: 'b' }] }] } });
  const r = t.run();
  const ids = r.items.map((i) => i.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(r.items.every((i) => i.harness === 'claude' && path.isAbsolute(i.path) || i.path.startsWith('inline:')));
});

test('skill name is the directory name, frontmatter name is an alias; disable-model-invocation flagged', () => {
  const t = mk();
  t.w(path.join(t.home, '.claude', 'skills', 'taste-skill', 'SKILL.md'), '---\nname: design-taste-frontend\n---\n');
  t.w(path.join(t.home, '.claude', 'skills', 'hidden', 'SKILL.md'), '---\ndisable-model-invocation: true\n---\n');
  t.w(path.join(t.home, '.claude', 'commands', 'quiet.md'), '---\ndescription: d\n---\n');
  const r = t.run();
  const by = (n) => r.items.find((i) => i.name === n);
  assert.equal(by('taste-skill').details.alias, 'design-taste-frontend');
  assert.equal(by('taste-skill').details.modelInvocable, true);
  assert.equal(by('hidden').details.modelInvocable, false);
  assert.equal(by('hidden').status, 'active');
  assert.equal(by('quiet').kind, 'command');
});

test('synced anthropic-skills and marketplace entry skills restriction', () => {
  const t = mk();
  t.w(path.join(t.home, '.claude', 'skills', 'synced', 'bucket-1', 'docs', 'SKILL.md'), 'x');
  t.w(path.join(t.home, '.claude', 'skills', 'synced', 'bucket-1', 'manifest.json'), '{}');
  // one repo dir shared by two plugins; the marketplace entry picks the skill dir
  const root = plugin(t, 'a', { 'skills/one/SKILL.md': 'x', 'skills/two/SKILL.md': 'x' });
  const mkt = path.join(t.home, '.claude', 'plugins', 'marketplaces', 'mk');
  t.w(path.join(mkt, '.claude-plugin', 'marketplace.json'), { plugins: [
    { name: 'a', source: './', strict: false, skills: ['./skills/one'] },
    { name: 'b', source: './', strict: false, skills: ['./skills/two'] },
  ] });
  t.w(path.join(t.home, '.claude', 'plugins', 'known_marketplaces.json'), { mk: { installLocation: mkt } });
  t.w(path.join(t.home, '.claude', 'plugins', 'installed_plugins.json'), { version: 2, plugins: {
    'a@mk': [{ scope: 'user', installPath: root }], 'b@mk': [{ scope: 'user', installPath: root }] } });
  t.w(path.join(t.home, '.claude', 'settings.json'), { enabledPlugins: { 'a@mk': true, 'b@mk': true } });
  assert.deepEqual(tuples(t.run(), 'skill'), ['a:one|plugin|active', 'anthropic-skills:docs|user|active', 'b:two|plugin|active']);
});

test('bootstrap: empty files skipped, user CLAUDE.md does not block AGENTS.md, auto memory, unreadable', () => {
  const t = mk();
  t.w(path.join(t.home, '.claude', 'CLAUDE.md'), 'user');
  t.w(path.join(t.proj, '.claude', 'CLAUDE.md'), '');
  t.w(path.join(t.proj, 'AGENTS.md'), 'agents');
  t.w(path.join(t.home, '.claude', 'projects', t.proj.replace(/[^a-zA-Z0-9]/g, '-'), 'memory', 'MEMORY.md'), 'mem');
  const r = t.run();
  assert.deepEqual(tuples(r, 'bootstrap'), ['AGENTS.md|project|active', 'CLAUDE.md|user|active', 'MEMORY.md|user|active']);
  assert.ok(r.items.find((i) => i.name === 'MEMORY.md').details.autoMemory);
});

test('cwd-level .claude/settings.json hooks and .mcp.json below the git root are read', () => {
  const t = mk();
  t.w(path.join(t.cwd, '.claude', 'settings.json'), { hooks: { Stop: [{ hooks: [{ type: 'command', command: 'z' }] }] } });
  t.w(path.join(t.cwd, '.mcp.json'), { mcpServers: { deep: { command: 'q' } } });
  t.w(path.join(t.home, '.claude', 'settings.json'), { enableAllProjectMcpServers: true });
  const r = t.run();
  assert.deepEqual(tuples(r, 'hook'), ['Stop:*|project|active']);
  assert.deepEqual(tuples(r, 'mcp'), ['deep|project|active']);
});

test('claude.ai connectors and chrome are reported as unknown/remote; plugin mcp is not name-shadowed', () => {
  const t = mk();
  t.w(path.join(t.home, '.claude.json'), { claudeAiMcpEverConnected: ['claude.ai Gmail'], hasCompletedClaudeInChromeOnboarding: true });
  const root = plugin(t, 'p', { '.mcp.json': { mcpServers: { s: { type: 'http', url: 'https://x.test/mcp?ref=1' } } } });
  t.w(path.join(t.proj, '.mcp.json'), { mcpServers: { s: { type: 'http', url: 'https://x.test/mcp?ref=2' } } });
  t.w(path.join(t.home, '.claude', 'plugins', 'installed_plugins.json'), { version: 2, plugins: { 'p@mk': [{ scope: 'user', installPath: root }] } });
  t.w(path.join(t.home, '.claude', 'settings.json'), { enabledPlugins: { 'p@mk': true }, enableAllProjectMcpServers: true });
  assert.deepEqual(tuples(t.run(), 'mcp'), ['claude-in-chrome|builtin|active', 'claude_ai_Gmail|remote|unknown', 's|plugin|active', 's|project|active']);
});

test('stale mcp approvals are reported disabled; git-root settings are not read from a subdir cwd', () => {
  const t = mk();
  t.w(path.join(t.home, '.claude.json'), { projects: { [t.cwd]: { enabledMcpjsonServers: ['ghost'] } } });
  t.w(path.join(t.proj, '.claude', 'settings.json'), { hooks: { Stop: [{ hooks: [{ type: 'command', command: 'root-only' }] }] } });
  const r = t.run();
  assert.deepEqual(tuples(r, 'mcp'), ['ghost|project|disabled']);
  assert.deepEqual(tuples(r, 'hook'), []);
});
