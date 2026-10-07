import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { liveClaude, claudeSlug } from '../src/live/claude.js';
import { liveCodex } from '../src/live/codex.js';
import { compareLive } from '../src/render/diff.js';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'ca-live-'));
const jl = (recs) => recs.map((r) => JSON.stringify(r)).join('\n') + '\n';
const att = (attachment) => ({ type: 'attachment', attachment });

test('claudeSlug replaces every non-alphanumeric char', () => {
  assert.equal(claudeSlug('/Users/x/.engage-browser'), '-Users-x--engage-browser');
});

test('liveClaude extracts names and paths, applies deltas, redacts', () => {
  const home = tmp();
  const cwd = '/Users/x/Projects/demo';
  const dir = path.join(home, '.claude', 'projects', claudeSlug(cwd));
  fs.mkdirSync(dir, { recursive: true });
  const rec = jl([
    { type: 'user', message: 'SECRET-USER-TEXT' },
    att({ type: 'instructions', files: [
      { path: '/Users/x/.claude/CLAUDE.md', type: 'User', content: 'sk-secret-content' },
      { path: '/Users/x/.claude/RTK.md', type: 'User', content: 'x' },
    ] }),
    att({ type: 'nested_memory', path: '/Users/x/Projects/demo/sub/CLAUDE.md', displayPath: 'sub/CLAUDE.md', content: { path: '/Users/x/Projects/demo/sub/CLAUDE.md', type: 'Project', content: 'c' } }),
    att({ type: 'skill_listing', isInitial: true, skillCount: 3, names: ['a', 'plug:b', 'dream-skill'],
      content: '- a: d\n- plug:b: d\n- dream-skill (dream): d' }),
    att({ type: 'skill_listing', isInitial: false, skillCount: 1, names: ['late'], content: '- late: d' }),
    att({ type: 'mcp_instructions_delta', addedNames: ['claude.ai Gmail', 'plain'], addedBlocks: ['x'], removedNames: [] }),
    att({ type: 'deferred_tools_delta', addedNames: ['WebFetch', 'mcp__srv__t1', 'mcp__srv__t2', 'mcp__claude_ai_Gmail__send'], removedNames: [],
      failedMcpServers: [{ name: 'broken', error: 'Bearer abc' }] }),
    att({ type: 'agent_listing_delta', addedTypes: ['Explore', 'Plan'], removedTypes: ['Plan'] }),
    att({ type: 'hook_success', hookName: 'PreToolUse:Bash', hookEvent: 'PreToolUse', command: 'rtk hook claude', stdout: 'OUT' }),
    att({ type: 'hook_success', hookName: 'PreToolUse:Bash', hookEvent: 'PreToolUse', command: 'rtk hook claude' }),
    att({ type: 'hook_success', hookName: 'SessionStart:startup', hookEvent: 'SessionStart', command: 'API_TOKEN=abc123 run.sh' }),
  ]) + 'not json\n';
  fs.writeFileSync(path.join(dir, 's1.jsonl'), rec);

  const out = liveClaude({ cwd, home, env: {}, sessionId: 's1' });
  assert.equal(out.sessionId, 's1');
  assert.equal(out.source, path.join(dir, 's1.jsonl'));
  const o = out.observed;
  assert.deepEqual(o.bootstrap.map((b) => b.path), [
    '/Users/x/.claude/CLAUDE.md', '/Users/x/.claude/RTK.md', '/Users/x/Projects/demo/sub/CLAUDE.md']);
  assert.equal(o.bootstrap[0].type, 'User');
  assert.equal(o.bootstrap[2].nested, true);
  assert.deepEqual(o.skills, ['a', 'dream-skill', 'late', 'plug:b']);
  assert.deepEqual(o.mcpServers, ['claude_ai_Gmail', 'plain', 'srv']);
  assert.deepEqual(o.mcpFailed, ['broken']);
  assert.deepEqual(o.agents, ['Explore']);
  assert.deepEqual(o.hooks, [
    { event: 'PreToolUse', matcher: 'Bash', command: 'rtk hook claude' },
    { event: 'SessionStart', matcher: 'startup', command: 'API_TOKEN=<redacted> run.sh' },
  ]);
  const dump = JSON.stringify(out);
  for (const leak of ['sk-secret-content', 'SECRET-USER-TEXT', 'abc123', 'OUT']) assert.ok(!dump.includes(leak), leak);
});

