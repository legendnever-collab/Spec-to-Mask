// State contract tests use the actual assembled v1.1 HTML and real shell/persistence adapter.
const {JSDOM}=require('jsdom'),fs=require('fs'),assert=require('assert');
const html=fs.readFileSync(process.env.SMQ_HTML||'dist/index.html','utf8');let count=0;
const ok=(c,m)=>{assert(c,m);count++;console.log('PASS',m)},wait=ms=>new Promise(r=>setTimeout(r,ms));
function boot(seed){const d=new JSDOM(html,{runScripts:'outside-only',pretendToBeVisual:true,url:'https://studio.test/'}),w=d.window;w.ResizeObserver=class{observe(){}};w.confirm=()=>true;w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:30}):k==='createImageData'?(a,b)=>({data:new Uint8ClampedArray(a*b*4)}):k==='createLinearGradient'||k==='createRadialGradient'?()=>({addColorStop(){}}):t[k]??(()=>{}),set:(t,k,v)=>(t[k]=v,true)});Object.defineProperty(w.HTMLElement.prototype,'clientWidth',{get(){return 700}});w.URL.createObjectURL=()=> 'blob:qa';w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=()=>{};Object.entries(seed||{}).forEach(([k,v])=>w.localStorage.setItem(k,typeof v==='string'?v:JSON.stringify(v)));let errors=[];w.addEventListener('error',e=>errors.push(e.message));w.eval(html.split('<script>')[1].split('</script>')[0]);return {w,$:s=>w.document.querySelector(s),errors,close:()=>w.close()};}
(async()=>{const legacy={plat:'si1310',by:{si1310:{stars:{easy:{'1-1':7},std:{'2-3':3},hard:{}},cards:{},best:{},ai:{},missions:{}},sin1550:{stars:{easy:{},std:{'3W':7},hard:{}},cards:{},best:{},ai:{},missions:{}}}};
const seed={'smq3-progress':legacy,'smq3-designs':{si1310:{'1-1':{w:.67}}},'smq3-lab':{si1310:{v:2,d:{W:6},done:{schematic:true}}},'smq3-db':[{lv:'1-1',pf:'si1310',d:{w:.67}}],'smq3-ui':{onboarded:1,studioWelcomed:1}};
let A=boot(seed),{w,$}=A;const settle=()=>new Promise(resolve=>w.requestAnimationFrame(()=>w.requestAnimationFrame(resolve))); await wait(300);ok(w.GAME_CTX().d.w===.67,'v1.0 legacy design automatically restored');const stars=JSON.stringify(JSON.parse(w.localStorage.getItem('smq3-progress')).by),db=w.localStorage.getItem('smq3-db'),lab=w.localStorage.getItem('smq3-lab');
w.SMQ_STUDIO.enter('fundamentals');await wait(180);ok(w.SMQ_STUDIO.workspace().level===0,'new track starts at local Level 1');ok(w.GAME_CTX().d.w!==.67,'legacy design is not silently copied');
$('#studioCopy').click();await wait(180);ok(w.GAME_CTX().d.w===.67,'explicit Legacy Copy imports design and protects a snapshot');
const change=async v=>{const e=$('[data-fine="w"]');e.value=v;e.dispatchEvent(new w.Event('change',{bubbles:true}));await wait(650)};
await change(.8);const one=JSON.stringify(w.SMQ_STUDIO.workspace().designs);w.SMQ_STUDIO.enter('mzm-dr8');await wait(120);ok(w.SMQ_STUDIO.workspace().level===0&&w.GAME_CTX().id==='2-2','another track starts in its own Level 1');w.SMQ_STUDIO.enter('fundamentals');await wait(150);ok(JSON.stringify(w.SMQ_STUDIO.workspace().designs)===one,'track switching resumes exact design');
const before=JSON.stringify(w.GAME_CTX().d);$('#studioPreview').click();ok(JSON.stringify(w.GAME_CTX().d)===before,'preview never applies reference');$('#studioApply').click();await wait(100);ok(w.SMQ_STUDIO.workspace().original['1-1'],'Reference Apply protects Original');await change(.9);$('#studioApply').click();await wait(100);$('#studioOriginal').click();await wait(180);ok(JSON.stringify(w.GAME_CTX().d)===before,'repeated Apply does not overwrite protected Original');
ok(!w.SMQ_STUDIO.fresh()&&$('#studioNext').disabled,'historic stars do not satisfy a fresh hard gate');const canonical=JSON.parse(w.localStorage.getItem('smq3-progress'));ok(Object.entries(legacy.by.si1310.stars).every(([m,o])=>Object.entries(o).every(([id,n])=>(canonical.by.si1310.stars[m][id]&n)===n))&&JSON.stringify(canonical.by.sin1550)===JSON.stringify(legacy.by.sin1550),'all legacy platform stars preserved');ok(w.localStorage.getItem('smq3-lab')===lab,'legacy Lab untouched by Track isolation');ok(JSON.parse(w.localStorage.getItem('smq3-db')).some(r=>r.lv==='1-1'&&r.d.w===.67),'legacy DB record preserved');
const backup=w.eval('SMQ_STORE.makeBackup(true)');ok(backup.data['smq3-studio']?.schema==='smq-studio/1','text backup includes Track workspaces');ok(w.eval('SMQ_STORE').validate(backup).ok,'new full backup schema / checksum valid');const bad=JSON.parse(JSON.stringify(backup));bad.data['smq3-studio'].by.si1310.fundamentals.level=6;ok(!w.eval('SMQ_STORE').validate(bad).ok,'tampered Track checksum rejected');bad.checksum='fnv1a32:'+w.eval('SMQ_STORE').fnv(JSON.stringify(bad.data));ok(!w.eval('SMQ_STORE').validate(bad).ok,'invalid Track structure rejected even with valid checksum');const old=JSON.parse(JSON.stringify(backup));delete old.data['smq3-studio'];old.checksum='fnv1a32:'+w.eval('SMQ_STORE').fnv(JSON.stringify(old.data));ok(w.eval('SMQ_STORE').validate(old).ok,'v1.0 backup without Track key still validates');
ok(!$('#studioActions')&&!$('#studioTest'),'bottom tabs and generic evaluation button removed');
ok($('#studioStart').nextElementSibling.id==='studioMoreToggle'&&$('#studioMoreToggle').nextElementSibling.id==='studioReplay','More is between Start New and Guide');
ok($('#studioTune').classList.contains('open')&&$('#studioInspect').classList.contains('open'),'Tune and Inspect stay open together');
// Input and Next may occur before the queued frame. Never borrow the preceding PASS.
w.SMQ_STUDIO.enter('mzm-dr8',0);$('#studioApply').click();await settle();
ok(w.SMQ_STUDIO.liveGate()&&w.SMQ_STUDIO.fresh()&&!$('#studioNext').disabled,'atomic evaluation setup uses a valid actual design');
const validDesign=JSON.stringify(w.GAME_CTX().d),validIdentity=w.SMQ_STUDIO.identity();
const cc=w.GAME_CTX();let invalid=null;
for(const p of cc.params){for(const v of [p.min,p.max]){const d={...cc.d,[p.k]:v},r=cc.K.evaluate(cc.l,d,null,{full:true});if(!cc.K.objectives(cc.l,r).t1.every(x=>x.ok)){invalid={p,v};break;}}if(invalid)break;}
ok(invalid,'actual solver provides a failing in-range parameter');
const inp=$('#p-'+invalid.p.k);inp.value=invalid.v;inp.dispatchEvent(new w.Event('input',{bubbles:true}));
ok(!w.SMQ_STUDIO.fresh()&&$('#studioNext').disabled,'queued edit immediately invalidates current PASS and disables Next');
// dispatchEvent exercises the guard even if a stale/queued click reaches the disabled button.
$('#studioNext').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
ok(!w.SMQ_STUDIO.fresh()&&$('#studioNext').disabled&&w.GAME_CTX().d[invalid.p.k]===invalid.v,'immediate evaluation evaluates current design and blocks failing Next');
const failedIdentity=w.SMQ_STUDIO.identity(),failedCtx=w.GAME_CTX();
ok(failedIdentity!==validIdentity&&!failedCtx.K.objectives(failedCtx.l,failedCtx.res).t1.every(x=>x.ok),'failed evaluation reports actual failing solver and new design identity');
ok(Object.values(w.SMQ_STUDIO.workspace().tests).some(t=>t.identity===failedIdentity&&t.ok===false),'failed evaluation is recorded against current identity');
const failedLevel=w.SMQ_STUDIO.workspace().level;$('#studioNext').click();ok(w.SMQ_STUDIO.workspace().level===failedLevel,'failing evaluation cannot advance');
const storage=win=>Object.fromEntries(Array.from({length:win.localStorage.length},(_,i)=>{const k=win.localStorage.key(i);return [k,win.localStorage.getItem(k)]}));
const failedBackup=w.eval('SMQ_STORE.makeBackup(true)'),reload=boot(storage(w));await wait(180);
ok(reload.w.SMQ_STUDIO.identity()===failedIdentity&&!reload.w.SMQ_STUDIO.fresh()&&reload.$('#studioNext').disabled,'reload resumes failed design without borrowing previous PASS');reload.close();
w.SMQ_STUDIO.enter('mrr-dr8');w.SMQ_STUDIO.enter('mzm-dr8');
ok(w.SMQ_STUDIO.identity()===failedIdentity&&!w.SMQ_STUDIO.fresh()&&$('#studioNext').disabled,'Track switch preserves failed identity and blocked Next');
// Restore the parameter in the same task, before the queued evaluation.
const restoreInput=$('#p-'+invalid.p.k);restoreInput.value=JSON.parse(validDesign)[invalid.p.k];restoreInput.dispatchEvent(new w.Event('input',{bubbles:true}));await settle();
ok(JSON.stringify(w.GAME_CTX().d)===validDesign&&w.SMQ_STUDIO.liveGate()&&w.SMQ_STUDIO.fresh()&&!$('#studioNext').disabled,'restoring valid parameter and immediate evaluation re-enables Next');
// Protect the failed design as Original, then prove Apply/Original cannot reuse a different identity.
w.SMQ_STUDIO.workspace().original={};const failInput=$('#p-'+invalid.p.k);failInput.value=invalid.v;failInput.dispatchEvent(new w.Event('input',{bubbles:true}));await settle();
$('#studioApply').click();await settle();ok(w.SMQ_STUDIO.fresh(),'Reference Apply and evaluation recover PASS');$('#studioOriginal').click();
ok(w.SMQ_STUDIO.identity()===failedIdentity&&!w.SMQ_STUDIO.fresh()&&$('#studioNext').disabled,'Original Restore blocks the protected failing design');
$('#studioApply').click();await settle();
// Backup restore requires reload, just like the real restore UI.
const restoreBoot=boot(storage(w));await wait(120);ok(restoreBoot.w.eval('SMQ_STORE').restore(failedBackup,{}).ok,'failed-design full backup restores successfully');
const restored=boot(storage(restoreBoot.w));restoreBoot.close();await wait(180);
ok(restored.w.SMQ_STUDIO.identity()===failedIdentity&&!restored.w.SMQ_STUDIO.fresh()&&restored.$('#studioNext').disabled,'backup / reload restores failed identity and blocks prior PASS');restored.close();
w.SMQ_STUDIO.enter('mrr-dr8');$('#studioApply').click();await settle();const fullIdentity=w.SMQ_STUDIO.identity();
ok(w.SMQ_STUDIO.fresh(),'Full Design reference has a passing evaluation');$('[data-gm="guided"]').click();await wait(100);
ok(w.SMQ_STUDIO.identity()!==fullIdentity&&w.GAME_SHELL.evaluationCurrent()&&w.SMQ_STUDIO.workspace().tests['0:0'].identity===w.SMQ_STUDIO.identity(),'Guided mode evaluates its own identity');await settle();const guidedIdentity=w.SMQ_STUDIO.identity();$('[data-gm="full"]').click();await wait(100);
ok(w.SMQ_STUDIO.identity()!==guidedIdentity&&w.GAME_SHELL.evaluationCurrent()&&w.SMQ_STUDIO.workspace().tests['0:0'].identity===w.SMQ_STUDIO.identity(),'Full Design evaluates its own identity');await settle();ok(w.SMQ_STUDIO.fresh()&&!$('#studioNext').disabled,'Full Design reevaluation recovers Next');
// Numeric edits must apply before blur; incomplete / out-of-range input cannot authorize Next.
w.SMQ_STUDIO.enter('mzm-dr8',0);$('#studioApply').click();await settle();
const numeric=$('[data-fine="'+invalid.p.k+'"]');numeric.focus();numeric.value=invalid.v;numeric.dispatchEvent(new w.Event('input',{bubbles:true}));
ok(!w.SMQ_STUDIO.fresh()&&$('#studioNext').disabled,'number input invalidates Next before blur');await settle();
ok(w.GAME_CTX().d[invalid.p.k]===invalid.v&&!w.SMQ_STUDIO.fresh(),'number input automatically evaluates actual failing design');
numeric.value=JSON.parse(validDesign)[invalid.p.k];numeric.dispatchEvent(new w.Event('input',{bubbles:true}));await settle();ok(w.SMQ_STUDIO.fresh(),'number input recovery automatically passes');
numeric.value='';numeric.dispatchEvent(new w.Event('input',{bubbles:true}));$('#studioNext').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));ok($('#studioNext').disabled&&!w.SMQ_STUDIO.fresh()&&$('#studioStatus').textContent==='입력값 확인','empty number input blocks Next and explains why');
numeric.value=invalid.p.max+100;numeric.dispatchEvent(new w.Event('input',{bubbles:true}));await settle();ok(!w.SMQ_STUDIO.fresh()&&$('#studioNext').disabled,'out-of-range numeric input cannot lend old PASS');
$('#studioApply').click();await settle();ok(w.SMQ_STUDIO.fresh(),'Reference recovers from invalid numeric entry');
w.SMQ_STUDIO.enter('mzm-dr8',5);await settle();ok(!w.SMQ_STUDIO.fresh()&&!w.LABUI.state().s.ran,'Lab verification is an explicit action, not auto-awarded');
// Lab also has a delayed renderer: current geometry must gate pending input and export.
w.SMQ_STUDIO.enter('mzm-dr8',2);w.LABUI.mission(1);w.SMQ_STUDIO.workspace().sub=1;
$('[data-la="fit"]').click();await settle();ok(w.SMQ_STUDIO.fresh(),'Lab floorplan fitted design passes automatically');
const labWidth=$('[data-lfine="W"]'),goodWidth=labWidth.value;labWidth.focus();labWidth.value=labWidth.min;labWidth.dispatchEvent(new w.Event('input',{bubbles:true}));
ok(!w.SMQ_STUDIO.fresh()&&$('#studioNext').disabled,'pending Lab number edit invalidates prior PASS before 90ms render');
$('#studioNext').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));ok(!w.SMQ_STUDIO.fresh()&&w.SMQ_STUDIO.workspace().level===2&&!w.LABUI.state().s.live.floorplan,'immediate Lab Next evaluates failing geometry and blocks progression');
const labRestore=$('[data-lfine="W"]');labRestore.value=goodWidth;labRestore.dispatchEvent(new w.Event('input',{bubbles:true}));await wait(250);await settle();ok(w.SMQ_STUDIO.fresh()&&!$('#studioNext').disabled,'Lab numeric recovery automatically enables Next');
ok(w.document.activeElement.dataset.lfine==='W','Lab automatic rendering preserves numeric keyboard focus');
const labEmpty=$('[data-lfine="W"]');labEmpty.value=goodWidth;labEmpty.dispatchEvent(new w.Event('input',{bubbles:true}));labEmpty.value='';labEmpty.dispatchEvent(new w.Event('input',{bubbles:true}));$('#studioNext').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));ok(!w.SMQ_STUDIO.fresh()&&$('#studioNext').disabled,'blank Lab numeric field blocks Next');
labEmpty.blur();await wait(250);await settle();ok($('[data-lfine="W"]').value===''&&!w.SMQ_STUDIO.fresh()&&$('#studioNext').disabled,'pending Lab render preserves invalid draft after blur');
w.SMQ_STUDIO.enter('fundamentals');await wait(100);
const stored={};for(let i=0;i<w.localStorage.length;i++){const k=w.localStorage.key(i);stored[k]=w.localStorage.getItem(k);}A.close();A=boot(stored);await wait(200);ok(A.w.SMQ_STUDIO.active()==='fundamentals'&&JSON.stringify(A.w.GAME_CTX().d)===before,'automatic Track resume after fresh application boot');ok(!A.errors.length,'state regression has no page errors');A.close();
const corrupt=boot({...seed,'smq3-studio':'{"broken":'});await wait(80);ok(corrupt.w.eval('SMQ_STORE').quarantine()['smq3-studio'][0].raw==='{"broken":','corrupt Track JSON raw preserved in Quarantine');corrupt.close();
console.log(count+' studio state checks passed');process.exit(0);})().catch(e=>{console.error(e);process.exit(1)});
