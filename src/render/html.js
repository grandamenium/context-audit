import { compareLive } from './diff.js';

const CSS = `
:root{--bg:#fafaf9;--panel:#fff;--fg:#1c1917;--mut:#78716c;--bd:#e7e5e4;--acc:#2563eb;--hi:#eff6ff;
--active:#15803d;--conditional:#0e7490;--disabled:#78716c;--shadowed:#b45309;--needs-approval:#7e22ce;--unknown:#78716c}
@media(prefers-color-scheme:dark){:root{--bg:#131211;--panel:#1c1a19;--fg:#e7e5e4;--mut:#a8a29e;--bd:#33302e;--acc:#60a5fa;--hi:#1e2a3f;
--active:#4ade80;--conditional:#22d3ee;--disabled:#a8a29e;--shadowed:#fbbf24;--needs-approval:#c084fc;--unknown:#a8a29e}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:13px/1.45 ui-sans-serif,system-ui,-apple-system,sans-serif}
header{padding:12px 16px;border-bottom:1px solid var(--bd);background:var(--panel)}
h1{font-size:15px;margin:0 0 2px}.mut{color:var(--mut)}.mono,code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px}
nav{display:flex;gap:4px;padding:8px 16px 0;border-bottom:1px solid var(--bd);background:var(--panel);flex-wrap:wrap}
nav button{border:1px solid transparent;border-bottom:0;background:none;color:var(--mut);padding:6px 12px;cursor:pointer;font:inherit;border-radius:4px 4px 0 0}
nav button.on{color:var(--fg);background:var(--bg);border-color:var(--bd);font-weight:600}
main{display:grid;grid-template-columns:minmax(0,1fr) 380px;gap:16px;padding:16px;align-items:start}
@media(max-width:900px){main{grid-template-columns:1fr}}
.panel{background:var(--panel);border:1px solid var(--bd);border-radius:6px;padding:10px 12px;margin-bottom:12px}
.views{display:flex;gap:6px;margin-bottom:10px}
.views button,.chip,.copy{border:1px solid var(--bd);background:var(--panel);color:var(--fg);border-radius:12px;padding:2px 10px;cursor:pointer;font:inherit;font-size:12px}
.views button.on,.chip.on{background:var(--acc);color:#fff;border-color:var(--acc)}
.chips{display:flex;gap:4px;flex-wrap:wrap;margin:4px 0}
input[type=search]{width:100%;padding:6px 8px;border:1px solid var(--bd);border-radius:4px;background:var(--bg);color:var(--fg);font:inherit}
table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:4px 6px;border-bottom:1px solid var(--bd);vertical-align:top}
th{color:var(--mut);font-weight:500;cursor:pointer;white-space:nowrap}tr.item{cursor:pointer}tr.item:hover,tr.sel{background:var(--hi)}
td.p{word-break:break-all;color:var(--mut)}
.tag{display:inline-block;border:1px solid var(--bd);border-radius:3px;padding:0 5px;font-size:11px;color:var(--mut)}
.st{font-weight:600}.node{border-left:2px solid var(--bd);margin:6px 0 6px 8px;padding-left:10px}
.node>.nh{font-weight:600}.node .it{padding:2px 4px;cursor:pointer;border-radius:3px;display:flex;gap:6px;flex-wrap:wrap}
.node .it:hover,.node .it.sel{background:var(--hi)}
.src{border:1px solid var(--bd);border-radius:6px;padding:6px 10px;margin:8px 0;background:var(--panel)}
dl{display:grid;grid-template-columns:90px 1fr;gap:4px 8px;margin:0}dt{color:var(--mut)}dd{margin:0;word-break:break-all}
pre{background:var(--bg);border:1px solid var(--bd);padding:8px;overflow:auto;max-height:260px;margin:4px 0}
.bar{height:6px;background:var(--bd);border-radius:3px;overflow:hidden;min-width:60px}.bar i{display:block;height:100%;background:var(--acc)}
aside{position:sticky;top:8px}
.nw{white-space:nowrap}td.p{white-space:nowrap}
.strip{display:flex;gap:6px;flex-wrap:wrap;align-items:center;padding:8px 16px;border-bottom:1px solid var(--bd);background:var(--panel)}
.strip .sep{width:1px;height:16px;background:var(--bd);margin:0 4px}
.chip.warn{border-color:var(--shadowed);color:var(--shadowed)}.chip.warn.on{background:var(--shadowed);color:#fff}
.full{padding:16px 16px 0}.full .panel{margin-bottom:0}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px;margin-top:8px}
.card{border:1px solid var(--bd);border-radius:6px;padding:8px 10px;min-width:0}
.card h3{margin:0 0 4px;font-size:13px}
.m{display:grid;grid-template-columns:1fr auto;gap:2px 8px}.m span:nth-child(even){text-align:right;font-variant-numeric:tabular-nums}
.grp{margin-top:6px;border-left:3px solid var(--bd);padding-left:8px}
.grp.bad{border-color:#dc2626;background:rgba(220,38,38,.08);padding:4px 8px;border-radius:0 4px 4px 0}
.grp.bad b{color:#dc2626}
.grp div{word-break:break-all}.grp .ev{color:var(--mut);font-size:11px}
.launch{border-left:3px solid var(--acc)}



.bar2{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.bar2 input[type=search]{flex:1;min-width:200px;width:auto}
.ac{color:var(--mut)}.ac b{color:var(--fg)}.strip{gap:12px}
.row.it{display:flex;gap:8px;align-items:baseline;padding:2px 4px;cursor:pointer;border-radius:3px}.row.it:hover,.row.it.sel,.cl:hover,.cl.sel,tr.cl2:hover{background:var(--hi)}
.nm{font-weight:500}
.rel{color:var(--mut);font-size:12px;direction:rtl;text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;flex:1}
.x{border:1px solid var(--bd);border-radius:10px;padding:0 6px;font-size:11px;color:var(--mut);white-space:nowrap}
.st{font-size:11px;border:1px solid currentColor;border-radius:3px;padding:0 4px;font-weight:500}
details.copies>summary{display:flex;gap:8px;align-items:baseline;cursor:pointer;list-style:none;padding:2px 4px}
details.copies>summary::-webkit-details-marker{display:none}
details.copies>summary::before{content:"\\25B8";color:var(--mut);width:10px;flex:none;margin-left:-14px}
details.copies[open]>summary::before{content:"\\25BE"}
details.copies{margin-left:14px}
.cl{display:flex;gap:8px;align-items:baseline;padding:1px 4px 1px 18px;cursor:pointer;border-left:1px solid var(--bd);margin-left:4px}
details.fold.dir>summary .lab,details.fold.nftroot>summary .lab,details.fold.kindsec>summary .lab{font-weight:600}
details.fold.sub>summary .lab{font-weight:500}
tr.cl2 td{color:var(--mut)}.kindsec table{table-layout:fixed}.kindsec th:nth-child(1){width:32%}.kindsec th:nth-child(2){width:8%}.kindsec th:nth-child(4){width:14%}td.p .rel{display:block}.cl .rel{flex:0 1 auto}.cmd{font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:40%}td.p{max-width:520px;overflow:hidden}
#tip{position:fixed;z-index:50;max-width:340px;background:#1c1917;color:#fafaf9;border:1px solid #57534e;border-radius:4px;padding:6px 9px;font-size:12px;line-height:1.4;white-space:pre-line;pointer-events:none;display:none;box-shadow:0 4px 14px rgba(0,0,0,.3);word-break:break-word}
@media(prefers-color-scheme:dark){#tip{background:#f5f5f4;color:#1c1917;border-color:#a8a29e}}
.chip.note{color:var(--mut);cursor:help;font-size:11px}
.status{margin:12px 16px 0;padding:7px 12px;border:1px solid var(--bd);border-left-width:4px;border-radius:6px;background:var(--panel);display:flex;gap:8px;flex-wrap:wrap;align-items:baseline}
.status.good{border-left-color:var(--active)}.status.warn{border-left-color:var(--shadowed)}.status.neutral{border-left-color:var(--mut)}
.status .l{color:var(--mut)}
.below{padding:0 16px 24px}.below details>summary{cursor:pointer;font-weight:600;padding:8px 0}
.below table{margin-top:4px}.below td.num,.below th.num{text-align:right;font-variant-numeric:tabular-nums}
.tools{display:flex;gap:6px;margin-left:auto}
details.fold>summary{cursor:pointer;list-style:none;display:flex;gap:8px;align-items:baseline;padding:2px 0}
details.fold>summary::-webkit-details-marker{display:none}
details.fold>summary::before{content:"\\25B8";color:var(--mut);width:10px;flex:none}
details.fold[open]>summary::before{content:"\\25BE"}
details.fold>.body{margin-left:14px;border-left:1px solid var(--bd);padding-left:8px}
.fold .lab{font-weight:600}.fold .cnt{color:var(--mut);font-size:12px}
.emptyrun{color:var(--mut);padding:2px 0 2px 18px;opacity:.7}
.gh{color:var(--mut);font-size:11px;text-transform:uppercase;letter-spacing:.04em;margin:8px 0 2px}
.it{display:flex;gap:8px;align-items:baseline;padding:2px 4px;cursor:pointer;border-radius:3px}.it:hover,.it.sel{background:var(--hi)}.it .mono{flex:none}
`;

