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

`;

const JS = `
const D=JSON.parse(document.getElementById('data').textContent);
const KINDS=['bootstrap','skill','hook','mcp','plugin','command','agent','rule'];
const STAT=['active','conditional','disabled','shadowed','needs-approval','unknown'];
const $=(t,a,...c)=>{const e=document.createElement(t);for(const k in a||{}){if(k==='class')e.className=a[k];else if(k==='onclick')e.onclick=a[k];else e.setAttribute(k,a[k])}for(const x of c.flat())if(x!=null)e.append(x.nodeType?x:document.createTextNode(String(x)));return e};
const home=D.home;const til=p=>p&&home&&(p===home||p.startsWith(home+'/'))?'~'+p.slice(home.length):p;
const names=Object.keys(D.harnesses);
const mid=(p,n=58)=>{p=String(p||'');if(p.length<=n)return p;const k=Math.floor((n-1)/2);return p.slice(0,k)+'\u2026'+p.slice(p.length-(n-1-k))};
const hashTab=decodeURIComponent((location.hash||'').slice(1)||new URLSearchParams(location.search).get('tab')||'');
const S={h:names.includes(hashTab)?hashTab:names[0],view:'hier',q:'',scope:new Set(),status:new Set(),kind:new Set(),sel:null,sort:'kind',showHidden:false};
const cp=(txt,b)=>{const done=()=>{const o=b.textContent;b.textContent='copied';setTimeout(()=>b.textContent=o,900)};
 if(navigator.clipboard)navigator.clipboard.writeText(txt).then(done,()=>fb(txt,done));else fb(txt,done)};
const fb=(t,d)=>{const a=document.createElement('textarea');a.value=t;document.body.append(a);a.select();try{document.execCommand('copy')}catch(e){}a.remove();d()};
const H=()=>D.harnesses[S.h];
const cname=c=>typeof c==='string'?c:(c&&c.path)||'';
function visible(it,ignoreFilters){
 if(!S.showHidden&&(it.status==='disabled'||it.status==='shadowed')&&!S.status.has(it.status))return false;
 if(ignoreFilters)return true;
 if(S.scope.size&&!S.scope.has(it.scope))return false;
 if(S.status.size&&!S.status.has(it.status))return false;
 if(S.kind.size&&!S.kind.has(it.kind))return false;
 if(S.q){const q=S.q.toLowerCase();if(!(it.name+' '+it.path+' '+(it.plugin||'')+' '+(it.reason||'')+' '+JSON.stringify(it.details||{})).toLowerCase().includes(q))return false}
 return true}
