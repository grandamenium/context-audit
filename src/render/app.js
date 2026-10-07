// App shell for `context-audit serve`: pick what to audit on the left, report on the right.
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function renderApp({ home, cwd }) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>context-audit</title>
<style>
:root{--bg:#fafaf9;--panel:#fff;--fg:#1c1917;--mut:#78716c;--bd:#e7e5e4;--acc:#2563eb;--hi:#eff6ff;--ok:#15803d;--warn:#b45309;
--claude:#c2410c;--codex:#0f766e;--opencode:#6d28d9;--on-acc:#fff;--mono:ui-monospace,SFMono-Regular,Menlo,monospace;color-scheme:light}
@media(prefers-color-scheme:dark){:root{--bg:#131211;--panel:#1c1a19;--fg:#e7e5e4;--mut:#a8a29e;--bd:#33302e;--acc:#60a5fa;--hi:#1e2a3f;--ok:#4ade80;--warn:#fbbf24;
--claude:#fb923c;--codex:#2dd4bf;--opencode:#a78bfa;--on-acc:#0b1220;color-scheme:dark}}
*{box-sizing:border-box}html,body{height:100%}
body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.45 system-ui,-apple-system,sans-serif;display:grid;grid-template-columns:360px 1fr}
aside{border-right:1px solid var(--bd);background:var(--panel);overflow:auto;display:flex;flex-direction:column}
header{padding:16px 16px 12px;border-bottom:1px solid var(--bd)}
h1{font:600 16px var(--mono);margin:0}header p{margin:4px 0 0;color:var(--mut);font-size:13px}
section{padding:14px 16px;border-bottom:1px solid var(--bd);display:flex;flex-direction:column;gap:8px}
h2{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--mut);margin:0;display:flex;justify-content:space-between;align-items:center;font-weight:600}
input[type=text]{width:100%;font:13px var(--mono);padding:7px 8px;border:1px solid var(--bd);border-radius:6px;background:var(--bg);color:var(--fg)}
input:focus-visible,button:focus-visible{outline:2px solid var(--acc);outline-offset:1px}
.row{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
button{font:inherit;font-size:13px;border:1px solid var(--bd);background:var(--panel);color:var(--fg);border-radius:6px;padding:5px 10px;cursor:pointer}
button.primary{background:var(--acc);border-color:var(--acc);color:var(--on-acc);font-weight:600}
button.link{border:0;background:none;color:var(--acc);padding:0;font-size:12px}
label.h{display:flex;gap:4px;align-items:center;font-size:13px}
.list{display:flex;flex-direction:column;gap:2px;max-height:260px;overflow:auto}
.item{display:grid;grid-template-columns:86px 1fr;gap:2px 8px;text-align:left;border:1px solid transparent;border-radius:6px;padding:6px 8px;background:none;width:100%}
.item:hover{background:var(--hi)}.item.on{border-color:var(--acc);background:var(--hi)}
.item .p{font:12px var(--mono);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:rtl;text-align:left}
.item .m{grid-column:2;color:var(--mut);font-size:11.5px}
.badge{justify-self:start;font:600 10.5px var(--mono);padding:1px 6px;border-radius:4px;border:1px solid currentColor;align-self:start;margin-top:1px}
.badge.claude{color:var(--claude)}.badge.codex{color:var(--codex)}.badge.opencode{color:var(--opencode)}
.empty{color:var(--mut);font-size:12.5px}
.browser{border:1px solid var(--bd);border-radius:6px;background:var(--bg)}
.browser .cur{font:12px var(--mono);padding:6px 8px;border-bottom:1px solid var(--bd);display:flex;gap:6px;align-items:center;justify-content:space-between}
.browser .ents{max-height:200px;overflow:auto;padding:4px}
.browser .ents button{display:block;width:100%;text-align:left;border:0;background:none;font:12px var(--mono);padding:3px 6px}
.browser .ents button:hover{background:var(--hi)}
.mk{font:10.5px var(--mono);color:var(--ok);border:1px solid var(--bd);border-radius:4px;padding:0 4px;margin-right:3px}
main{display:flex;flex-direction:column;min-width:0}
.bar{display:flex;align-items:center;gap:10px;padding:8px 14px;border-bottom:1px solid var(--bd);background:var(--panel);min-height:42px;font-size:13px}
.bar .t{font:12.5px var(--mono);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0}
iframe{flex:1;border:0;width:100%;background:var(--bg)}
.welcome{flex:1;display:flex;align-items:center;justify-content:center;padding:32px}
.welcome div{max-width:560px;display:flex;flex-direction:column;gap:10px}
.welcome h3{margin:0;font-size:20px;text-wrap:balance}.welcome p{margin:0;color:var(--mut)}
.welcome ol{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:6px}
.spin{color:var(--mut);font-size:12px}
@media(max-width:800px){body{grid-template-columns:1fr;grid-template-rows:auto 1fr}aside{max-height:55vh;border-right:0;border-bottom:1px solid var(--bd)}}
</style></head><body>
<aside>
  <header><h1>context-audit</h1><p>See every skill, hook, MCP server and bootstrap doc an agent session loads, and the file it comes from.</p></header>
  <section>
    <h2>Audit a folder</h2>
    <input type="text" id="dir" value="${esc(cwd)}" spellcheck="false" aria-label="Folder path">
    <div class="row">
      <label class="h"><input type="checkbox" class="hz" value="claude" checked> Claude Code</label>
      <label class="h"><input type="checkbox" class="hz" value="codex" checked> Codex</label>
      <label class="h"><input type="checkbox" class="hz" value="opencode" checked> OpenCode</label>
    </div>
    <div class="row"><button class="primary" id="go">Audit folder</button><button id="browse">Browse…</button></div>
    <div class="browser" id="browser" hidden></div>
  </section>
  <section>
    <h2>Running agents <button class="link" id="rr">Refresh</button></h2>
    <div class="list" id="running"><span class="spin">Looking for running agents…</span></div>
    <p class="empty">Audits the agent exactly as it was started, launch flags included, and compares the result with its live session log.</p>
  </section>
  <section>
    <h2>Recent sessions <button class="link" id="rs">Refresh</button></h2>
    <div class="list" id="recent"><span class="spin">Reading session logs…</span></div>
  </section>
</aside>
<main>
  <div class="bar"><span class="t" id="what">Nothing audited yet</span><button id="json" hidden>Download JSON</button><button id="newtab" hidden>Open in new tab</button></div>
  <div class="welcome" id="welcome"><div>
    <h3>Pick something to audit</h3>
    <p>context-audit reads the same config files the agent harnesses read, then shows what would load for that folder and why.</p>
    <ol>
      <li><b>Running agents</b>: audit a live Claude Code or Codex session. Its launch flags are included and the result is checked against the session log.</li>
      <li><b>Recent sessions</b>: audit the folder of a past session and compare with what that session actually loaded.</li>
      <li><b>Audit a folder</b>: type or browse to any directory to see what a new session started there would load.</li>
    </ol>
  </div></div>
  <iframe id="frame" title="Audit report" hidden></iframe>
</main>
<script>
const HOME=${JSON.stringify(home)};
const $=(id)=>document.getElementById(id);
const tild=(p)=>p&&p.startsWith(HOME)?'~'+p.slice(HOME.length):p;
const ago=(t)=>{const m=Math.round((Date.now()-t)/60000);return m<60?m+' min ago':m<1440?Math.round(m/60)+' h ago':Math.round(m/1440)+' d ago'};
const NAME={claude:'Claude Code',codex:'Codex',opencode:'OpenCode'};
let current=null;
function show(params,label){
  current=new URLSearchParams(params).toString();
  $('welcome').hidden=true;const f=$('frame');f.hidden=false;f.src='/report?'+current;
  $('what').textContent=label;$('json').hidden=false;$('newtab').hidden=false;
  document.querySelectorAll('.item.on').forEach(e=>e.classList.remove('on'));
}
function harnesses(){return [...document.querySelectorAll('.hz:checked')].map(e=>e.value).join(',')}
$('go').onclick=()=>{const d=$('dir').value.trim();if(d)show({dir:d.replace(/^~(?=\\/|$)/,HOME),harness:harnesses()},'Folder '+tild(d))};
$('dir').addEventListener('keydown',e=>{if(e.key==='Enter')$('go').click()});
$('json').onclick=()=>{location.href='/api/audit?'+current};
$('newtab').onclick=()=>{window.open('/report?'+current,'_blank')};
function item(el,{badge,path,meta,onclick}){
  const b=document.createElement('button');b.className='item';b.title=path;
  b.innerHTML='<span class="badge '+badge+'">'+NAME[badge]+'</span><span class="p"></span><span class="m"></span>';
  b.querySelector('.p').textContent='\\u200e'+tild(path);b.querySelector('.m').textContent=meta;
  b.onclick=()=>{onclick();b.classList.add('on')};el.appendChild(b);
}
async function loadRunning(){
  const el=$('running');el.innerHTML='<span class="spin">Looking for running agents…</span>';
  const rows=await fetch('/api/running').then(r=>r.json()).catch(()=>[]);el.innerHTML='';
  const hosts=rows.filter(r=>r.host);const agents=rows.filter(r=>!r.host);
  if(!agents.length&&!hosts.length){el.innerHTML='<span class="empty">No Claude Code, Codex or OpenCode processes are running.</span>';return}
  if(hosts.length){const n=document.createElement('span');n.className='empty';n.textContent=hosts.length+' Codex app/exec server'+(hosts.length>1?'s host':' hosts')+' threads with their own folders; find those under Recent sessions.';el.appendChild(n)}
  for(const r of agents){
    const flags=Object.keys(r.launch||{}).filter(k=>k!=='argv0');
    item(el,{badge:r.harness,path:r.cwd,meta:'pid '+r.pid+(flags.length?' · flags: '+flags.join(', '):''),
      onclick:()=>show({pid:r.pid,h:r.harness,harness:r.harness,live:'1',...(r.sessionId?{session:r.sessionId}:{})},NAME[r.harness]+' pid '+r.pid+' in '+tild(r.cwd))});
  }
}
async function loadRecent(){
  const el=$('recent');el.innerHTML='<span class="spin">Reading session logs…</span>';
  const rows=await fetch('/api/recent').then(r=>r.json()).catch(()=>[]);el.innerHTML='';
  if(!rows.length){el.innerHTML='<span class="empty">No sessions in the last 72 hours.</span>';return}
  for(const r of rows) item(el,{badge:r.harness,path:r.cwd,meta:ago(r.at),
    onclick:()=>show({dir:r.cwd,harness:r.harness,live:'1',session:r.sessionId},NAME[r.harness]+' session in '+tild(r.cwd))});
}
async function browse(dir){
  const el=$('browser');el.hidden=false;
  const d=await fetch('/api/ls?dir='+encodeURIComponent(dir)).then(r=>r.json());
  if(d.error){el.textContent=d.error;return}
  $('dir').value=tild(d.dir);
  el.innerHTML='<div class="cur"><span></span><span class="row"></span></div><div class="ents"></div>';
  el.querySelector('.cur span').textContent=tild(d.dir);
  const mk=el.querySelector('.cur .row');d.markers.forEach(m=>{const s=document.createElement('span');s.className='mk';s.textContent=m;mk.appendChild(s)});
  const ents=el.querySelector('.ents');
  if(d.parent){const up=document.createElement('button');up.textContent='..';up.onclick=()=>browse(d.parent);ents.appendChild(up)}
  for(const n of d.entries){const b=document.createElement('button');b.textContent=n+'/';b.onclick=()=>browse(d.dir+'/'+n);ents.appendChild(b)}
}
$('browse').onclick=()=>{const el=$('browser');if(!el.hidden){el.hidden=true;return}browse($('dir').value.trim().replace(/^~(?=\\/|$)/,HOME)||HOME)};
$('rr').onclick=loadRunning;$('rs').onclick=loadRecent;
loadRunning();loadRecent();
</script></body></html>`;
}
