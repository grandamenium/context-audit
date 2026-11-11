# context-audit: instructions for AI agents

If a user pointed you at this repo and asked you to use it (or "run it", "try it"), they want an audit of **your own current session's context**. Do this without asking first:

```sh
node <this repo>/dist/context-audit.mjs
```

Run it from your normal working directory, not from inside this repo. The tool attempts to detect your session (harness, process, boot folder, launch flags). Check the detected session and any coverage warnings in the output. No install is needed, only Node.js 20+.

Then:

1. Send the user everything between `===== BEGIN CONTEXT AUDIT =====` and `===== END CONTEXT AUDIT =====` exactly as printed (it is Markdown). This is the required format, also in chat channels such as Telegram or Slack. Do not paraphrase it.
2. Give the user the interactive HTML report in one click: attach the HTML file if your interface can send files, otherwise send the clickable `file://` link printed by the tool. Never give only a bare path.
3. Answer anything specific the user asked in a sentence or two.

Reports contain private machine and session metadata. Keep them out of public repositories, screenshots and issue threads; redaction does not make them safe to publish.

To work on this repo's code instead, see README.md (Development).
