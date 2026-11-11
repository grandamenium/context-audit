# context-audit

Inspect the local context configuration behind an AI coding session. Trace bootstrap instructions, skills, hooks, MCP servers, plugins, commands and agents back to their source files, with status and precedence explanations.

Supports **Claude Code**, **Codex** and **OpenCode**. Runs locally with **Node.js 20+**, using the included prebuilt file. No dependency installation is needed to run it.

[Quick start](#quick-start) · [Usage](#usage) · [Coverage and limits](#coverage-and-limits) · [Privacy](#privacy-and-report-handling) · [Development](#development)

## Quick start

Paste this exact prompt into your coding agent:

> Run this on yourself: https://github.com/grandamenium/context-audit

The agent runs the audit from its working session and returns a Markdown summary plus an interactive HTML report. When session detection succeeds, the audit uses the agent's boot folder and launch configuration. It attempts to open the report in a browser; file delivery and browser access depend on your agent interface.

Use the full prompt above. A bare repository URL can leave the intended action unclear.

### For AI agents

Follow [AGENTS.md](AGENTS.md). Clone to a temporary folder if needed, then run the prebuilt file **from your normal working directory**, keeping the session you intend to inspect:

```sh
audit_repo="$(mktemp -d "${TMPDIR:-/tmp}/context-audit-repo.XXXXXX")"
git clone https://github.com/grandamenium/context-audit.git "$audit_repo"
node "$audit_repo/dist/context-audit.mjs"
```

If already cloned, run `node <repo>/dist/context-audit.mjs` from that same working directory. Do not change into the clone to audit the user's session.

Return everything between `===== BEGIN CONTEXT AUDIT =====` and `===== END CONTEXT AUDIT =====` exactly as printed. Attach the HTML file if your interface supports it; otherwise provide the clickable `file://` link printed by the tool. Then answer any specific question briefly. Handle the output as private session data.

Agents with skill support can use [skills/context-audit/SKILL.md](skills/context-audit/SKILL.md). To contribute to this repository, see [Development](#development).

## Usage

After cloning, use the included build directly. These commands assume you are in the clone; replace `/path/to/project` with the folder you want to inspect:

```sh
node dist/context-audit.mjs /path/to/project --tree
node dist/context-audit.mjs /path/to/project --harness codex --all --tree
node dist/context-audit.mjs /path/to/project --kind skill,mcp,hook --tree
node dist/context-audit.mjs /path/to/project --json
node dist/context-audit.mjs /path/to/project --html /tmp/context-audit-report.html --open
node dist/context-audit.mjs --help
```

With no folder argument, the tool attempts to detect the invoking agent's session. In an agent, the default is a fixed-format summary and HTML report; in a regular terminal, it is a tree view. Use `--summary` to request a summary, `--tree` for terminal output, or `--no-open` to skip the browser. Agent-mode reports are written to the system temporary directory unless you supply `--html <file>`.

`--live` compares predictions with evidence in a readable Claude Code or Codex session log. Use `--session <id>` to select a particular session. Missing log evidence does not prove that an item was absent.

### Local web UI

```sh
node dist/context-audit.mjs serve
```

Opens `http://127.0.0.1:4747`. Choose a running agent, a recent session, or a folder. The UI reads local process and configuration metadata. Keep it on loopback, do not tunnel or expose it publicly, and stop it with `Ctrl+C` when finished. Use `serve --no-open` to start without opening a browser.

### Library

After installing dependencies in your checkout, import the source API:

```js
import { audit } from './src/index.js';

const report = audit({ cwd: '/path/to/project', harnesses: ['claude', 'codex'] });
for (const item of report.harnesses.codex.items) {
  console.log(item.kind, item.name, item.status, item.path);
}
```

The JSON report includes `schemaVersion` for consumers.

## Coverage and limits

The adapters resolve local files and known configuration rules. Reports include source paths, scope and status: `active`, `conditional`, `disabled`, `shadowed`, `needs-approval` or `unknown`. An `active` prediction describes the adapter's configuration model; it is not proof that the model received or executed that item.

| Harness | Local sources inspected | Live comparison |
| --- | --- | --- |
| Claude Code | `CLAUDE.md`, `AGENTS.md` fallback, imports, rules, settings, skills, plugins, hooks and MCP configuration | Available transcript evidence |
| Codex | `AGENTS.md` hierarchy, layered `config.toml`, skills, plugins, rules, hooks and MCP configuration | Available rollout evidence |
| OpenCode | `AGENTS.md` / `CLAUDE.md`, configured instructions, skill folders, plugins and MCP configuration | Not implemented |

Coverage depends on harness versions, readable local files and what the harness records. Account connectors, binary-provided context, remote configuration, policy layers and lazy loading may be unknown or unmodeled. Codex skill-list budgets are inferred from observed behavior and may vary by model and launch settings.

Live skill and MCP inventories can be incomplete. A session may expose capabilities without logging them in a format this tool recognizes. Treat empty observed lists and prediction differences as evidence to investigate, not a complete inventory of the live context window. This tool does not inspect the model's internal state or perform a comprehensive security audit.

## Privacy and report handling

The audit reads local configuration, instruction metadata and, in live mode, session logs. HTML and JSON reports can include usernames in absolute paths, project and server names, commands, configuration details and session identifiers. The HTML embeds report data even when a section is collapsed or filtered out.

Secret-value redaction is a best-effort safeguard, not a guarantee that a report is safe to share. Review the full exported data before sharing it. Keep real reports, screenshots and verification outputs out of public repositories and issue threads. Use synthetic fixtures for examples and bug reports.

Default agent reports live in the system temporary directory; explicit `--html` output goes to the path you choose. Delete private reports when you no longer need them. Verification data belongs in the ignored `verify/local/` and `verify/out/` folders. The optional verification HTML currently loads Google Fonts when opened.

## Development

```sh
npm ci
npm test
npm run build
```

The build regenerates `dist/context-audit.mjs` and its [third-party license notices](dist/THIRD_PARTY_LICENSES.txt). Keep generated files in sync when changing source code. For a local `context-audit` command, run `npm link` from the checkout after installing dependencies.

Use synthetic fixtures in tests and keep machine-specific evidence private. The [verify/](verify/) scripts provide optional checks against installed harnesses:

- `node verify/canary.js claude,codex,opencode <tmpdir>` creates a throwaway project and boots real harnesses. It makes model calls and may incur charges.
- `node verify/run.js --hours 24` compares predictions with recent local session logs.
- `node verify/blind.js` compares predictions with ground truth in `verify/local/ground-truth/`.
- `node verify/report.js` builds an HTML summary of available verification results.

These checks depend on your local environment and do not establish universal coverage.

## License

[MIT](LICENSE). Bundled dependencies retain their [own license notices](dist/THIRD_PARTY_LICENSES.txt).