test('liveClaude falls back to skill_listing content and picks newest transcript', () => {
  const home = tmp();
  const cwd = '/p/q';
  const dir = path.join(home, '.claude', 'projects', claudeSlug(cwd));
  fs.mkdirSync(dir, { recursive: true });
  const old = path.join(dir, 'old.jsonl');
  const neu = path.join(dir, 'new.jsonl');
  fs.writeFileSync(old, jl([att({ type: 'skill_listing', content: '- zzz: d' })]));
  fs.writeFileSync(neu, jl([att({ type: 'skill_listing', content: '- dir-x (nm): d\n- plug:k: d' })]));
  fs.utimesSync(old, new Date(2020, 0, 1), new Date(2020, 0, 1));
  const out = liveClaude({ cwd, home, env: {}, sessionId: null });
  assert.equal(out.sessionId, 'new');
  assert.deepEqual(out.observed.skills, ['dir-x', 'plug:k']);
});

test('liveClaude returns error when nothing found', () => {
  const home = tmp();
  assert.ok(liveClaude({ cwd: '/nope', home, env: {}, sessionId: null }).error);
  fs.mkdirSync(path.join(home, '.claude', 'projects', claudeSlug('/nope')), { recursive: true });
  assert.ok(liveClaude({ cwd: '/nope', home, env: {}, sessionId: 'missing' }).error);
});

function writeRollout(codexHome, day, _name, id, cwd, extra = []) {
  const dir = path.join(codexHome, 'sessions', ...day.split('-'));
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `rollout-${day}T10-00-00-${id}.jsonl`);
  fs.writeFileSync(file, jl([
    { type: 'session_meta', payload: { id, cwd, base_instructions: { text: 'x'.repeat(100000) } } },
    ...extra,
  ]));
  return file;
}

const skillsMsg = `<skills_instructions>
## Skills
### Skill roots
- \`r0\` = \`/h/.codex/skills\`
- \`r1\` = \`/h/.codex/skills/.system\`
### Available skills
- imagegen: Generate images (file: r1/imagegen/SKILL.md)
- spreadsheets:Sheets: (file: r0/sp/SKILL.md)
- mine: (file: r0/mine/SKILL.md)
</skills_instructions>`;

test('liveCodex finds newest rollout by cwd, parses AGENTS.md, skills, mcp', () => {
  const home = tmp();
  const ch = path.join(home, '.codex');
  const cwd = '/w/proj';
  writeRollout(ch, '2026-01-01', 'a', 'id-old', cwd, [
    { type: 'response_item', payload: { type: 'message', role: 'user', content: [{ type: 'input_text', text: '# AGENTS.md instructions for /old\n\n<INSTRUCTIONS>\nSECRET-BODY' }] } },
  ]);
  writeRollout(ch, '2026-02-01', 'b', 'id-other', '/elsewhere');
  const newest = writeRollout(ch, '2026-03-01', 'c', 'id-new', cwd, [
    { type: 'response_item', payload: { type: 'message', role: 'developer', content: [{ type: 'input_text', text: skillsMsg }] } },
    { type: 'response_item', payload: { type: 'message', role: 'user', content: [{ type: 'input_text', text: '# AGENTS.md instructions for /w/proj\n\n<INSTRUCTIONS>\nSECRET-BODY\n</INSTRUCTIONS>' }] } },
    { type: 'response_item', payload: { type: 'message', role: 'user', content: [{ type: 'input_text', text: 'quoting "# AGENTS.md instructions for /fake" mid-text' }] } },
    { type: 'world_state', payload: { state: { agents_md: { directory: '/w', text: 'SECRET-BODY' } } } },
    { type: 'world_state', payload: { state: { agents_md: {} } } },
    { type: 'response_item', payload: { type: 'function_call', name: 'mcp__notion__search', arguments: '{}' } },
    { type: 'response_item', payload: { type: 'function_call', name: 'exec_command', arguments: '{}' } },
  ]);
  const out = liveCodex({ cwd, home, env: {}, sessionId: null });
  assert.equal(out.source, newest);
  assert.equal(out.sessionId, 'id-new');
  const o = out.observed;
  assert.deepEqual(o.bootstrap.map((b) => b.dir), ['/w', '/w/proj']);
  assert.deepEqual(o.skills, [
    { name: 'imagegen', path: '/h/.codex/skills/.system/imagegen/SKILL.md', realPath: '/h/.codex/skills/.system/imagegen/SKILL.md' },
    { name: 'mine', path: '/h/.codex/skills/mine/SKILL.md', realPath: '/h/.codex/skills/mine/SKILL.md' },
    { name: 'spreadsheets:Sheets', path: '/h/.codex/skills/sp/SKILL.md', realPath: '/h/.codex/skills/sp/SKILL.md' },
  ]);
  assert.deepEqual(o.mcpServers, ['notion']);
  assert.deepEqual(o.hooks, []);
  assert.ok(!JSON.stringify(out).includes('SECRET-BODY'));
});

