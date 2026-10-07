# context-audit

See exactly what context an AI coding agent loads when it starts in a folder: bootstrap docs (`CLAUDE.md`, `AGENTS.md`, `@imports`, rules), skills, hooks, MCP servers, plugins, commands and agents. Every item comes with the file it is defined in, the level it comes from (managed, user, parent folder, project, local, plugin) and whether it is active, shadowed, disabled, waiting for approval or unknown, with the reason.

Supports **Claude Code**, **Codex** and **OpenCode**.

## Quick start: ask your agent

Paste this into Claude Code, Codex or OpenCode:

> Run this on yourself: https://github.com/grandamenium/context-audit

The agent clones the repo, audits its own live session, opens an interactive report in your browser and replies with a standard summary. Tested blind with fresh Claude Code and Codex agents. A bare "use this" works for most agents, but Codex may ask what you want first.

## For AI agents

If a user gave you this link and asked you to use it, do this:

```sh
git clone https://github.com/grandamenium/context-audit /tmp/context-audit   # skip if already cloned
node /tmp/context-audit/dist/context-audit.mjs
```

No install step is needed, only Node.js 20+. When an agent runs it, the tool detects that agent's own session (harness, process, boot folder, launch flags), compares against the session's own log, writes an interactive HTML report, opens it in the user's browser, and prints a fixed-format summary.

**Always answer in this shape:** send everything between `===== BEGIN CONTEXT AUDIT =====` and `===== END CONTEXT AUDIT =====` exactly as printed (also in chat channels such as Telegram or Slack), give the user the HTML report in one click (attach the file if your interface can send files, otherwise the clickable `file://` link the tool prints, never a bare path), then answer their specific question in a sentence or two. Skills-aware agents can install [`skills/context-audit/SKILL.md`](skills/context-audit/SKILL.md) to do this without instructions.

## Install

Requires Node.js 20 or newer.

```sh
git clone https://github.com/grandamenium/context-audit.git
cd context-audit
```

Run it with no install step using the prebuilt single-file build:

```sh
node dist/context-audit.mjs serve
```

Or install dependencies and put `context-audit` on your PATH:

```sh
npm install
npm link            # optional: makes `context-audit` available everywhere
```

## Use

### Web UI

```sh
context-audit serve            # opens http://127.0.0.1:4747 (local only)
```

Pick what to audit:

- **Running agents** - live Claude Code, Codex and OpenCode processes. The audit uses the folder the agent started in and its launch flags (for example `--settings`, `--mcp-config`, `--plugin-dir`), then checks the result against the session's own log.
- **Recent sessions** - sessions from the last 72 hours, compared with what each session actually loaded.
- **Audit a folder** - type or browse to any folder to see what a new session started there would load.

### Terminal

```sh
context-audit                       # in an agent: summary + HTML report; in a terminal: tree view
context-audit path/to/project       # audit a specific folder
context-audit --harness claude      # one harness: claude, codex, opencode
context-audit --kind skill,mcp,hook # only some kinds
context-audit --all                 # include shadowed and disabled items, with reasons
context-audit --live                # compare with the live session log
context-audit --json                # machine-readable report
context-audit --html report.html --open
context-audit --summary             # fixed-format summary + HTML report (agent default)
context-audit --tree                # tree view even inside an agent
```

When an agent runs `context-audit` itself, the tool finds that agent's process, the folder it booted in and its launch flags, so the report describes the session you are talking to, not just the shell's current folder.

### Library

```js
import { audit } from 'context-audit';

const report = audit({ cwd: '/path/to/project', harnesses: ['claude', 'codex'] });
for (const item of report.harnesses.claude.items) {
  console.log(item.kind, item.name, item.status, item.path);
}
```

The report shape is versioned by `schemaVersion`. Values of `env`, `headers` and secret-looking keys are always redacted.

## What it reads

| | Bootstrap docs | Skills | MCP servers | Hooks |
|---|---|---|---|---|
| Claude Code | managed, `~/.claude/CLAUDE.md`, every parent folder's `CLAUDE.md` / `CLAUDE.local.md`, `.claude/rules`, `@imports`, `AGENTS.md` fallback | `~/.claude/skills`, project `.claude/skills`, plugins, commands | `~/.claude.json` (user and per-project), `.mcp.json` with approval state, plugins, managed | settings files, plugins, skill frontmatter |
| Codex | `~/.codex/AGENTS.md`, `AGENTS.md` from repo root down to the folder | `~/.codex/skills`, `.agents/skills`, plugins, listing budget | `config.toml` layers, plugins | `hooks.json`, `[hooks]`, plugins, `notify` |
| OpenCode | `AGENTS.md` / `CLAUDE.md`, `instructions` | `.opencode`, `.claude`, `.agents` skill folders | `mcp` config | plugins |

Some things are not knowable from files and are labeled as such instead of guessed: claude.ai connectors (`unknown`), skills built into a harness binary, and Codex skills whose inclusion depends on the context window chosen at launch.

## Verification

`npm test` runs the fixture tests. The `verify/` folder holds the checks used to validate the tool against real harnesses on your own machine:

- `node verify/canary.js claude,codex,opencode <tmpdir>` builds a throwaway project with tagged docs, skills and an MCP server, boots each real harness in it and compares what loaded with what context-audit predicted. This makes a few model calls.
- `node verify/run.js --hours 24` scores predictions against every recent real session's own log.
- `node verify/blind.js` compares against hand-written ground truth you place in `verify/local/ground-truth/`.
- `node verify/report.js` builds an HTML summary of the results.

## Development

```sh
npm install
npm test
npm run build   # regenerates dist/context-audit.mjs
```

## License

MIT
