import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { auditCodex } from '../src/harness/codex.js';

function w(p, c = '') { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, c); }
function skill(dir, name, extra = '') { w(path.join(dir, name, 'SKILL.md'), `---\nname: ${name}\ndescription: d ${name}\n${extra}---\nbody\n`); }

function fixture(trustLine = 'trust_level = "trusted"') {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'codex-aud-')));
  const home = path.join(root, 'home');
  const ch = path.join(home, '.codex');
  const proj = path.join(root, 'work', 'repo');
  const cwd = path.join(proj, 'pkg', 'sub');
  fs.mkdirSync(path.join(proj, '.git'), { recursive: true });
  fs.mkdirSync(cwd, { recursive: true });
  w(path.join(ch, 'AGENTS.md'), '   \n');
  w(path.join(proj, 'AGENTS.md'), 'root doc\n');
  w(path.join(proj, 'pkg', 'AGENTS.override.md'), 'override\n');
  w(path.join(proj, 'pkg', 'AGENTS.md'), 'plain\n');
  w(path.join(cwd, 'TEAM.md'), 'fallback\n');
  w(path.join(proj, '.codex', 'config.toml'), '[mcp_servers.projsrv]\ncommand = "x"\n');
  w(path.join(proj, '.codex', 'rules', 'p.rules'), 'prefix_rule(pattern=["a"], decision="allow")\nprefix_rule(pattern=["b"], decision="allow")\n');
  skill(path.join(proj, '.agents', 'skills'), 'repo-skill');
  skill(path.join(home, '.agents', 'skills'), 'home-skill');
  skill(path.join(ch, 'skills'), 'legacy-skill');
  skill(path.join(ch, 'skills', '.system'), 'sys-skill');
  skill(path.join(ch, 'skills'), 'off-skill');
  const pdir = path.join(ch, 'plugins', 'cache', 'mk', 'plug', '1.0');
  w(path.join(pdir, '.codex-plugin', 'plugin.json'), JSON.stringify({ name: 'plug', skills: './skills/', mcpServers: './.mcp.json' }));
  skill(path.join(pdir, 'skills'), 'plug-skill');
  w(path.join(pdir, '.mcp.json'), JSON.stringify({ mcpServers: { psrv: { command: 'p', env: { TOKEN: 'sekret' } } } }));
  w(path.join(pdir, 'hooks', 'hooks.json'), JSON.stringify({ hooks: { Stop: [{ hooks: [{ type: 'command', command: 'echo' }] }] } }));
  w(path.join(ch, 'rules', 'default.rules'), 'prefix_rule(pattern=["pm2"], decision="allow")\n');
  w(path.join(ch, 'config.toml'), `
notify = ["/bin/notify", "--x"]
project_doc_fallback_filenames = ["TEAM.md"]
[projects."${proj}"]
${trustLine}
[plugins."plug@mk"]
enabled = true
[plugins."gone@mk"]
enabled = true
[mcp_servers.on]
url = "https://h/x"
bearer_token_env_var = "SECRET_ENV"
[mcp_servers.off]
command = "y"
enabled = false
[mcp_servers.off.env]
API_KEY = "sekret"
[[skills.config]]
path = "${path.join(ch, 'skills', 'off-skill')}/SKILL.md"
enabled = false
[features]
hooks = true
`);
  return { root, home, ch, proj, cwd };
}

const sig = (r) => r.items.map((i) => `${i.kind}|${i.name}|${i.scope}|${i.status}`).sort();

