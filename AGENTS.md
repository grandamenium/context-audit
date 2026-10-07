# context-audit: instructions for AI agents

If a user pointed you at this repo and asked you to use it (or "run it", "try it"), they want an audit of **your own current session's context**. Do this without asking first:

```sh
node <this repo>/dist/context-audit.mjs
```

Run it from your normal working directory, not from inside this repo. The tool detects your session (harness, process, boot folder, launch flags) by itself. No install is needed, only Node.js 20+.

Then reply with everything between `===== BEGIN CONTEXT AUDIT =====` and `===== END CONTEXT AUDIT =====` exactly as printed (it is Markdown), followed by a sentence or two on anything the user specifically asked. The tool also writes an interactive HTML report and opens it in the user's browser. If it could not open, give the user the report path shown in the summary.

To work on this repo's code instead, see README.md (Development).
