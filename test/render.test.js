import test from 'node:test';
import assert from 'node:assert/strict';
import { renderTree } from '../src/render/tree.js';
import { renderHtml } from '../src/render/html.js';
import { compareLive } from '../src/render/diff.js';

const home = '/Users/tester';
const cwd = `${home}/proj/app`;
const mk = (kind, name, scope, status, path, extra = {}) => ({
  id: `claude:${kind}:${scope}:${name}@${path}`, harness: 'claude', kind, name, scope, status, path, ...extra,
});

function sample() {
  const items = [
    mk('bootstrap', 'CLAUDE.md', 'user', 'active', `${home}/.claude/CLAUDE.md`, { details: { bytes: 2048, order: 1, depth: 0 } }),
    mk('bootstrap', 'RTK.md', 'user', 'active', `${home}/.claude/RTK.md`, { details: { bytes: 300, order: 2, depth: 1 } }),
    mk('bootstrap', 'CLAUDE.md', 'project', 'active', `${cwd}/CLAUDE.md`, { details: { bytes: 900, order: 3, depth: 0 } }),
    mk('skill', 'deploy', 'project', 'active', `${cwd}/.claude/skills/deploy/SKILL.md`),
    mk('skill', 'review', 'plugin', 'active', `${home}/.claude/plugins/x/skills/review/SKILL.md`, { plugin: 'x@mkt' }),
    mk('skill', 'old', 'user', 'shadowed', `${home}/.claude/skills/old/SKILL.md`, { reason: 'shadowed by project skill' }),
    mk('mcp', 'github', 'plugin', 'active', `${home}/.claude/plugins/x/.mcp.json`, { plugin: 'x@mkt', details: { env: { TOKEN: '<redacted>' } } }),
    mk('mcp', 'linear', 'user', 'disabled', `${home}/.claude.json`, { reason: 'disabled in settings' }),
    mk('hook', 'PreToolUse:Bash', 'managed', 'active', '/Library/Application Support/ClaudeCode/managed-settings.json'),
  ];
  return {
    schemaVersion: 1, generatedAt: '2026-01-01T00:00:00Z', cwd, home, platform: 'darwin',
    session: { harness: 'claude', pid: 123 },
    harnesses: {
      claude: {
        items, chain: [home, `${home}/proj`, cwd], warnings: [],
        live: { source: `${home}/.claude/projects/x.jsonl`, observed: {
          bootstrap: [{ path: `${home}/.claude/CLAUDE.md` }, { path: `${cwd}/CLAUDE.md` }, { path: `${cwd}/EXTRA.md` }],
          skills: ['deploy', 'x:review', 'builtin-thing'],
          mcpServers: ['plugin_x_github', 'claude.ai Gmail'],
          hooks: [],
        } },
      },
    },
  };
}

test('compareLive normalizes names and computes metrics', () => {
  const c = compareLive(sample().harnesses.claude);
  assert.equal(c.skills.matched, 2);
  assert.deepEqual(c.skills.missing, ['builtin-thing']);
  assert.equal(c.mcp.matched, 1);
  assert.deepEqual(c.mcp.missing, ['claude.ai Gmail']);
  assert.equal(c.bootstrap.matched, 2);
  assert.deepEqual(c.bootstrap.extra, [`${home}/.claude/RTK.md`]);
  assert.ok(Math.abs(c.bootstrap.precision - 2 / 3) < 1e-9);
  assert.equal(c.bootstrap.recall, 2 / 3);
  assert.equal(compareLive({ items: [] }), null);
});

test('tree renders key strings, hides disabled/shadowed by default', () => {
  const r = sample();
  const out = renderTree(r, { color: false });
  for (const s of ['== claude ==', 'Bootstrap docs (3)', 'Skills (2)', '[plugin]', '~/.claude/CLAUDE.md', '2.0 KB', 'Live vs predicted', 'precision 67%', 'disabled 1, shadowed 1']) {
    assert.ok(out.includes(s), `missing: ${s}`);
  }
  assert.ok(!out.includes('linear'));
  assert.ok(!out.includes('\x1b['));
  const all = renderTree(r, { color: false, all: true });
  assert.ok(all.includes('linear') && all.includes('shadowed by project skill'));
  assert.ok(renderTree(r, { color: true }).includes('\x1b[32m'));
  assert.ok(!renderTree(r, { color: false, kinds: ['mcp'] }).includes('Skills ('));
});

test('html is self-contained and embeds data', () => {
  const html = renderHtml(sample());
  assert.ok(html.startsWith('<!doctype html>'));
  assert.ok(!/<script[^>]*\ssrc=/i.test(html));
  assert.ok(!/<link[^>]*href=["']?http/i.test(html));
  assert.ok(html.includes('prefers-color-scheme:dark'));
  for (const s of ['Hierarchy', 'By kind', 'Live vs predicted', 'copy open cmd', 'precision']) assert.ok(html.includes(s), s);
  const m = html.match(/<script id="data" type="application\/json">([\s\S]*?)<\/script>/);
  const data = JSON.parse(m[1]);
  assert.equal(data.harnesses.claude.items.length, 9);
  assert.equal(data.compare.claude.skills.matched, 2);
});

test('html escapes script-breaking content in data', () => {
  const r = sample();
  r.harnesses.claude.items[0].reason = '</script><script>alert(1)</script>';
  const html = renderHtml(r);
  assert.ok(!html.includes('</script><script>alert'));
});