test('full tree, trusted project', () => {
  const f = fixture();
  const r = auditCodex({ cwd: f.cwd, home: f.home, env: {}, systemDir: path.join(f.root, 'etc') });
  assert.equal(r.projectRoot, f.proj);
  assert.deepEqual(sig(r), [
    'bootstrap|AGENTS.md|ancestor|active',        // repo root
    'bootstrap|AGENTS.md|ancestor|shadowed',      // pkg/AGENTS.md shadowed by override
    'bootstrap|AGENTS.md|user|disabled',          // empty global
    'bootstrap|AGENTS.override.md|ancestor|active',
    'bootstrap|TEAM.md|project|active',           // fallback in cwd
    'hook|Stop[*]|plugin|active',
    'hook|notify|user|active',
    'mcp|off|user|disabled',
    'mcp|on|user|active',
    'mcp|projsrv|ancestor|active',
    'mcp|psrv|plugin|active',
    'plugin|gone@mk|plugin|unknown',
    'plugin|plug@mk|plugin|active',
    'rule|default.rules|user|active',
    'rule|p.rules|ancestor|active',
    'skill|home-skill|user|active',
    'skill|legacy-skill|user|active',
    'skill|off-skill|user|disabled',
    'skill|plug:plug-skill|plugin|active',
    'skill|repo-skill|ancestor|active',
    'skill|sys-skill|builtin|active',
  ].sort());
  const docs = r.items.filter((i) => i.kind === 'bootstrap' && i.details.order != null).sort((a, b) => a.details.order - b.details.order);
  assert.deepEqual(docs.map((d) => path.relative(f.proj, d.path)), ['AGENTS.md', path.join('pkg', 'AGENTS.override.md'), path.join('pkg', 'sub', 'TEAM.md')]);
  assert.equal(r.items.find((i) => i.name === 'p.rules').details.count, 2);
  assert.equal(r.items.find((i) => i.name === 'AGENTS.md' && i.scope === 'user').reason, 'empty');
  assert.equal(r.items.find((i) => i.name === 'projsrv').details.trustMatch, 'exact');
  const leak = JSON.stringify(r);
  assert.ok(!leak.includes('sekret') && !leak.includes('SECRET_ENV'));
});

test('untrusted project gates project layer', () => {
  const f = fixture('trust_level = "untrusted"');
  const r = auditCodex({ cwd: f.cwd, home: f.home, env: {}, systemDir: path.join(f.root, 'etc') });
  const proj = r.items.filter((i) => i.path.startsWith(path.join(f.proj, '.codex')));
  assert.deepEqual(proj.map((i) => `${i.kind}|${i.name}|${i.status}`).sort(), ['mcp|projsrv|needs-approval', 'rule|p.rules|needs-approval']);
  assert.equal(proj[0].details.trustMatch, 'exact-untrusted');
  // AGENTS and skills are not trust-gated
  assert.equal(r.items.find((i) => i.name === 'repo-skill').status, 'active');
});

test('ancestor trust, hooks flag off, CODEX_HOME override', () => {
  const f = fixture('trust_level = "untrusted"');
  const ch2 = path.join(f.root, 'ch2');
  fs.cpSync(f.ch, ch2, { recursive: true });
  fs.writeFileSync(path.join(ch2, 'config.toml'),
    `[projects."${path.dirname(f.proj)}"]\ntrust_level = "trusted"\n[plugins."plug@mk"]\nenabled = true\n[features]\ncodex_hooks = false\n`);
  const r = auditCodex({ cwd: f.cwd, home: f.home, env: { CODEX_HOME: ch2 }, systemDir: path.join(f.root, 'etc') });
  assert.equal(r.items.find((i) => i.name === 'projsrv').details.trustMatch, 'ancestor');
  assert.equal(r.items.find((i) => i.name === 'projsrv').status, 'active');
  const hook = r.items.find((i) => i.kind === 'hook');
  assert.equal(hook.status, 'disabled');
  assert.match(hook.reason, /hooks = false/);
  assert.ok(r.items.some((i) => i.name === 'legacy-skill' && i.path.startsWith(ch2)));
});

test('no git root: only cwd; max bytes truncation', () => {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'codex-aud-')));
  const home = path.join(root, 'home'); const cwd = path.join(root, 'a', 'b');
  w(path.join(root, 'a', 'AGENTS.md'), 'parent');
  w(path.join(cwd, 'AGENTS.md'), 'x'.repeat(100));
  w(path.join(home, '.codex', 'config.toml'), 'project_doc_max_bytes = 40\n');
  const r = auditCodex({ cwd, home, env: {}, systemDir: path.join(root, 'etc') });
  assert.equal(r.projectRoot, null);
  assert.deepEqual(sig(r), ['bootstrap|AGENTS.md|project|active']);
  assert.equal(r.items[0].details.truncated, true);
  assert.equal(r.items[0].details.included, 40);
});

