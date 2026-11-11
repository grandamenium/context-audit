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
import { redact } from './model.js';

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

export async function startServer({ port = 4747, host = '127.0.0.1' } = {}) {
  if (host !== '127.0.0.1' && host !== '::1') throw new Error('context-audit must bind to a literal loopback address');
  const server = http.createServer((req, res) => {
    const send = (status, type, body, headers = {}) => { res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...headers }); res.end(body); };
    const authority = req.headers.host;
    const localPort = server.address().port;
    const allowed = new Set([`127.0.0.1:${localPort}`, `localhost:${localPort}`, `[::1]:${localPort}`]);
    // A loopback socket alone does not prevent foreign browser origins or DNS
    // rebinding from requesting local configuration and process metadata.
    if (!allowed.has(authority)
        || (req.headers.origin && req.headers.origin !== `http://${authority}`)
        || (req.headers['sec-fetch-site'] && !['same-origin', 'none'].includes(req.headers['sec-fetch-site']))) {
      return send(403, 'text/plain; charset=utf-8', 'local same-origin requests only');
    }
    if (!['GET', 'HEAD'].includes(req.method)) return send(405, 'text/plain; charset=utf-8', 'method not allowed');
    let url;
    try { url = new URL(req.url, `http://${authority}`); }
    catch { return send(400, 'text/plain; charset=utf-8', 'invalid request URL'); }
    if (url.origin !== `http://${authority}`) return send(403, 'text/plain; charset=utf-8', 'local same-origin requests only');
    const q = url.searchParams;
    const json = (v) => send(200, 'application/json; charset=utf-8', JSON.stringify(redact(v)));
    try {
      switch (url.pathname) {
        case '/': return send(200, 'text/html; charset=utf-8', renderApp({ home: os.homedir(), cwd: process.cwd() }));
        case '/report': return send(200, 'text/html; charset=utf-8', renderHtml(reportFor(q)));
        case '/api/audit': {
          const body = JSON.stringify(reportFor(q), null, 2);
          return send(200, 'application/json; charset=utf-8', body, { 'content-disposition': 'attachment; filename="context-audit.json"' });
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
    const hostname = host === '::1' ? '[::1]' : host;
    server.listen(port, host, () => resolve({ server, url: `http://${hostname}:${server.address().port}/` }));
  });
}
