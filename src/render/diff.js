// Compare statically predicted context against what a live session transcript observed.
//
// Matching is EXACT on full names: a predicted item is reduced to the name the harness shows
// (`canonicalName`), and that string must equal the observed one. The only derivations are
// structural, not fuzzy: plugin items are namespaced (`plugin:skill`, `plugin_<plugin>_<server>`)
// and MCP names have non-[A-Za-z0-9_-] characters replaced by `_` (that is how tool names are built).
import fs from 'node:fs';

const nameOf = (x) => (typeof x === 'string' ? x : x?.name ?? x?.id ?? x?.path ?? '');
const normMcp = (s) => String(s).replace(/[^a-zA-Z0-9_-]/g, '_');
const pluginName = (id) => String(id).split('@')[0];

// Things a transcript shows that no file on disk defines. A miss matching one of these is classified
// `harness-builtin` instead of `unexplained`. Strings are exact names, RegExps are tested on the name.
// Skill names were collected from skill listings across local Claude transcripts.
export const BUILTIN = {
  claude: {
    skills: [
      'artifact-capabilities', 'artifact-design', 'artifact-diagramming', 'claude-api', 'claude-in-chrome',
      'code-review', 'dataviz', 'fewer-permission-prompts', 'init', 'keybindings-help', 'loop', 'plugin-authoring',
      'run', 'schedule', 'security-review', 'simplify', 'update-config', 'workflow-authoring',
      'review', 'compact', 'context', 'cost', 'debug', 'batch', 'verify', 'less-permission-prompts',
    ],
    // claude.ai connectors (claude_ai_*) and the Claude in Chrome extension are provided by the account/app.
    mcp: [/^claude_ai_/, 'claude-in-chrome'],
    bootstrap: [],
  },
  codex: { skills: [], mcp: [], bootstrap: [] },
  opencode: { skills: [], mcp: [], bootstrap: [] },
};

// Harnesses whose slash-command files are listed to the model as skills.
const COMMANDS_ARE_SKILLS = new Set(['claude']);

const isBuiltin = (harness, cat, name) =>
  (BUILTIN[harness]?.[cat] || []).some((b) => (b instanceof RegExp ? b.test(name) : b === name));

function sessionStart(source) {
  if (!source) return null;
  try {
    const fd = fs.openSync(source, 'r'); const buf = Buffer.alloc(1 << 16); const n = fs.readSync(fd, buf, 0, buf.length, 0); fs.closeSync(fd);
    for (const l of buf.subarray(0, n).toString('utf8').split('\n').slice(0, 60)) {
      try { const t = JSON.parse(l).timestamp; if (t) return Date.parse(t); } catch { /* partial line */ }
    }
    return fs.statSync(source).birthtimeMs;
  } catch { return null; }
}

// Predicted-but-unobserved: was the defining file changed after the session started?
function staleEvidence(it, start) {
  if (!start || !it?.path) return null;
  try {
    const st = fs.statSync(it.path);
    const changed = Math.max(st.mtimeMs, st.birthtimeMs);
    // ~/.claude.json is rewritten constantly, so its mtime says nothing about the entry
    if (/\.claude\.json$/.test(it.path)) return null;
    if (changed > start) return { path: it.path, changedAt: new Date(changed).toISOString(), sessionStart: new Date(start).toISOString() };
  } catch { /* inline or missing path */ }
  return null;
}

const realOr = (p) => { try { return fs.realpathSync(p); } catch { return p; } };
const ratio = (a, b) => (b ? a / b : null);

function category({ preds, lives, canon, label, harness, cat, start, failed = [], hidden = 0, unverifiable = new Set() }) {
  const unmatchedLive = [...lives];
  const matched = [];
  const extraItems = [];
  for (const p of preds) {
    const i = unmatchedLive.indexOf(canon(p));
    if (i >= 0) { matched.push(label(p)); unmatchedLive.splice(i, 1); } else extraItems.push(p);
  }
  const missing = unmatchedLive.map((l) => nameOf(l));
  const builtinMissing = missing.filter((n) => isBuiltin(harness, cat, n));
  // defined by a local file that exists but cannot be read now (item status 'unknown'), so not predictable
  const unverifiableMissing = missing.filter((n) => !isBuiltin(harness, cat, n) && unverifiable.has(n));
  const unexplainedMissing = missing.filter((n) => !isBuiltin(harness, cat, n) && !unverifiable.has(n));
  const extraExplained = [];
  const extraUnexplained = [];
  for (const p of extraItems) {
    const name = label(p);
    const failedHit = failed.some((f) => normMcp(f) === canon(p));
    const remote = p.status === 'unknown' && p.scope === 'remote';
    const ev = failedHit || remote ? null : staleEvidence(p, start);
    if (failedHit) extraExplained.push({ name, reason: 'failed-connection' });
    else if (remote) extraExplained.push({ name, reason: 'remote-unverifiable' });
    else if (ev) extraExplained.push({ name, reason: 'stale-session', evidence: ev });
    else extraUnexplained.push(name);
  }
  const fileBackedObserved = lives.length - builtinMissing.length;
  return {
    predicted: preds.length,
    observed: lives.length,
    matched: matched.length,
    missing,
    extra: extraItems.map(label),
    precision: ratio(matched.length, preds.length),
    recall: ratio(matched.length, lives.length),
    builtinMissing,
    unverifiableMissing,
    unexplainedMissing,
    extraExplained,
    extraUnexplained,
    hiddenFromListing: hidden,
    recallFileBacked: ratio(matched.length, fileBackedObserved),
    precisionAdjusted: ratio(matched.length, preds.length - extraExplained.length),
  };
}

