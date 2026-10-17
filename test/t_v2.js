// P1 model/state/persistence checks against the actual newly assembled executable.
const fs=require('fs'),assert=require('assert'),{JSDOM}=require('jsdom');let count=0;
const html=fs.readFileSync(process.env.SMQ_HTML||'dist/spec-to-mask-v2.0.0-alpha.1-p1.html','utf8');
const ok=(v,m)=>{assert(v,m);count++;console.log('PASS',m);};
function boot(seed={}){const dom=new JSDOM(html,{runScripts:'outside-only',pretendToBeVisual:true,url:'https://v2.test/?experience=v2'}),w=dom.window;w.ResizeObserver=class{observe(){}};w.confirm=()=>true;w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:30}):k==='createImageData'?(a,b)=>({data:new Uint8ClampedArray(a*b*4)}):k==='createLinearGradient'||k==='createRadialGradient'?()=>({addColorStop(){}}):t[k]??(()=>{}),set:(t,k,v)=>(t[k]=v,true)});w.scrollTo=()=>{};w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};w.URL.createObjectURL=()=> 'blob:qa';w.URL.revokeObjectURL=()=>{};Object.defineProperty(w.HTMLElement.prototype,'clientWidth',{get(){return 700}});Object.entries(seed).forEach(([k,v])=>w.localStorage.setItem(k,typeof v==='string'?v:JSON.stringify(v)));const errors=[];w.addEventListener('error',e=>errors.push(e.message));w.eval(html.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/^const (\w+) =/gm,'var $1 ='));return {w,$:s=>w.document.querySelector(s),dom,errors};}
const seed={'smq3-studio':{schema:'smq-studio/1',by:{},active:null,journey:{schema:'smq-journey/1',active:true,by:{}}},'smq3-designs':{si1310:{'1-1':{w:.67}}},'smq3-lab':{si1310:{v:2,d:{W:6},done:{schematic:true}}},'smq3-db':[{lv:'1-1',pf:'si1310',d:{w:.67}}]};
const A=boot(seed),{w,$}=A,C=w.eval('SMQ_V2_CORE'),S=w.eval('SMQ_V2_SCHEMA'),store=w.eval('SMQ_STORE'),before=JSON.stringify(seed);
const edit=(val,id='#v2Radius')=>{const e=$(id);e.value=String(val);e.dispatchEvent(new w.Event('input',{bubbles:true}));};
try{
 for(const [p,d]of Object.entries(S.domains)){
  const ws=C.fresh(p),pf=w.eval('PLATFORMS')[p];
  for(const R of [d.min,d.min+(d.max-d.min)/2,d.max]){
   ws.R=R;const r=C.evaluate(ws,p,3),raw=w.eval('LAB').routeLoss([{t:'A',c:[0,0],r:R,a0_deg:0,a1_deg:90,w:pf.w0}],pf);
   ok(Math.abs(r.bend-raw.bend)<1e-15&&r.total===raw.total&&r.prop===raw.prop,p+': unchanged LAB arc loss at '+R);
   ok(Math.abs(r.length-Math.PI*R/2)<1e-12&&r.footprint===(R+pf.w0/2)**2,p+': physical geometry uses declared radius and width');
   ok(r.through>0&&r.through<=1&&!r.externalVerified,p+': passive power and honest model confidence');
  }
  ok(!C.matches(C.evaluate(ws,p,2),ws,p,3),p+': previous request cannot be current');
  const r=C.evaluate(ws,p,3);ws.revision++;ok(!C.matches(r,ws,p,3),p+': previous revision invalidated');ws.revision--;ws.designId+='-other';ok(!C.matches(r,ws,p,3),p+': same revision on another design rejected');
  for(const R of [NaN,Infinity,d.min-1,d.max+1])ok(!S.radius(R,p),p+': invalid radius rejected');
 }
 $('#v2Start').click();ok(w.SMQ_V2.evaluateNow()&&w.SMQ_V2.current(),'initial state evaluated without Verify');let initial=w.SMQ_V2.result();
 edit(2);ok(!w.SMQ_V2.current()&&$('#v2Loss').textContent==='—','edit synchronously invalidates prior result');ok(w.SMQ_V2.evaluateNow(),'edited value evaluates');let result=w.SMQ_V2.result();ok(result.bend<initial.bend&&result.footprint>initial.footprint,'larger radius reduces radiation and increases area');
 ok([...w.document.querySelectorAll('[data-v2-view]')].every(e=>e.dataset.identity===result.identity),'physical view / plot / KPI use same full identity');
 $('#v2Capture').click();edit(3);w.SMQ_V2.evaluateNow();$('#v2Restore').click();w.SMQ_V2.evaluateNow();ok(w.SMQ_V2.state().by.si1310.R===2,'comparison restore uses captured design');$('#v2Original').click();w.SMQ_V2.evaluateNow();ok(w.SMQ_V2.state().by.si1310.R===1,'Original protected independently');
 const b=JSON.stringify(w.SMQ_V2.state());$('#v2LearnButton').click();$('#v2LearnClose').click();ok(JSON.stringify(w.SMQ_V2.state())===b,'Learn is read only for complete state');
 edit('', '#v2FineRadius');ok(!w.SMQ_V2.current()&&!w.SMQ_V2.evaluateNow(),'blank numeric value cannot borrow old result');edit(100,'#v2FineRadius');ok(!w.SMQ_V2.current(),'out-of-domain numeric input rejected');
 $('#v2Skip').click();ok(w.SMQ_V2.state().scene==='summary'&&w.SMQ_V2.state().by.si1310.lastOutcome==='skipped','Skip remains available for invalid input');
 for(const [k,v]of Object.entries(seed))ok(w.localStorage.getItem(k)===JSON.stringify(v),'P1 preserves existing '+k+' bytes');ok(before===JSON.stringify(seed),'seed fixture not mutated');
 let backup=store.makeBackup(true);ok(backup.data['smq3-studio'].journey.schema==='smq-journey/1','PR23 nested Journey preserved in Full Backup without granting v2 completion');ok(backup.data[S.KEY]&&store.validate(backup).ok,'Full Backup includes validated v2 workspace');
 const bad=JSON.parse(JSON.stringify(backup));bad.data[S.KEY].by.si1310.R=-1;bad.checksum='fnv1a32:'+store.fnv(JSON.stringify(bad.data));ok(!store.validate(bad).ok,'structurally bad v2 backup rejected with valid checksum');
 const old=JSON.parse(JSON.stringify(backup));delete old.data[S.KEY];old.checksum='fnv1a32:'+store.fnv(JSON.stringify(old.data));ok(store.validate(old).ok,'old backup without v2 namespace remains valid');
 $('#v2Repeat').click();edit(2);w.SMQ_V2.evaluateNow();const restored=store.restore(backup,{ctx:{platforms:w.PLATFORMS}});ok(restored.ok&&JSON.parse(w.localStorage.getItem(S.KEY)).by.si1310.R===1,'Full Restore applies validated v2 data transactionally');const undone=store.undo({ctx:{platforms:w.PLATFORMS}});ok(undone.ok&&JSON.parse(w.localStorage.getItem(S.KEY)).by.si1310.R===2,'Undo Restore recovers preceding v2 design');
 const stored=Object.fromEntries(Array.from({length:w.localStorage.length},(_,i)=>{const k=w.localStorage.key(i);return [k,w.localStorage.getItem(k)];}));
 const B=boot(stored);ok(B.w.SMQ_V2.state().by.si1310.designId===w.SMQ_V2.state().by.si1310.designId,'reload preserves design identity and history');ok(!B.w.SMQ_V2.current(),'reload does not load saved current-result evidence');B.dom.window.close();
 const D=boot({[S.KEY]:'{broken-json'});ok(D.w.eval('SMQ_STORE').quarantine()[S.KEY][0].raw==='{broken-json','corrupt v2 raw bytes quarantined before reset');D.dom.window.close();
 const E=boot();E.$('#v2Start').click();E.$('#v2Continue').click();ok(E.w.SMQ_V2.state().by.si1310.completion.kind==='unobserved','Continue without manipulation does not award completion');E.dom.window.close();
 const F=boot();F.$('#v2Start').click();F.$('#v2Skip').click();ok(!F.w.SMQ_V2.state().by.si1310.observed&&F.w.SMQ_V2.state().by.si1310.completion.kind==='skipped','Skip does not award observed completion');F.dom.window.close();
 const H=boot();H.$('#v2Start').click();const set=H.w.Storage.prototype.setItem;H.w.Storage.prototype.setItem=function(k,v){if(k===S.KEY)throw new H.w.DOMException('quota','QuotaExceededError');return set.call(this,k,v);};const hi=H.$('#v2Radius');hi.value='2';hi.dispatchEvent(new H.w.Event('input',{bubbles:true}));ok(H.w.document.querySelector('#v2SaveBanner').textContent.includes('실패'),'failed v2 write announces Save failure');H.w.Storage.prototype.setItem=set;H.dom.window.close();
 ok(A.errors.length===0,'no script errors');
 console.log(count+' P1 state/model checks passed');
}finally{A.dom.window.close();}