test('liveCodex by session id, CODEX_HOME override, and error', () => {
  const home = tmp();
  const ch = tmp();
  writeRollout(ch, '2026-01-01', 'a', 'abc-123', '/x');
  const out = liveCodex({ cwd: '/ignored', home, env: { CODEX_HOME: ch }, sessionId: 'abc-123' });
  assert.equal(out.sessionId, 'abc-123');
  assert.equal(out.cwd, '/x');
  assert.ok(liveCodex({ cwd: '/zzz', home, env: { CODEX_HOME: ch }, sessionId: null }).error);
  assert.ok(liveCodex({ cwd: '/x', home, env: {}, sessionId: null }).error);
});

test('compareLive: exact names, commands as skills, hidden skills, builtin and explained classification', () => {
  const dir = tmp();
  const src = path.join(dir, 's.jsonl');
  fs.writeFileSync(src, JSON.stringify({ timestamp: '2026-01-01T00:00:00Z' }) + '\n');
  const changed = path.join(dir, 'late.md'); // mtime is now, i.e. after the 2026-01-01 session start
  fs.writeFileSync(changed, 'x');
  const mk = (kind, name, status, extra = {}) => ({ harness: 'claude', kind, name, scope: extra.scope || 'user', status, path: extra.path || `/x/${name}`, ...extra });
  const h = {
    harness: 'claude',
    items: [
      mk('skill', 'a', 'active', { details: { modelInvocable: true } }),
      mk('skill', 'hidden', 'active', { details: { modelInvocable: false } }),
      mk('command', 'cmd', 'active', { details: { modelInvocable: true } }),
      mk('skill', 'plug-skill', 'active', { scope: 'plugin', plugin: 'pl@m', details: {} }),
      mk('skill', 'late', 'active', { path: changed, details: {} }),
      mk('mcp', 'srv', 'active', { scope: 'plugin', plugin: 'pl@m' }),
      mk('mcp', 'broken', 'active'),
      mk('mcp', 'claude_ai_Gmail', 'unknown', { scope: 'remote' }),
    ],
    live: { source: src, observed: {
      bootstrap: [], hooks: [], mcpFailed: ['broken'],
      skills: ['a', 'cmd', 'pl:plug-skill', 'update-config', 'mystery'],
      mcpServers: ['plugin_pl_srv', 'claude_ai_Docs'],
    } },
  };
  const c = compareLive(h);
  assert.equal(c.skills.matched, 3);
  assert.deepEqual(c.skills.builtinMissing, ['update-config']);
  assert.deepEqual(c.skills.unexplainedMissing, ['mystery']);
  assert.equal(c.skills.hiddenFromListing, 1);
  assert.deepEqual(c.skills.extraExplained.map((e) => [e.name, e.reason]), [['late', 'stale-session']]);
  assert.equal(c.skills.recallFileBacked, 3 / 4);
  assert.equal(c.mcp.matched, 1);
  assert.deepEqual(c.mcp.builtinMissing, ['claude_ai_Docs']);
  assert.deepEqual(c.mcp.extraExplained.map((e) => e.reason).sort(), ['failed-connection', 'remote-unverifiable']);
  // exactness: a short name does not match a namespaced one
  h.live.observed.skills = ['plug-skill'];
  assert.equal(compareLive(h).skills.matched, 0);
});


test('liveCodex recovers every AGENTS.md in the chain from content and uses the latest skills block', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'lc-'));
  const proj = path.join(home, 'proj'); const sub = path.join(proj, 'sub');
  fs.mkdirSync(sub, { recursive: true });
  fs.writeFileSync(path.join(proj, 'AGENTS.md'), '# root\nROOT_TOKEN\n');
  fs.writeFileSync(path.join(sub, 'AGENTS.md'), 'SUB_TOKEN\n');
  const ch = path.join(home, '.codex');
  const skillsBlock = (names) => ({ type: 'response_item', payload: { type: 'message', role: 'developer', content: [{ type: 'input_text', text: `<skills_instructions>\n### Skill roots\n- \`r0\` = \`/h/s\`\n### Available skills\n${names.map((n) => `- ${n}: (file: r0/${n}/SKILL.md)`).join('\n')}\n</skills_instructions>` }] } });
  writeRollout(ch, '2026-10-07', 'x', 'aaa', sub, [
    { type: 'response_item', payload: { type: 'message', role: 'user', content: [{ type: 'input_text', text: `# AGENTS.md instructions for ${sub}\n\n<INSTRUCTIONS>\n# root\nROOT_TOKEN\n\n\nSUB_TOKEN\n</INSTRUCTIONS>` }] } },
    skillsBlock(['old', 'gone']),
    skillsBlock(['new']),
  ]);
  const out = liveCodex({ cwd: sub, home, env: {}, sessionId: null });
  assert.deepEqual(out.observed.bootstrap.map((b) => b.path).sort(), [path.join(proj, 'AGENTS.md'), path.join(sub, 'AGENTS.md')].sort());
  assert.deepEqual(out.observed.skills.map((s) => s.name), ['new']);
});
