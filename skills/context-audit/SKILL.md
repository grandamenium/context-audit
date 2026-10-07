---
name: context-audit
description: Audit the context loaded into this agent session (CLAUDE.md/AGENTS.md bootstrap docs, skills, hooks, MCP servers, plugins) and where each piece comes from. Use when the user asks what context, skills, hooks, MCP servers or instructions you have loaded, why something is or is not available, or which file adds it.
---

# context-audit

Run the tool from your shell. It detects your own session (harness, process, boot folder, launch flags) on its own.

```sh
node <path-to-context-audit>/dist/context-audit.mjs
```

If the repo is not on this machine yet, clone it first:

```sh
git clone https://github.com/grandamenium/context-audit /tmp/context-audit
node /tmp/context-audit/dist/context-audit.mjs
```

## How to answer

The output starts with `AGENT INSTRUCTIONS`. Follow them:

1. Send the user everything between `===== BEGIN CONTEXT AUDIT =====` and `===== END CONTEXT AUDIT =====` exactly as printed (it is Markdown). This is the required format, also in chat channels such as Telegram or Slack. Do not paraphrase it.
2. Give the user the interactive HTML report in one click: attach the HTML file if your interface can send files, otherwise send the clickable `file://` link printed by the tool. Never give only a bare path.
3. Then answer the user's specific question, if any, in one or two sentences, citing file paths from the report.

## Follow-ups

- Why is X missing or inactive: run again with `--all` and quote the item's status and reason.
- A different folder: pass it as the first argument, e.g. `node .../context-audit.mjs ~/some/project`.
- Machine-readable output: `--json`.