test('multiple plugin versions pick newest mtime', () => {
  const f = fixture();
  const base = path.join(f.ch, 'plugins', 'cache', 'mk', 'plug');
  fs.mkdirSync(path.join(base, '0.9'), { recursive: true });
  const old = new Date(2020, 1, 1); fs.utimesSync(path.join(base, '0.9'), old, old);
  const r = auditCodex({ cwd: f.cwd, home: f.home, env: {}, systemDir: path.join(f.root, 'etc') });
  const p = r.items.find((i) => i.kind === 'plugin' && i.name === 'plug@mk');
  assert.equal(p.details.version, '1.0');
  assert.deepEqual(p.details.versions.sort(), ['0.9', '1.0']);
  assert.match(p.details.note, /newest by mtime/);
});

test('launch: -c overrides and --profile', () => {
  const f = fixture();
  fs.writeFileSync(path.join(f.ch, 'work.config.toml'), '[mcp_servers.profsrv]\ncommand = "p"\n[features]\nhooks = false\n');
  const launch = {
    profile: ['work'],
    configOverrides: ['mcp_servers.on.enabled=false', 'mcp_servers.cli.url="https://c/x"', 'features.hooks=true'],
    addDirs: [],
  };
  const r = auditCodex({ cwd: f.cwd, home: f.home, env: {}, systemDir: path.join(f.root, 'etc'), launch });
  const m = (n) => r.items.find((i) => i.kind === 'mcp' && i.name === n);
  assert.equal(m('profsrv').status, 'active');
  assert.equal(m('profsrv').path, path.join(f.ch, 'work.config.toml'));
  assert.equal(m('on').status, 'shadowed');
  const onLocal = r.items.find((i) => i.kind === 'mcp' && i.name === 'on' && i.scope === 'local');
  assert.equal(onLocal.status, 'disabled');
  assert.equal(onLocal.details.via, '-c');
  assert.equal(onLocal.details.url, 'https://h/x'); // merged onto the user-layer definition
  assert.equal(m('cli').scope, 'local');
  // -c features.hooks=true beats profile hooks=false
  assert.equal(r.items.find((i) => i.kind === 'hook' && i.name === 'Stop[*]').status, 'active');
  assert.ok(r.chain.some((c) => c.layer === 'profile') && r.chain.some((c) => c.layer === 'cli'));
  const r2 = auditCodex({ cwd: f.cwd, home: f.home, env: {}, systemDir: path.join(f.root, 'etc'), launch: { profile: ['work'] } });
  assert.equal(r2.items.find((i) => i.kind === 'hook' && i.name === 'Stop[*]').status, 'disabled');
});

test('skill listing: model-invocation-disabled omitted, sorted by name then real path, budget cut', () => {
  const f = fixture();
  skill(path.join(f.ch, 'skills'), 'quiet', 'disable-model-invocation: true\n');
  skill(path.join(f.ch, 'skills'), 'zeta');
  skill(path.join(f.ch, 'skills'), 'Alpha');
  const base = { cwd: f.cwd, home: f.home, env: {}, systemDir: path.join(f.root, 'etc') };
  const r = auditCodex(base);
  const st = (n) => r.items.find((i) => i.kind === 'skill' && i.name === n).status;
  assert.equal(st('quiet'), 'conditional');
  assert.equal(st('zeta'), 'active');
  // builtin first, then case-insensitive name order: the first non-builtin entries are Alpha, home-skill...
  const r2 = auditCodex({ ...base, skillBudget: 80 });
  const listed = r2.items.filter((i) => i.kind === 'skill' && i.status === 'active').map((i) => i.name);
  assert.equal(listed[0], 'sys-skill');
  assert.equal(listed[1], 'Alpha');
  const dropped = r2.items.filter((i) => i.kind === 'skill' && i.status === 'shadowed');
  assert.ok(dropped.length > 0 && dropped.every((d) => d.details.reason === 'skill-list-budget'));
  assert.ok(dropped.some((d) => d.name === 'zeta'));
  assert.equal(st('off-skill'), 'disabled');
});