const JS = `
const D=JSON.parse(document.getElementById('data').textContent);
const KINDS=['bootstrap','skill','hook','mcp','plugin','command','agent','rule'];
const STAT=['active','conditional','disabled','shadowed','needs-approval','unknown'];
const SCOPES=['managed','user','ancestor','project','local','plugin','builtin','remote'];
const G={
 status:{active:'Loaded at session start. The agent sees this item.',
  conditional:'Loads later, only when needed (a path-scoped rule, a nested CLAUDE.md, or a skill that is only pulled in on demand).',
  disabled:'Present in config but switched off, so it does not load.',
  shadowed:'Overridden by a same-named item from a higher-precedence place. The other copy wins.',
  'needs-approval':'Present but waiting on a trust or approval decision you have not made yet, so it is not loaded.',
  unknown:'Cannot be determined from local files (for example claude.ai connectors, or a file that could not be read).'},
 scope:{managed:'Set by organization or system policy. Highest precedence, usually cannot be overridden.',
  user:'Your personal config in your home directory. Applies to every project.',
  ancestor:'Found in a parent folder above the working directory. Applies to projects beneath it.',
  project:'Defined in the project folder you are working in.',
  local:'Project-local and personal: not meant for version control, or injected by launch flags such as --settings.',
  plugin:'Contributed by an installed plugin.',
  builtin:'Ships with the agent itself. No file on disk defines it.',
  remote:'Provided by an account-level service such as claude.ai connectors.'},
 kind:{bootstrap:'Instruction documents (CLAUDE.md, AGENTS.md) loaded into context at the start, in load order.',
  skill:'A reusable capability the agent can invoke. Its description is listed to the model.',
  hook:'A command that runs automatically on an event (before a tool call, at session start, ...).',
  mcp:'An MCP server: an external tool provider the agent can call.',
  plugin:'An installed plugin bundle that can contribute skills, hooks, commands and servers.',
  command:'A slash command defined by a file.',agent:'A sub-agent definition the main agent can delegate to.',
  rule:'A rule file: extra instructions, often scoped to certain paths.'},
 metric:{
  'file-backed recall':'Of the items the live session actually used that are defined by a file on disk, the share this tool predicted. Excludes harness-builtin items, which no file defines.',
  'raw recall':'Of everything the live session reported, the share this tool predicted. Lower than file-backed recall when the agent has built-in items.',
  'raw precision':'Of the items this tool predicted, the share the live session confirmed.',
  'adjusted precision':'Raw precision after removing predicted-but-unseen items that have a known reason (failed connection, file changed after the session started, remote and unverifiable).',
  'harness-builtin':'Reported by the live session but defined by the agent itself, not by any file. Cannot be predicted from disk.',
  unverifiable:'Defined by a local file that exists but could not be read, so it cannot be predicted.',
  'stale-session':'Predicted but not seen live because its file changed after the session started. The running session has the older version.',
  'failed-connection':'Predicted, but the MCP server failed to connect in the live session.',
  'remote-unverifiable':'A remote connector that cannot be verified from local files.',
  unexplained:'A mismatch with no known reason. These are the ones worth investigating.',
  predicted:'Items this tool says apply to the session.',observed:'Items found in the live session log.',matched:'Predicted items that the live log confirms.'},
 ui:{nft:'Sources that are not a folder on disk: plugins, launch flags, harness built-ins and account connectors.',plugins:'Installed plugins. Each lists the skills, hooks and servers it contributes.',search:'Filter items by name, path, plugin, reason or details.',
  showhidden:'Disabled and shadowed items are hidden by default. Tick to include them.',
  folder:'Items grouped by the folder they come from, from / down to the working directory.',
  bykind:'A flat sortable table of every item with filters.',
  expand:'Open every folder and group.',collapse:'Close every folder and group.',
  copypath:'Copy the full file path to the clipboard.',copyopen:'Copy a shell command that opens this file.',
  launch:'The session was started with command-line flags that change what loads. Hooks defined by --settings files are attributed to scope local.',
  livestatus:'Compares what this tool predicts against the live session log. Only items defined by files are scored; agent built-ins are excluded.',
  th:{kind:'What type of thing this is.',name:'Item name.',scope:'Where in the hierarchy it comes from.',status:'Whether it is actually in effect.',path:'File that defines it. Hover a row for the full path.'}}
};
const $=(t,a,...c)=>{const e=document.createElement(t);for(const k in a||{}){if(k==='class')e.className=a[k];else if(typeof a[k]==='function')e[k]=a[k];else if(a[k]!=null)e.setAttribute(k,a[k])}for(const x of c.flat())if(x!=null&&x!==false)e.append(x.nodeType?x:document.createTextNode(String(x)));return e};
const tip=(e,t)=>{if(t){e.setAttribute('data-tip',t);e.setAttribute('aria-label',t.split('\\n')[0])}return e};
const home=D.home;const til=p=>p&&home&&(p===home||p.startsWith(home+'/'))?'~'+p.slice(home.length):p;
const mid=(p,n=58)=>{p=String(p||'');if(p.length<=n)return p;const k=Math.floor((n-1)/2);return p.slice(0,k)+'\\u2026'+p.slice(p.length-(n-1-k))};
const names=Object.keys(D.harnesses);
const QS=new URLSearchParams(location.search);
const hashTab=decodeURIComponent((location.hash||'').slice(1)||QS.get('tab')||'');
const S={h:names.includes(hashTab)?hashTab:names[0],view:'folder',q:'',scope:new Set(),status:new Set(),kind:new Set(),sel:null,sort:'kind',showInactive:false,all:null,exp:new Set(),open:new Set(),closed:new Set(),liveOpen:QS.get('open')==='live'};
// floating tooltip: shows on hover and keyboard focus, works for every [data-tip]
const tipEl=document.createElement('div');tipEl.id='tip';tipEl.setAttribute('role','tooltip');document.body.append(tipEl);
const showTip=(el)=>{const t=el.getAttribute('data-tip');if(!t)return;tipEl.textContent=t;tipEl.style.display='block';const r=el.getBoundingClientRect(),w=tipEl.offsetWidth,h=tipEl.offsetHeight;
 let x=Math.min(Math.max(8,r.left),innerWidth-w-8),y=r.bottom+6;if(y+h>innerHeight-8)y=Math.max(8,r.top-h-6);tipEl.style.left=x+'px';tipEl.style.top=y+'px'};
const hideTip=()=>{tipEl.style.display='none'};
document.addEventListener('mouseover',e=>{const el=e.target.closest&&e.target.closest('[data-tip]');el?showTip(el):hideTip()});
document.addEventListener('focusin',e=>{const el=e.target.closest&&e.target.closest('[data-tip]');el?showTip(el):hideTip()});
document.addEventListener('focusout',hideTip);document.addEventListener('scroll',hideTip,true);
const cp=(txt,b)=>{const done=()=>{const o=b.textContent;b.textContent='copied';setTimeout(()=>b.textContent=o,900)};
 if(navigator.clipboard)navigator.clipboard.writeText(txt).then(done,()=>fb(txt,done));else fb(txt,done)};
const fb=(t,d)=>{const a=document.createElement('textarea');a.value=t;document.body.append(a);a.select();try{document.execCommand('copy')}catch(e){}a.remove();d()};
const H=()=>D.harnesses[S.h];
const KL={bootstrap:'Bootstrap docs',skill:'Skills',hook:'Hooks',mcp:'MCP servers',plugin:'Plugins',command:'Commands',agent:'Agents',rule:'Rules'};
const gl=(group,key)=>(G[group]&&G[group][key])||'';
const stEl=(s,n)=>tip($('span',{class:'st',style:'color:var(--'+s+')'},n>1?n+' '+s:s),gl('status',s));
const tagEl=(g,v)=>tip($('span',{class:'tag'},v),gl(g,v));
const loc=it=>(it.details&&it.details.listedPath)||it.path;
const itemTip=it=>it.name+'  ['+it.kind+', '+it.scope+', '+it.status+']\\n'+(it.reason?it.reason+'\\n':'')+(it.details&&it.details.command?'command: '+it.details.command+'\\n':'')+loc(it)+(loc(it)!==it.path?'\\n(resolves to '+it.path+')':'');
const tailP=(p,n=84)=>{p=String(p||'');return p.length<=n?p:'\\u2026'+p.slice(p.length-n+1)};
const relEl=(text,full)=>{const e=$('span',{class:'rel mono'},$('bdi',{},text));if(full)e.setAttribute('data-tip',full);return e};
function visible(it){
 if(S.status.size){if(!S.status.has(it.status))return false}
 else if(!S.showInactive&&(it.status==='disabled'||it.status==='shadowed'))return false;
 if(S.q){const q=S.q.toLowerCase();if(!(it.name+' '+it.path+' '+loc(it)+' '+(it.plugin||'')+' '+(it.reason||'')+' '+JSON.stringify(it.details||{})).toLowerCase().includes(q))return false}
 return true}
const cnt=(k)=>{const m={};for(const i of H().items||[])m[i[k]]=(m[i[k]]||0)+1;return m};
function pathBtns(p){return $('span',{},tip($('button',{class:'copy',onclick:e=>{e.stopPropagation();cp(p,e.target)}},'copy path'),G.ui.copypath),' ',tip($('button',{class:'copy',onclick:e=>{e.stopPropagation();cp("open '"+p.replace(/'/g,"'\\\\''")+"'",e.target)}},'copy open cmd'),G.ui.copyopen))}
function select(it){S.sel=it.id;render()}
function detail(){
 const it=(H().items||[]).find(i=>i.id===S.sel);
 const box=$('div',{class:'panel'});
 if(!it){box.append($('div',{class:'mut'},'Select an item to see details.'));return box}
 box.append($('div',{style:'font-weight:600;font-size:14px'},it.name),$('div',{},tagEl('kind',it.kind),' ',tagEl('scope',it.scope),' ',stEl(it.status)));
 const dl=$('dl',{style:'margin-top:8px'});
 const row=(k,v,t)=>{if(v){dl.append(tip($('dt',{},k),t),$('dd',{class:'mono'},v))}};
 row('path',it.path,'Full path of the file that defines this item.');
 if(loc(it)!==it.path)row('scanned at',loc(it),'Where the harness found it: a symlink that points at the path above.');
 row('defined in',it.definedIn,'The config file that references this item, when different from its own file.');
 row('plugin',it.plugin,'The plugin that contributes this item.');row('reason',it.reason,'Why the item has this status.');row('id',it.id,'Stable identifier of this item.');
 box.append(dl,$('div',{style:'margin-top:6px'},pathBtns(it.path)));
 if(it.details&&Object.keys(it.details).length)box.append(tip($('div',{class:'mut',style:'margin-top:8px'},'details (redacted)'),'Kind-specific details. Secrets such as tokens and env values are replaced with <redacted>.'),$('pre',{class:'mono'},JSON.stringify(it.details,null,2)));
 return box}
function toolbar(){
 const b=$('div',{class:'panel bar2'});
 const inp=tip($('input',{type:'search',placeholder:'Search name, path, plugin, details...',value:S.q}),G.ui.search+' Matching groups open automatically.');
 inp.oninput=()=>{S.q=inp.value;const pos=inp.selectionStart;render();const n=document.querySelector('input[type=search]');n.focus();n.setSelectionRange(pos,pos)};
 const inactive=(H().items||[]).filter(i=>i.status==='disabled'||i.status==='shadowed').length;
 const cb=$('input',Object.assign({type:'checkbox',id:'showinactive'},S.showInactive?{checked:''}:{}));cb.onchange=()=>{S.showInactive=cb.checked;render()};
 const lab=tip($('label',{class:'mut nw'},cb,' Show inactive ('+inactive+')'),G.ui.showhidden);
 const views=$('div',{class:'views',style:'margin:0'},[['folder','Folder tree'],['kind','By kind']].map(([k,l])=>tip($('button',{class:S.view===k?'on':'',onclick:()=>{S.view=k;render()}},l),k==='folder'?G.ui.folder:G.ui.bykind)));
 const ex=$('div',{class:'views',style:'margin:0'},tip($('button',{onclick:()=>{S.open.clear();S.closed.clear();S.all='open';render()}},'Expand all'),G.ui.expand),tip($('button',{onclick:()=>{S.open.clear();S.closed.clear();S.all='closed';render()}},'Collapse all'),G.ui.collapse));
 b.append(inp,lab,views,ex);return b}
// ---- grouping helpers
const DEDUPE=new Set(['skill','command','agent']);
const toRows=items=>{const m=new Map();for(const it of items){const k=DEDUPE.has(it.kind)?it.kind+'\\u0000'+it.name:it.id;let r=m.get(k);if(!r){r={kind:it.kind,name:it.name,items:[]};m.set(k,r)}r.items.push(it)}return[...m.values()].sort((a,b)=>a.name.localeCompare(b.name))};
function isOpen(key,def){if(S.q)return true;const k=S.h+'|'+key;return S.open.has(k)?true:S.closed.has(k)?false:S.all==='open'?true:S.all==='closed'?false:def}
function fold(key,def,label,tipText,cntText,bodyFn,cls){
 const d=$('details',{class:'fold '+(cls||'')});if(isOpen(key,def))d.setAttribute('open','');
 d.append(tip($('summary',{},$('span',{class:'lab'},label),cntText?$('span',{class:'cnt'},cntText):null),tipText));
 const body=$('div',{class:'body','data-group':key});d.append(body);
 let done=false;const fill=()=>{if(!done){done=true;bodyFn(body)}};
 if(d.hasAttribute('open'))fill();
 let last=d.open;
 d.addEventListener('toggle',()=>{if(d.open===last)return;last=d.open;const k=S.h+'|'+key;if(d.open){S.open.add(k);S.closed.delete(k);fill()}else{S.closed.add(k);S.open.delete(k)}});
 return d}
const statusBadges=items=>{const m={};for(const i of items)if(i.status!=='active')m[i.status]=(m[i.status]||0)+1;return Object.entries(m).map(([s,n])=>stEl(s,items.length>1?n:1))};
const relIn=(it,dir)=>{if(it.scope==='local'&&/\\.claude\\.json$/.test(it.path))return 'via ~/.claude.json';const p=loc(it);if(dir==null)return til(p).replace(/^.*?\\/plugins\\/cache\\/[^/]+\\/[^/]+\\/[^/]+\\//,'');const pre=dir==='/'?'/':dir+'/';return p.startsWith(pre)?p.slice(pre.length):til(p)};
// one row per (kind,name); N>1 gets a copies badge and an expandable list of every copy
function rowEl(r,dir,ctx){
 const its=r.items;const first=its[0];
 const meta={'data-kind':r.kind,'data-name':r.name};
 const head=()=>[$('span',{class:'nm'},r.name),its.length>1?tip($('span',{class:'x'},'\\u00D7'+its.length),its.length+' copies of this '+r.kind+' with the same name. Expand to see where each one lives and which one wins.'):null,...statusBadges(its)];
 if(its.length===1){
  const e=$('div',Object.assign({class:'row it'+(S.sel===first.id?' sel':''),onclick:()=>select(first)},meta),...head(),first.details&&first.details.command?$('span',{class:'mut mono cmd'},tailP(first.details.command,60)):null,relEl(tailP(relIn(first,dir)),loc(first)));
  return tip(e,itemTip(first))}
 const key=S.h+'|'+ctx+'|'+r.kind+'|'+r.name;
 const d=$('details',Object.assign({class:'copies row'},meta));if(S.exp.has(key)||S.q||S.all==='open')d.setAttribute('open','');
 d.addEventListener('toggle',()=>{if(d.open)S.exp.add(key);else S.exp.delete(key)});
 const sum=$('summary',{class:'it'},...head(),relEl(its.length+' locations',''));
 d.append(sum);
 for(const it of its){const cmd=it.details&&it.details.command;
  d.append(tip($('div',{class:'cl'+(S.sel===it.id?' sel':''),onclick:()=>select(it)},relEl(tailP(relIn(it,dir)),loc(it)),...statusBadges([it]),it.reason?$('span',{class:'mut'},it.reason):null,cmd?$('span',{class:'mut mono'},tailP(cmd,50)):null),itemTip(it)))}
 return d}
function kindGroups(items,dir,ctx,into){
 for(const k of KINDS){const rows=toRows(items.filter(i=>i.kind===k));if(!rows.length)continue;
  into.append(fold(ctx+'|'+k,rows.length<=10,KL[k]+' ('+rows.length+')',gl('kind',k),null,b=>{for(const r of rows)b.append(rowEl(r,dir,ctx))},'sub'))}}
const kindSummary=items=>KINDS.map(k=>{const n=toRows(items.filter(i=>i.kind===k)).length;return n?KL[k].toLowerCase()+' '+n:null}).filter(Boolean).join(', ');
function place(it,chain){
 if(it.kind==='plugin'||it.scope==='plugin')return{cat:'plugin',key:it.plugin||it.name};
 if(it.scope==='builtin')return{cat:'builtin'};if(it.scope==='remote')return{cat:'remote'};if(it.scope==='managed')return{cat:'managed'};
 if(it.details&&it.details.via)return{cat:'launch'};
 if(it.scope==='local'&&/\\.claude\\.json$/.test(it.path)){const m=(it.reason||'').match(/projects\\["(.*)"\\]/);if(m&&chain.includes(m[1]))return{dir:m[1]}}
 const p=loc(it);let best=null;const lastD=chain[chain.length-1];
 for(const d of chain){const pre=d==='/'?'/':d+'/';if(p.startsWith(pre)){const rest=p.slice(pre.length);if(d===lastD||/^[^/]+$/.test(rest)||/^\\.[^/]+\\//.test(rest))best=d}}
 if(best)return{dir:best};
 if(D.session&&D.session.launch&&D.session.harness===S.h)return{cat:'launch'};
 return{cat:'other'}}
function getChain(){
 const h=H();let chain=(h.chain||[]).filter(c=>typeof c==='string').sort((a,b)=>a.length-b.length);
 if(!chain.length){chain=['/'];let a='';for(const x of D.cwd.split('/').filter(Boolean)){a+='/'+x;chain.push(a)}}
 if(chain[0]!=='/')chain.unshift('/');return chain}
function folderTree(){
 const items=(H().items||[]).filter(visible);const chain=getChain();
 const dirItems={},cats={};
 for(const it of items){const pl=place(it,chain);if(pl.dir)(dirItems[pl.dir]||(dirItems[pl.dir]=[])).push(it);else(cats[pl.cat]||(cats[pl.cat]=[])).push({it,key:pl.key})}
 const wrap=$('div',{});
 const tree=$('div',{class:'panel tree'},tip($('div',{class:'gh',style:'margin-top:0'},'Folders, from / down to the working directory'),G.ui.folder));
 const segOf=d=>d==='/'?'/':d===home?'~ (home)':d.split('/').pop();
 const dirTip=d=>d+(d===home?'\\nYour home folder. User config (~/.claude, ~/.codex, ~/.agents, ~/.claude.json) lives here.':'');
 const build=(idx,into)=>{
  if(idx>=chain.length)return;let j=idx;const run=[];
  while(j<chain.length-1&&!(dirItems[chain[j]]||[]).length){run.push(chain[j]);j++}
  if(run.length)into.append(tip($('div',{class:'emptyrun'},run.map(segOf).join(' / ').replace('/ /','/')+'  (0 items)'),'Empty folders. Nothing is defined here.\\n'+run[run.length-1]));
  const d=chain[j];const its=dirItems[d]||[];const isCwd=j===chain.length-1;
  into.append(fold('d:'+d,its.length>0||isCwd,segOf(d)+(isCwd?'  (working directory)':''),dirTip(d),its.length?kindSummary(its):'0 items',b=>{kindGroups(its,d,'d:'+d,b);build(j+1,b)},'dir'))};
 build(0,tree);
 wrap.append(tree);
 const nft=$('div',{class:'panel nft'});
 const total=Object.values(cats).reduce((n,a)=>n+a.length,0);
 if(total){
  nft.append(fold('nft',false,'Not from the folder tree',G.ui.nft,total+' items',nb=>{
   const plug=cats.plugin||[];const byP={};for(const x of plug)(byP[x.key||'?']||(byP[x.key||'?']=[])).push(x.it);
   const full=Object.keys(byP).filter(k=>byP[k].some(i=>i.kind!=='plugin')).sort(),bare=Object.keys(byP).filter(k=>!full.includes(k)).sort();
   if(plug.length)nb.append(fold('nft:plugins',false,'Plugins',G.ui.plugins,full.length+' with content'+(bare.length?', '+bare.length+' bare':''),pb=>{
    for(const k of full){const its=byP[k];const own=its.filter(i=>i.kind==='plugin');const rest=its.filter(i=>i.kind!=='plugin');
     const f=fold('nft:p:'+k,false,k,'Plugin '+k,kindSummary(rest),b=>kindGroups(rest,null,'nft:p:'+k,b),'sub');
     if(own.length&&own.every(i=>i.status!=='active'))f.querySelector('.cnt').append(' ',stEl(own[0].status));
     pb.append(f)}
    if(bare.length)pb.append(tip($('div',{class:'emptyrun'},bare.length+' other enabled plugin'+(bare.length>1?'s':'')+' with no skills, hooks or MCP servers'),bare.join('\\n')))}));
   for(const [c,label,tp] of [['launch','Launch flags (--settings / --mcp-config / --plugin-dir)',G.ui.launch],['builtin','Built into the harness',G.scope.builtin],['remote','Account connectors',G.scope.remote],['managed','Managed policy',G.scope.managed],['other','Other (file outside the folder chain)','Items whose file is not under any folder from / to the working directory.']]){
    const its=(cats[c]||[]).map(x=>x.it);if(!its.length)continue;
    nb.append(fold('nft:'+c,false,label,tp,kindSummary(its),b=>kindGroups(its,null,'nft:'+c,b),'sub'))}
  },'nftroot'));wrap.append(nft)}
 return wrap}
function kindView(){
 const items=(H().items||[]).filter(visible);const wrap=$('div',{});
 for(const k of KINDS){const rows=toRows(items.filter(i=>i.kind===k));if(!rows.length)continue;
  wrap.append($('div',{class:'panel'},fold('k:'+k,rows.length<=40,KL[k],gl('kind',k),rows.length+' name'+(rows.length>1?'s':'')+' ('+items.filter(i=>i.kind===k).length+' items)',b=>{
   const t=$('table',{},$('thead',{},$('tr',{},[['name',G.ui.th.name],['copies','How many items share this name.'],['source',G.ui.th.path],['status','Only shown when not active.']].map(([c,tx])=>tip($('th',{},c),tx)))));
   const tb=$('tbody',{'data-group':'k:'+k});
   for(const r of rows){const its=r.items,first=its[0];
    const src=its.length===1?(first.scope==='plugin'&&first.plugin?'plugin '+first.plugin:tailP(til(loc(first)),70)):its.length+' locations';
    const key=S.h+'|k|'+k+'|'+r.name;const open=S.exp.has(key)||S.q||S.all==='open';
    const tr=$('tr',{class:'row item'+(its.length===1&&S.sel===first.id?' sel':''),'data-kind':k,'data-name':r.name,onclick:()=>{if(its.length===1)select(first);else{if(S.exp.has(key))S.exp.delete(key);else S.exp.add(key);render()}}},
     $('td',{class:'nm'},(its.length>1?(open?'\\u25BE ':'\\u25B8 '):'')+r.name),$('td',{},its.length>1?tip($('span',{class:'x'},'\\u00D7'+its.length),its.length+' copies with the same name. Click to list them.'):''),$('td',{class:'p mono'},relEl(src,its.length===1?loc(first):'')),$('td',{},...statusBadges(its)));
    tb.append(tip(tr,its.length===1?itemTip(first):r.name+': '+its.length+' copies'));
    if(its.length>1&&open)for(const it of its)tb.append(tip($('tr',{class:'cl2'+(S.sel===it.id?' sel':''),onclick:()=>select(it)},$('td',{}),$('td',{}),$('td',{class:'p mono'},relEl(tailP(til(loc(it)),90),loc(it)),it.reason?$('span',{class:'mut'},'  '+it.reason):null),$('td',{},...statusBadges([it]))),itemTip(it)))}
   t.append(tb);b.append(t)},'kindsec')))}
 return wrap}
// ---- live status + details
function liveSummary(){
 const h=H();const c=D.compare[S.h];
 if(h.live&&h.live.error)return $('div',{class:'status neutral'},tip($('span',{class:'l'},'Live session check unavailable:'),G.ui.livestatus),$('span',{},h.live.error));
 if(!c)return null;
 let m=0,den=0,un=0;const parts=[];
 for(const [k,label] of [['bootstrap','bootstrap'],['skills','skills'],['mcp','MCP']]){const r=c[k];const d=r.observed-(r.builtinMissing||[]).length;m+=r.matched;den+=d;un+=(r.unexplainedMissing||[]).length+(r.extraUnexplained||[]).length;parts.push(label+' '+r.matched+'/'+d)}
 const pc=den?Math.round(m/den*100):100;
 const good=pc>=95&&un===0;
 const el=$('div',{class:'status '+(good?'good':'warn')});
 el.append(tip($('b',{},"Matches this session's log: "+pc+'% of file-backed items'),G.ui.livestatus+'\\nScored: '+m+' matched of '+den+' file-backed items the session reported.'),$('span',{class:'mut'},'('+parts.join(', ')+')'));
 if(un)el.append(tip($('b',{style:'color:#dc2626'},un+' unexplained mismatch'+(un>1?'es':'')),G.metric.unexplained));
 const more=tip($('button',{class:'chip',onclick:()=>{S.liveOpen=true;render();const d=document.getElementById('livedetails');if(d)d.scrollIntoView()}},'details'),'Open the full live session check below the list.');
 el.append(more);
 return el}
function launchLine(){
 const l=D.session&&D.session.launch;if(!l||S.h!==D.session.harness)return null;
 const bits=[];for(const [k,v] of Object.entries(l)){if(k==='argv0')continue;
  const vals=Array.isArray(v)?v.map(x=>x&&typeof x==='object'?(x.path||(x.unparsed?'(inline, unparsed)':'(inline JSON)')):String(x)):[String(v)];
  bits.push('--'+k.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())+' '+vals.map(til).join(', '))}
 if(!bits.length)return null;
 const el=$('div',{class:'status neutral launch'},tip($('span',{class:'l'},'Launched with:'),G.ui.launch),$('span',{class:'mono nw',style:'overflow:hidden;text-overflow:ellipsis;max-width:100%'},mid(bits.join('  '),140)));
 return tip(el,G.ui.launch+'\\n'+bits.join('\\n'))}
function liveDetails(){
 const c=D.compare[S.h];if(!c)return null;
 const p=x=>x==null?'n/a':Math.round(x*100)+'%';
 const d=$('details',{id:'livedetails'});if(S.liveOpen)d.setAttribute('open','');d.addEventListener('toggle',()=>{S.liveOpen=d.open});
 d.append(tip($('summary',{},'Live session check (details)'),G.ui.livestatus));
 if(c.source)d.append($('div',{class:'mut mono nw',title:c.source},'log: '+mid(til(String(c.source)),120)));
 const names={bootstrap:'Bootstrap docs',skills:'Skills',mcp:'MCP servers'};
 const heads=[['category',''],['predicted','predicted'],['observed','observed'],['matched','matched'],['raw recall','raw recall'],['file-backed recall','file-backed recall'],['raw precision','raw precision'],['adjusted precision','adjusted precision']];
 const t=$('table',{},$('thead',{},$('tr',{},heads.map(([k,l],i)=>tip($('th',{class:i?'num':''},l||'category'),i?(G.metric[k]||''):'The kind of item compared.')))));
 const tb=$('tbody');
 for(const k of ['bootstrap','skills','mcp']){const r=c[k];tb.append($('tr',{},$('td',{},names[k]),...[r.predicted,r.observed,r.matched,p(r.recall),p(r.recallFileBacked),p(r.precision),p(r.precisionAdjusted)].map(v=>$('td',{class:'num'},v))))}
 t.append(tb);d.append(t);
 const nm=x=>$('div',{class:'mono',title:x},mid(til(x),110));
 const exf=x=>$('div',{},$('span',{class:'mono',title:x.name},mid(til(x.name),110)),x.evidence?$('div',{class:'ev'},'changed '+x.evidence.changedAt+', after session start '+x.evidence.sessionStart):null);
 for(const k of ['bootstrap','skills','mcp']){const r=c[k];
  const ex=(reason)=>(r.extraExplained||[]).filter(e=>e.reason===reason);
  const blocks=[];
  const grp=(cls,key,title,list,fmt)=>{if(!list||!list.length)return;
   const g=cls==='bad'?$('div',{class:'grp bad'},tip($('b',{},title+' ('+list.length+')'),G.metric.unexplained)):$('details',{class:'grp'},tip($('summary',{},title+' ('+list.length+')'),G.metric[key]||''));
   for(const x of list.slice(0,40))g.append(fmt(x));if(list.length>40)g.append($('div',{class:'mut'},'... '+(list.length-40)+' more'));blocks.push(g)};
  grp('bad','unexplained','UNEXPLAINED: seen live, not predicted',r.unexplainedMissing,nm);
  grp('bad','unexplained','UNEXPLAINED: predicted, not seen live',r.extraUnexplained,nm);
  grp('','harness-builtin','harness-builtin',r.builtinMissing,nm);
  grp('','unverifiable','unverifiable',r.unverifiableMissing,nm);
  grp('','failed-connection','failed-connection',ex('failed-connection'),exf);
  grp('','stale-session','stale-session',ex('stale-session'),exf);
  grp('','remote-unverifiable','remote-unverifiable',ex('remote-unverifiable'),exf);
  if(blocks.length)d.append($('div',{class:'gh'},names[k]),...blocks)}
 return $('div',{class:'below'},d)}
function strip(){
 const items=H().items||[];const act={},uniq={};
 for(const i of items)if(i.status==='active'){act[i.kind]=(act[i.kind]||0)+1;(uniq[i.kind]||(uniq[i.kind]=new Set())).add(i.name)}
 const el=$('div',{class:'strip'},tip($('span',{class:'mut'},'loaded:'),'Active items of each kind in this session. For skills, commands and agents, same-named copies are counted as items and the number of unique names is shown in brackets.'));
 for(const k of KINDS)if(act[k]){const u=uniq[k].size;const un=DEDUPE.has(k)&&u!==act[k];el.append(tip($('span',{class:'ac','data-kind':k,'data-count':act[k]},$('b',{},act[k]),' '+KL[k].toLowerCase()+(un?' ('+u+' unique)':'')),'Active '+KL[k].toLowerCase()+': '+act[k]+' items'+(un?', '+u+' unique names':'')+'. '+gl('kind',k)))}
 el.append($('span',{class:'sep'}));
 const st=cnt('status');
 for(const k of ['needs-approval','unknown','shadowed','disabled'])el.append(tip($('button',{class:'chip warn'+(S.status.has(k)?' on':''),onclick:()=>{S.status.has(k)?S.status.delete(k):S.status.add(k);render()}},k+' '+(st[k]||0)),gl('status',k)+'\\nClick to show only these items.'));
 const ws=H().warnings||[];
 if(ws.length)el.append($('span',{class:'sep'}),tip($('span',{class:'chip note',tabindex:'0'},ws.length+' note'+(ws.length>1?'s':'')),'Notes from the audit:\\n'+ws.join('\\n')));
 return el}
function render(){
 hideTip();
 const root=document.getElementById('app');root.textContent='';
 const nav=$('nav',{},names.map(n=>tip($('button',{class:n===S.h?'on':'',onclick:()=>{S.h=n;S.sel=null;try{history.replaceState(null,'','#'+n)}catch(e){}render()}},n+' ('+((D.harnesses[n].items||[]).length)+')'),'Show what the '+n+' harness loads. The number is how many items it found.')));
 const head=$('header',{},$('h1',{},'context-audit'),$('div',{class:'mut mono'},'cwd '+til(D.cwd)+'  |  generated '+D.generatedAt+(D.session&&D.session.harness?'  |  session '+D.session.harness+' pid '+D.session.pid:'')));
 const left=$('div',{},toolbar(),S.view==='folder'?folderTree():kindView());
 root.append(...[head,nav,strip(),launchLine(),liveSummary(),$('main',{},left,$('aside',{},detail())),liveDetails()].filter(Boolean));
 const dt=QS.get('demoTooltip');if(dt){const el=document.querySelector('[data-tip*="'+dt.replace(/"/g,'')+'"]');if(el)showTip(el)}
}
addEventListener('hashchange',()=>{const t=decodeURIComponent((location.hash||'').slice(1));if(names.includes(t)&&t!==S.h){S.h=t;S.sel=null;render()}});
render();
{const y=Number(QS.get('scroll'));if(y)window.scrollTo(0,y)}
`;

const safeJson = (o) => JSON.stringify(o).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

export function renderHtml(report) {
  const compare = {};
  for (const [n, h] of Object.entries(report.harnesses || {})) compare[n] = compareLive(h);
  const data = { ...report, compare };
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>context-audit</title>
<style>${CSS}</style></head>
<body><div id="app"></div>
<script id="data" type="application/json">${safeJson(data)}</script>
<script>${JS}</script>
</body></html>
`;
}
