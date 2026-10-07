// Local web UI: `context-audit serve`. Binds to 127.0.0.1 only; it reads local config
// files, so it must never listen on a public interface.
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import { audit } from './index.js';
import { renderHtml } from './render/html.js';
import { renderApp } from './render/app.js';
import { listRunning, listRecent, listFolder } from './discover.js';
import { parseLaunchFlags, processArgs, processCwd } from './session.js';

function reportFor(q) {
  const harnesses = q.get('harness') ? q.get('harness').split(',').filter(Boolean) : undefined;
  const pid = q.get('pid') ? Number(q.get('pid')) : null;
  let dir = q.get('dir');
  let launch, session = { harness: null, detectedBy: [] };
  if (pid) {
    // Audit a running agent exactly as it was booted: its cwd and its launch flags.
    const cwd = processCwd(pid);
    if (!cwd) throw Object.assign(new Error(`process ${pid} is no longer running`), { status: 410 });
    dir = cwd;
    launch = parseLaunchFlags(processArgs(pid) || [], cwd);
    session = { harness: q.get('h') || null, pid, bootCwd: cwd, sessionId: q.get('session') || null, launch, detectedBy: ['ui'] };
  }
  if (!dir || !fs.existsSync(dir)) throw Object.assign(new Error(`folder not found: ${dir || '(none)'}`), { status: 404 });
  return audit({ cwd: dir, harnesses, live: q.get('live') === '1', sessionId: q.get('session') || undefined, launch, session });
}

export function startServer({ port = 4747, host = '127.0.0.1' } = {}) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${host}`);
    const q = url.searchParams;
    const send = (status, type, body) => { res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' }); res.end(body); };
    const json = (v) => send(200, 'application/json; charset=utf-8', JSON.stringify(v));
    try {
      switch (url.pathname) {
        case '/': return send(200, 'text/html; charset=utf-8', renderApp({ home: os.homedir(), cwd: process.cwd() }));
        case '/report': return send(200, 'text/html; charset=utf-8', renderHtml(reportFor(q)));
        case '/api/audit': {
          const body = JSON.stringify(reportFor(q), null, 2);
          res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'content-disposition': 'attachment; filename="context-audit.json"' });
          return res.end(body);
        }
        case '/api/running': return json(listRunning());
        case '/api/recent': return json(listRecent({ hours: Number(q.get('hours') || 72) }));
        case '/api/ls': return json(listFolder(q.get('dir') || os.homedir()));
        default: return send(404, 'text/plain', 'not found');
      }
    } catch (e) {
      const msg = String(e.message || e);
      if (url.pathname === '/report') return send(e.status || 500, 'text/html; charset=utf-8', `<p style="font:14px system-ui;padding:24px">${msg.replace(/</g, '&lt;')}</p>`);
      return send(e.status || 500, 'application/json', JSON.stringify({ error: msg }));
    }
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => resolve({ server, url: `http://${host}:${server.address().port}/` }));
  });
}