const harnessOf = (h) => h?.harness || h?.items?.find((i) => i.harness)?.harness || (String(h?.live?.source || '').includes('/.claude/') ? 'claude' : null);

export function compareLive(h) {
  const live = h?.live;
  if (!live || live.error || !live.observed) return null;
  const o = live.observed;
  const harness = harnessOf(h);
  const start = sessionStart(live.source);
  const items = h.items || [];
  const dedupe = (arr, key) => [...new Map(arr.map((x) => [key(x), x])).values()];

  // Skills: a command file is a skill to the model, and a skill/command with
  // disable-model-invocation never appears in the listing, so it is not predictable from the transcript.
  const skillKinds = COMMANDS_ARE_SKILLS.has(harness) ? ['skill', 'command'] : ['skill'];
  const skillItems = items.filter((i) => skillKinds.includes(i.kind) && i.status === 'active');
  const visible = skillItems.filter((i) => i.details?.modelInvocable !== false);
  const skillName = (i) => (i.plugin && !String(i.name).includes(':') ? `${pluginName(i.plugin)}:${i.name}` : i.name);

  const mcpItems = items.filter((i) => i.kind === 'mcp' && (i.status === 'active' || (i.status === 'unknown' && i.scope === 'remote')));
  // Only Claude namespaces plugin MCP servers (plugin_<plugin>_<server>); Codex/OpenCode use the bare name.
  const mcpName = (i) => (harness === 'claude' && i.scope === 'plugin' && i.plugin ? `plugin_${pluginName(i.plugin)}_${normMcp(i.name)}` : normMcp(i.name));

  return {
    source: live.source ?? null,
    bootstrap: category({
      // Claude's .claude/rules files without `paths` load at boot like CLAUDE.md (canary-verified).
      preds: dedupe(items.filter((i) => (i.kind === 'bootstrap' || (harness === 'claude' && i.kind === 'rule')) && i.status === 'active'), (i) => i.path),
      lives: (o.bootstrap || []).map((b) => (typeof b === 'string' ? b : b.path)),
      canon: (i) => i.path, label: (i) => i.path, harness, cat: 'bootstrap', start,
      unverifiable: new Set(items.filter((i) => i.kind === 'bootstrap' && i.status === 'unknown').map((i) => i.path)),
    }),
    skills: (() => {
      // When the live listing carries file paths (Codex), several skills share a name, so compare by real path.
      // Names-only listings (Claude) fall back to exact full names.
      const liveSkills = o.skills || [];
      const byPath = liveSkills.length > 0 && liveSkills.every((x) => x && typeof x === 'object' && (x.realPath || x.path));
      const canon = byPath ? (i) => realOr(i.path) : skillName;
      return category({
        preds: dedupe(visible, canon), lives: byPath ? liveSkills.map((x) => x.realPath || realOr(x.path)) : liveSkills.map(nameOf),
        canon, label: byPath ? (i) => i.path : skillName, harness, cat: 'skills', start,
        hidden: dedupe(skillItems, canon).length - dedupe(visible, canon).length,
        unverifiable: new Set(items.filter((i) => skillKinds.includes(i.kind) && i.status === 'unknown').map(canon)),
      });
    })(),
    mcp: category({
      preds: dedupe(mcpItems, mcpName), lives: (o.mcpServers || []).map(nameOf),
      canon: mcpName, label: mcpName, harness, cat: 'mcp', start, failed: o.mcpFailed || [],
    }),
  };
}

export const pct = (x) => (x == null ? 'n/a' : `${Math.round(x * 100)}%`);