test('remote-installed plugin (marker file) is active without config entry; mcp_tool hook fields', () => {
  const f = fixture();
  const rp = path.join(f.ch, 'plugins', 'cache', 'rem', 'rplug', '2.0');
  w(path.join(rp, '.codex-plugin', 'plugin.json'), JSON.stringify({ name: 'rplug', skills: './skills/',
    hooks: { hooks: { Stop: [{ hooks: [{ type: 'mcp_tool', server: 'srv', tool: 'done' }] }] } } }));
  skill(path.join(rp, 'skills'), 'rskill');
  w(path.join(f.ch, 'plugins', 'cache', 'rem', 'rplug', '.codex-remote-plugin-install.json'), '{"schema_version":1,"remote_plugin_id":"x"}');
  const r = auditCodex({ cwd: f.cwd, home: f.home, env: {}, systemDir: path.join(f.root, 'etc') });
  const pl = r.items.find((i) => i.kind === 'plugin' && i.name === 'rplug@rem');
  assert.equal(pl.status, 'active');
  assert.equal(pl.details.remoteInstalled, true);
  assert.ok(r.items.some((i) => i.kind === 'skill' && i.name === 'rplug:rskill' && i.status === 'active'));
  const h = r.items.find((i) => i.kind === 'hook' && i.plugin === 'rplug@rem');
  assert.deepEqual([h.details.type, h.details.server, h.details.tool], ['mcp_tool', 'srv', 'done']);
});

test('skill listing window band: unknown between default and catalog max, shadowed beyond; pinned window is exact', () => {
  const f = fixture();
  fs.writeFileSync(path.join(f.ch, 'models_cache.json'), JSON.stringify({ models: [{ slug: 'm1', context_window: 1000, max_context_window: 2000 }] }));
  const sk = path.join(f.ch, 'skills');
  for (let i = 0; i < 60; i++) skill(sk, `bulk-${String(i).padStart(2, '0')}-padding-padding-padding`);
  const pre = (dir, line) => { const c = path.join(dir, 'config.toml'); fs.writeFileSync(c, line + '\n' + fs.readFileSync(c, 'utf8')); };
  const run = (line) => {
    pre(f.ch, line);
    return auditCodex({ cwd: f.cwd, home: f.home, env: {}, systemDir: path.join(f.root, 'etc') });
  };
  // window 1000 -> ~0 chars after overhead, 2000 -> still tiny: fixture skills all land past both cuts or in the band
  const r = run('model = "m1"');
  const st = (x) => r.items.filter((i) => i.kind === 'skill').map((i) => i.status);
  assert.ok(st().includes('shadowed'));
  assert.ok(!st().includes('unknown'), 'both budgets are <= 0 here, so nothing is in the band');
  const f2 = fixture();
  fs.writeFileSync(path.join(f2.ch, 'models_cache.json'), JSON.stringify({ models: [{ slug: 'm1', context_window: 20000, max_context_window: 40000 }] }));
  for (let i = 0; i < 80; i++) skill(path.join(f2.ch, 'skills'), `bulk-${String(i).padStart(2, '0')}-padding-padding-padding`);
  pre(f2.ch, 'model = "m1"');
  const r2 = auditCodex({ cwd: f2.cwd, home: f2.home, env: {}, systemDir: path.join(f2.root, 'etc') });
  const c = (s) => r2.items.filter((i) => i.kind === 'skill' && i.status === s).length;
  assert.ok(c('active') > 0 && c('unknown') > 0, `band expected: ${c('active')} active, ${c('unknown')} unknown`);
  const u = r2.items.find((i) => i.status === 'unknown' && i.kind === 'skill');
  assert.equal(u.details.reason, 'skill-list-budget-uncertain');
  pre(f2.ch, 'model_context_window = 40000');
  const r3 = auditCodex({ cwd: f2.cwd, home: f2.home, env: {}, systemDir: path.join(f2.root, 'etc') });
  assert.equal(r3.items.filter((i) => i.status === 'unknown' && i.kind === 'skill').length, 0);
});

test('plugin .mcp.json is only loaded when the manifest names it', () => {
  const f = fixture();
  const pd = path.join(f.ch, 'plugins', 'cache', 'mk', 'bare', '1');
  w(path.join(pd, '.codex-plugin', 'plugin.json'), JSON.stringify({ name: 'bare' }));
  w(path.join(pd, '.mcp.json'), JSON.stringify({ mcpServers: { ghost: { url: 'https://x' } } }));
  fs.appendFileSync(path.join(f.ch, 'config.toml'), '\n[plugins."bare@mk"]\nenabled = true\n');
  const r = auditCodex({ cwd: f.cwd, home: f.home, env: {}, systemDir: path.join(f.root, 'etc') });
  assert.ok(!r.items.some((i) => i.kind === 'mcp' && i.name === 'ghost'));
  assert.ok(r.items.some((i) => i.kind === 'mcp' && i.name === 'psrv' && i.plugin === 'plug@mk'));
});