function chips(set,vals,counts){return $('div',{class:'chips'},vals.filter(v=>counts[v]).map(v=>$('button',{class:'chip'+(set.has(v)?' on':''),onclick:()=>{set.has(v)?set.delete(v):set.add(v);render()}},v+' '+counts[v])))}
const cnt=(k)=>{const m={};for(const i of H().items||[])m[i[k]]=(m[i[k]]||0)+1;return m};
function pathBtns(p){return $('span',{},$('button',{class:'copy',onclick:e=>{e.stopPropagation();cp(p,e.target)}},'copy path'),' ',$('button',{class:'copy',onclick:e=>{e.stopPropagation();cp("open '"+p.replace(/'/g,"'\\\\''")+"'",e.target)}},'copy open cmd'))}
const stEl=s=>$('span',{class:'st',style:'color:var(--'+s+')'},s);
function select(it){S.sel=it.id;render()}
function detail(){
 const it=(H().items||[]).find(i=>i.id===S.sel);
 const box=$('div',{class:'panel'});
 if(!it){box.append($('div',{class:'mut'},'Select an item to see details.'));return box}
 box.append($('div',{style:'font-weight:600;font-size:14px'},it.name),$('div',{},$('span',{class:'tag'},it.kind),' ',$('span',{class:'tag'},it.scope),' ',stEl(it.status)));
 const dl=$('dl',{style:'margin-top:8px'});
 const row=(k,v)=>{if(v){dl.append($('dt',{},k),$('dd',{class:'mono'},v))}};
 row('path',it.path);row('defined in',it.definedIn);row('plugin',it.plugin);row('reason',it.reason);row('id',it.id);
 box.append(dl,$('div',{style:'margin-top:6px'},pathBtns(it.path)));
 if(it.details&&Object.keys(it.details).length)box.append($('div',{class:'mut',style:'margin-top:8px'},'details (redacted)'),$('pre',{class:'mono'},JSON.stringify(it.details,null,2)));
 return box}
function toolbar(){
 const b=$('div',{class:'panel'});
 b.append($('input',{type:'search',placeholder:'Search name, path, plugin, details...',value:S.q,oninput:null}));
 const inp=b.firstChild;inp.oninput=()=>{S.q=inp.value;const pos=inp.selectionStart;render();const n=document.querySelector('input[type=search]');n.focus();n.setSelectionRange(pos,pos)};
 const items=(H().items||[]).filter(i=>visible(i,true));
 const c=(k)=>{const m={};for(const i of items)m[i[k]]=(m[i[k]]||0)+1;return m};
 b.append(chips(S.kind,KINDS,c('kind')),chips(S.scope,['managed','user','ancestor','project','local','plugin','builtin','remote'],c('scope')),chips(S.status,STAT,cnt('status')));
 const hid=(H().items||[]).filter(i=>i.status==='disabled'||i.status==='shadowed').length;
 if(hid){const cb=$('input',Object.assign({type:'checkbox'},S.showHidden?{checked:''}:{}));cb.onchange=()=>{S.showHidden=cb.checked;render()};b.append($('label',{class:'mut'},cb,' show disabled/shadowed ('+hid+' hidden by default)'))}
 return b}
function table(){
 const items=(H().items||[]).filter(i=>visible(i));
 const key={kind:i=>KINDS.indexOf(i.kind)+i.name,name:i=>i.name,scope:i=>i.scope+i.name,status:i=>i.status+i.name,path:i=>i.path};
 items.sort((a,b)=>String(key[S.sort](a)).localeCompare(String(key[S.sort](b))));
 const t=$('table',{},$('thead',{},$('tr',{},['kind','name','scope','status','path'].map(c=>$('th',{onclick:()=>{S.sort=c;render()}},c+(S.sort===c?' v':''))))));
 const tb=$('tbody');
 for(const it of items)tb.append($('tr',{class:'item'+(S.sel===it.id?' sel':''),onclick:()=>select(it)},$('td',{},it.kind),$('td',{},it.name),$('td',{},$('span',{class:'tag'},it.scope)),$('td',{},stEl(it.status)),$('td',{class:'p mono',title:it.path},mid(til(it.path)))));
 t.append(tb);
 return $('div',{class:'panel'},$('div',{class:'mut'},items.length+' items'),t)}
function hier(){
 const h=H();const items=(h.items||[]).filter(i=>visible(i));
 let chain=(h.chain||[]).filter(c=>typeof c==='string').sort((a,b)=>a.length-b.length);
 if(!chain.length){const root=h.projectRoot||D.cwd;const parts=root.split('/').filter(Boolean);chain=['/'];let a='';for(const x of parts){a+='/'+x;chain.push(a)}}
 const nodes=[];const byKey={};
 const node=(key,title,sub)=>{if(!byKey[key]){byKey[key]={title,sub,items:[]};nodes.push(byKey[key])}return byKey[key]};
 const wrap=$('div');
 const ownScopes={managed:'Managed (organization policy)',user:'User ('+til(home)+')',builtin:'Built-in',remote:'Remote (claude.ai connectors)'};
 const buckets=[];
 const add=(order,key,title,sub,it)=>{let b=byKey[key];if(!b){b=byKey[key]={order,title,sub,items:[]};buckets.push(b)}b.items.push(it)};
 chain.forEach((d,i)=>{byKey['dir:'+d]={order:100+i,title:til(d),sub:i===chain.length-1?'working directory':(d===home?'home':'ancestor'),items:[]};buckets.push(byKey['dir:'+d])});
 for(const it of items){
  if(ownScopes[it.scope])add(it.scope==='managed'?0:it.scope==='user'?1:5,'s:'+it.scope,ownScopes[it.scope],'',it);
  else if(it.scope==='plugin')add(200,'plugin:'+(it.plugin||'?'),'Plugin '+(it.plugin||'(unknown)'),'',it);
  else{let best=null;for(const d of chain)if(it.path===d||(d==='/'||it.path.startsWith(d+'/')))best=d;
   if(best)byKey['dir:'+best].items.push(it);else add(300,'other','Other','',it)}}
 buckets.sort((a,b)=>a.order-b.order);
 for(const b of buckets){
  if(!b.items.length&&b.order<100)continue;
  const kids=$('div');
  b.items.sort((x,y)=>KINDS.indexOf(x.kind)-KINDS.indexOf(y.kind));
  for(const it of b.items)kids.append($('div',{class:'it'+(S.sel===it.id?' sel':''),onclick:()=>select(it)},$('span',{class:'tag'},it.kind),$('span',{},it.name),stEl(it.status),$('span',{class:'mut mono nw',title:it.path},mid(til(it.path),52))));
  if(!b.items.length)kids.append($('div',{class:'mut'},'contributes nothing'));
  wrap.append($('div',{class:'node'},$('div',{class:'nh'},b.title,' ',$('span',{class:'mut',style:'font-weight:400'},b.sub+' ('+b.items.length+')')),kids))}
 return $('div',{class:'panel'},wrap)}
function live(){
 const c=D.compare[S.h];const h=H();
 if(h.live&&h.live.error)return $('div',{class:'full'},$('div',{class:'panel'},$('b',{},'Live: '),h.live.error));
 if(!c)return null;
 const p=x=>x==null?'n/a':Math.round(x*100)+'%';
 const box=$('div',{class:'panel'},$('div',{style:'font-weight:600'},'Live vs predicted'),c.source?$('div',{class:'mut mono nw',title:c.source},mid(til(String(c.source)),110)):null);
 const cards=$('div',{class:'cards'});
 const names={bootstrap:'Bootstrap docs',skills:'Skills',mcp:'MCP servers'};
 for(const k of ['bootstrap','skills','mcp']){
  const r=c[k];const card=$('div',{class:'card'},$('h3',{},names[k]));
  if(!r){card.append($('div',{class:'muted'},"Not observable: this harness's session log does not record it."));cards.append(card);continue}
  const m=$('div',{class:'m'});
  const row=(l,v,bar)=>{m.append($('span',{},l),$('span',{},v))};
  row('predicted / observed / matched',r.predicted+' / '+r.observed+' / '+r.matched);
  row('recall (raw)',p(r.recall));row('recall (file-backed)',p(r.recallFileBacked));
  row('precision (raw)',p(r.precision));row('precision (adjusted)',p(r.precisionAdjusted));
  if(r.hiddenFromListing)row('hidden from model listing',r.hiddenFromListing);
  card.append(m);
  const grp=(cls,title,list,fmt)=>{if(!list||!list.length)return;
   const g=cls==='bad'?$('div',{class:'grp bad'},$('b',{},title+' ('+list.length+')')):$('details',{class:'grp'},$('summary',{},title+' ('+list.length+')'));
   for(const x of list.slice(0,40)){g.append(fmt(x))}
   if(list.length>40)g.append($('div',{class:'mut'},'... '+(list.length-40)+' more'));card.append(g)};
  const nm=x=>$('div',{class:'mono',title:x},mid(til(x),70));
  const ex=(reason)=>(r.extraExplained||[]).filter(e=>e.reason===reason);
  const exf=x=>$('div',{},$('span',{class:'mono',title:x.name},mid(til(x.name),70)),x.evidence?$('div',{class:'ev'},'changed '+x.evidence.changedAt+' after session start '+x.evidence.sessionStart):null);
  grp('bad','UNEXPLAINED: observed, not predicted',r.unexplainedMissing,nm);
  grp('bad','UNEXPLAINED: predicted, not observed',r.extraUnexplained,nm);
  grp('','harness-builtin (observed, no file)',r.builtinMissing,nm);
  grp('','unverifiable (file unreadable)',r.unverifiableMissing,nm);
  grp('','failed-connection (predicted)',ex('failed-connection'),exf);
  grp('','stale-session (file changed after start)',ex('stale-session'),exf);
  grp('','remote-unverifiable (predicted)',ex('remote-unverifiable'),exf);
  cards.append(card)}
 box.append(cards);
 return $('div',{class:'full'},box)}
function launchBox(){
 const l=D.session&&D.session.launch;if(!l||S.h!==D.session.harness)return null;
 const box=$('div',{class:'panel launch'},$('div',{style:'font-weight:600'},'Launch flags'),$('div',{class:'mut'},'This session was started with flags that change its context. Hooks defined by --settings files are attributed to scope local.'));
 const dl=$('dl',{style:'margin-top:6px;grid-template-columns:150px 1fr'});
 for(const [k,v] of Object.entries(l)){if(k==='argv0')continue;
  const vals=Array.isArray(v)?v.map(x=>x&&typeof x==='object'?(x.path||(x.unparsed?'(inline, unparsed)':'(inline JSON) '+JSON.stringify(x.inline).slice(0,120))):String(x)):[String(v)];
  dl.append($('dt',{},k),$('dd',{class:'mono'},vals.join(', ')))}
 box.append(dl);return $('div',{class:'full'},box)}
function strip(){
 const items=H().items||[];const act={};for(const i of items)if(i.status==='active')act[i.kind]=(act[i.kind]||0)+1;
 const el=$('div',{class:'strip'},$('span',{class:'mut'},'active:'));
 for(const k of KINDS)if(act[k])el.append($('button',{class:'chip'+(S.kind.has(k)?' on':''),onclick:()=>{S.kind.has(k)?S.kind.delete(k):S.kind.add(k);S.view='kind';render()}},k+' '+act[k]));
 el.append($('span',{class:'sep'}),$('span',{class:'mut'},'attention:'));
 const st=cnt('status');
 for(const k of ['needs-approval','unknown','shadowed','disabled'])el.append($('button',{class:'chip warn'+(S.status.has(k)?' on':''),onclick:()=>{S.status.has(k)?S.status.delete(k):S.status.add(k);S.view='kind';render()}},k+' '+(st[k]||0)));
 return el}
function render(){
 const root=document.getElementById('app');root.textContent='';
 const nav=$('nav',{},names.map(n=>$('button',{class:n===S.h?'on':'',onclick:()=>{S.h=n;S.sel=null;try{history.replaceState(null,'','#'+n)}catch(e){}render()}},n+' ('+((D.harnesses[n].items||[]).length)+')')));
 const h=H();
 const head=$('header',{},$('h1',{},'context-audit'),$('div',{class:'mut mono'},'cwd '+til(D.cwd)+'  |  generated '+D.generatedAt+(D.session&&D.session.harness?'  |  session '+D.session.harness+' pid '+D.session.pid:'')));
 const left=$('div',{},$('div',{class:'views'},[['hier','Hierarchy'],['kind','By kind']].map(([k,l])=>$('button',{class:S.view===k?'on':'',onclick:()=>{S.view=k;render()}},l))),toolbar(),S.view==='hier'?hier():table());
 for(const w of h.warnings||[])left.prepend($('div',{class:'panel',style:'color:var(--shadowed)'},'warning: '+w));
 const lv=live();
 root.append(...[head,nav,strip(),launchBox(),lv,$('main',{},left,$('aside',{},detail()))].filter(Boolean));
}
render();
{const y=Number(new URLSearchParams(location.search).get('scroll'));if(y)window.scrollTo(0,y)}
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
