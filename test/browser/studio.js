/* Actual Chromium UI regression against the selected newly built offline HTML.
   Browser binary is supplied by CI Playwright or SMQ_BROWSER; no in-app external dependencies. */
const fs=require('fs'),path=require('path'),assert=require('assert');
const {chromium}=require('playwright');
const html=path.resolve(process.env.SMQ_HTML||'dist/index.html'),out=path.resolve(process.env.SMQ_QA_OUT||'artifacts/v110-qa/browser');fs.mkdirSync(out,{recursive:true});
const checks=[],errors=[],requests=[],measurements=[];
function ok(c,m){checks.push({ok:!!c,message:m});console.log(c?'PASS':'FAIL',m);assert(c,m);}
const pause=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const browser=await chromium.launch({executablePath:process.env.SMQ_BROWSER||undefined,args:['--no-sandbox','--disable-dev-shm-usage'],headless:true});
try{const ctx=await browser.newContext({viewport:{width:1440,height:900},hasTouch:true,acceptDownloads:true}),page=await ctx.newPage();page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.stack);});page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});page.on('dialog',d=>d.accept());
await page.goto('file://'+html+'?experience=legacy');await page.click('[data-lam="1.31"]');await page.click('[data-mat="si"]');await page.click('#btn-start');await page.click('[data-welcome-track="mzm-dr8"]');await pause(300);
ok(await page.evaluate(()=>document.characterSet==='UTF-8'&&document.documentElement.lang==='ko'&&document.compatMode==='CSS1Compat'),'HTML5 / UTF-8 / Korean language');
async function sheet(id){
 const more=page.locator('#studioMoreToggle');
 if(id==='more'){if(await more.getAttribute('aria-expanded')!=='true')await more.click();}
 else {if(await more.getAttribute('aria-expanded')==='true')await more.click();
 if(id==='inspect'&&await page.locator('#studioInspectExpand').isVisible()&&await page.locator('#studioInspectExpand').getAttribute('aria-expanded')!=='true')await page.locator('#studioInspectExpand').click();}
}
async function fine(k,v){await sheet('tune');let n=page.locator(`[data-fine="${k}"]`);await n.fill(String(v));await n.press('Tab');await pause(150);}
async function lab(k,v){await sheet('tune');let n=page.locator(`[data-lfine="${k}"]`);await n.fill(String(v));await n.press('Tab');await pause(220);}
async function ref(){await sheet('more');await page.click('#studioPreview');const before=await page.evaluate(()=>JSON.stringify(GAME_CTX().d));await page.click('#studioPreview');ok(before===await page.evaluate(()=>JSON.stringify(GAME_CTX().d)),'Reference Preview preserves design');await page.click('#studioApply');await sheet('tune');await pause(250);}
async function test(){await sheet('tune');if(await page.evaluate(()=>LABUI.isOpen()&&LABUI.state().s.cur===4))await page.click('[data-la="run"]');await pause(180);return page.evaluate(()=>SMQ_STUDIO.liveGate()&&SMQ_STUDIO.fresh());}
// Synchronous edit -> evaluation -> Next cannot borrow the previous design's passing result.
await ref();ok(await test()&&await page.locator('#studioNext').isEnabled(),'atomic setup: reference solver PASS and Next enabled');
const atomic=await page.evaluate(()=>{const c=GAME_CTX();let q;for(const p of c.params){for(const v of [p.min,p.max]){const r=c.K.evaluate(c.l,{...c.d,[p.k]:v},null,{full:true});if(!c.K.objectives(c.l,r).t1.every(x=>x.ok)){q={p,v};break;}}if(q)break;}if(!q)throw Error('No failing solver fixture');const e=document.querySelector('#p-'+q.p.k);e.value=q.v;e.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#studioNext').dispatchEvent(new MouseEvent('click',{bubbles:true}));const blocked=!SMQ_STUDIO.fresh()&&document.querySelector('#studioNext').disabled,level=SMQ_STUDIO.workspace().level;document.querySelector('#studioNext').click();const now=GAME_CTX(),identity=SMQ_STUDIO.identity();return {blocked,current:now.d[q.p.k]===q.v,same:SMQ_STUDIO.workspace().level===level,parameter:q.p.k,value:q.v,identity,record:Object.values(SMQ_STUDIO.workspace().tests).find(t=>t.identity===identity),objectives:now.K.objectives(now.l,now.res).t1};});
fs.writeFileSync(path.join(out,'atomic-gate.json'),JSON.stringify(atomic,null,2));
ok(atomic.record?.ok===false&&atomic.objectives.some(x=>!x.ok),'failed evaluation identity matches actual failing solver');
ok(atomic.blocked&&atomic.current&&atomic.same,'immediate input / evaluation / Next uses current solver and blocks failing design');
await sheet('more');await page.click('#studioApply');await pause(180);
ok(await test()&&await page.locator('#studioNext').isEnabled(),'atomic recovery: Reference Apply / evaluation re-enables Next');
// Numeric input updates the real solver without blur; empty text cannot reuse that PASS.
await sheet('tune');const numeric=page.locator(`[data-fine="${atomic.parameter}"]`),validNumber=await numeric.inputValue();
await numeric.fill(String(atomic.value));await page.waitForFunction(()=>GAME_SHELL.evaluationCurrent());
ok(await numeric.evaluate(e=>document.activeElement===e)&&await page.locator('#studioNext').isDisabled()&&!await page.evaluate(()=>SMQ_STUDIO.fresh()),'number input evaluates failing value without blur and keeps focus');
await numeric.fill('');ok(await page.locator('#studioNext').isDisabled(),'blank number input blocks Next');
await numeric.fill(validNumber);await page.waitForFunction(()=>!document.querySelector('#studioNext').disabled);
ok(await page.evaluate(()=>SMQ_STUDIO.fresh()),'number input recovery automatically enables Next without Test');
await sheet('more');await page.keyboard.press('Escape');ok(await page.locator('#studioMoreToggle').getAttribute('aria-expanded')==='false'&&await page.locator('#studioTune').isVisible()&&await page.locator('#studioInspect').isVisible(),'Escape closes only More and preserves both live panels');
// Simultaneous panels, reachable top actions and fixed Canvas at every supported viewport.
await sheet('tune');
ok(await page.locator('#studioActions,#studioTest').count()===0,'no bottom tabs or generic evaluation');
ok(await page.evaluate(()=>document.querySelector('#studioStart').nextElementSibling.id==='studioMoreToggle'&&document.querySelector('#studioMoreToggle').nextElementSibling.id==='studioReplay'),'More between Start New and Guide');
for(const [width,height] of [[1440,900],[1280,800],[1024,640],[390,844],[360,640],[320,568],[844,390],[667,375]]){
 await page.setViewportSize({width,height});await pause(150);
 const m=await page.evaluate(()=>{const rect=id=>document.querySelector(id).getBoundingClientRect().toJSON();return {width:innerWidth,height:innerHeight,canvas:rect('#field'),tune:rect('#studioTune'),inspect:rect('#studioInspect'),overflow:document.documentElement.scrollWidth>innerWidth,bodyScroll:document.body.scrollHeight>innerHeight+1,touch:[...document.querySelectorAll('#studioNav button')].map(e=>e.getBoundingClientRect().height)};});measurements.push(m);
 ok(m.canvas.height>=100&&m.canvas.bottom<=height,`${width}x${height}: first-screen Canvas (${m.canvas.height}px)`);
 ok(!m.overflow&&!m.bodyScroll,`${width}x${height}: no body overflow`);
 ok(m.touch.every(v=>v>=44),`${width}x${height}: 44px top actions`);
 ok(m.tune.height>=100&&m.inspect.height>=76&&m.tune.bottom<=height+1&&m.inspect.bottom<=height+1,`${width}x${height}: Tune and Inspect visible together`);
 ok(m.canvas.bottom<=m.inspect.top+1,`${width}x${height}: results below Canvas`);
 if(width>900||height<=500)ok(m.canvas.right<=m.tune.left,`${width}x${height}: Tune beside Canvas`);
 await page.screenshot({path:path.join(out,`light-${width}x${height}.png`)});
}
await page.setViewportSize({width:1440,height:900});
// Each end-to-end Track uses real UI Reference Apply, parameters, verification and export.
for(const name of ['mzm-dr8','mrr-dr8','mrr-wdm8']){await page.selectOption('#studioTrack',name);await pause(220);const originalWorkspace=await page.evaluate(()=>SMQ_STUDIO.active());ok(originalWorkspace===name,`${name}: independent workspace selected`);
let guard=0;
while(!await page.evaluate(()=>!!SMQ_STUDIO.workspace().finished)){
 if(++guard>25)throw Error(name+' stalled');
 const a=await page.evaluate(()=>({level:SMQ_STUDIO.workspace().level,sub:SMQ_STUDIO.workspace().sub,id:GAME_SHELL.curId(),lab:LABUI.isOpen(),mission:LABUI.isOpen()?LABUI.state().s.cur:null}));console.log('STEP',name,JSON.stringify(a));
 if(!a.lab){await ref();
  if(a.id==='2-1')await fine('h',.45);
  if(a.id==='3A+'&&name==='mrr-dr8'&&!await page.evaluate(()=>SMQ_STUDIO.liveGate())){await fine('share',1);await fine('P',17);await fine('pkg',2);}
  if(a.level===0&&a.sub===0){const d=await page.evaluate(()=>JSON.stringify(GAME_CTX().d));const par=await page.evaluate(()=>GAME_CTX().params[0]);await fine(par.k,par.min);ok(await page.evaluate(()=>GAME_SHELL.evaluationCurrent()&&SMQ_STUDIO.workspace().tests['0:0'].identity===SMQ_STUDIO.identity()),name+': edit is automatically evaluated for current identity');await sheet('more');await page.click('#studioApply');await pause(160);ok(d===await page.evaluate(()=>JSON.stringify(GAME_CTX().d)),name+': Reference Apply reproducible');}
 }else{
  if(a.mission===2){await lab('wr',1);}
  if(a.mission===1){await sheet('tune');await page.click('[data-la="fit"]');await pause(200);
   if(name==='mzm-dr8'){
    const pending=await page.evaluate(()=>{const input=document.querySelector('[data-lfine="W"]'),good=input.value;input.value=input.min;input.dispatchEvent(new Event('input',{bubbles:true}));const blocked=document.querySelector('#studioNext').disabled&&!SMQ_STUDIO.fresh();document.querySelector('#studioNext').dispatchEvent(new MouseEvent('click',{bubbles:true}));return {good,blocked,failed:!LABUI.state().s.live.floorplan,same:SMQ_STUDIO.workspace().level===2};});
    ok(pending.blocked&&pending.failed&&pending.same,'Lab immediate edit / Next evaluates failing geometry before delayed renderer');await lab('W',pending.good);
    await page.evaluate(()=>{const e=document.querySelector('[data-lfine="W"]');e.focus();e.dispatchEvent(new Event('input',{bubbles:true}));e.value='';e.dispatchEvent(new Event('input',{bubbles:true}));e.blur();});await pause(250);
    ok(await page.locator('[data-lfine="W"]').inputValue()===''&&await page.locator('#studioNext').isDisabled(),'Lab delayed render retains blank input after blur and keeps Next blocked');await lab('W',pending.good);
    ok(await page.locator('#studioLabMetrics').isVisible()&&await page.locator('#tiles').isHidden(),'Lab Inspect shows its own metrics, not previous device values');
   }
  }
  if(a.mission===5){await sheet('tune');const download=page.waitForEvent('download');await page.click('#lab-params [data-la="exp-all"]');await download;await pause(180);}
 }
 const pass=await test();if(!pass)console.log('DIAGNOSTIC',JSON.stringify(await page.evaluate(()=>LABUI.isOpen()?LABUI.state().CHK.checks.filter(x=>x.status==='FAIL'):GAME_CTX().ob)));
 ok(pass,`${name}: L${a.level+1}.${a.sub+1} actual engine gate and fresh test`);
 await page.click('#studioNext');await pause(220);
}
const state=await page.evaluate(()=>({completed:SMQ_STUDIO.workspace().completed,lab:SMQ_STUDIO.workspace().lab,designs:SMQ_STUDIO.workspace().designs}));ok(Object.keys(state.completed).length===6,`${name}: all six Levels completed`);ok(state.lab.live.verification&&state.lab.live.export,`${name}: current Verification and Circuit Export valid`);ok(await page.locator('#studioSummary').innerText().then(t=>t.includes('Foundry Readiness: NOT VERIFIED')),`${name}: Foundry Readiness truthful`);fs.writeFileSync(path.join(out,name+'-state.json'),JSON.stringify(state,null,2));await page.screenshot({path:path.join(out,name+'-summary.png')});await page.reload();await pause(350);ok(await page.evaluate(n=>SMQ_STUDIO.active()===n&&Object.keys(SMQ_STUDIO.workspace().completed).length===6,name),`${name}: resume after file reload`);
}
// Fundamentals / LiDAR supported-scope completion, retaining real component learning missions.
for(const name of ['fundamentals','lidar-ttd']){await page.selectOption('#studioTrack',name);await pause(150);let n=0;while(!await page.evaluate(()=>!!SMQ_STUDIO.workspace().finished)){
 if(++n>20)throw Error(name+' stalled');const a=await page.evaluate(()=>({level:SMQ_STUDIO.workspace().level,id:GAME_SHELL.curId(),summary:!!SMQ_STUDIO.tracks.find(t=>t.id===SMQ_STUDIO.active()).levels[SMQ_STUDIO.workspace().level].summary}));
 if(!a.summary){await ref();
  if(a.id==='1-1'||a.id==='1-2'){const moves=await page.evaluate(()=>{const c=GAME_CTX(),K=c.K,m=K.missions(c.l),p=c.params;return m.map(mi=>{for(const pa of p)for(let v=pa.min;v<=pa.max+1e-8;v+=pa.step){const value=+v.toFixed(6),d={...c.d,[pa.k]:value};const r=K.evaluate(c.l,d);if(K.missionDone(c.l,r,mi.id))return {k:pa.k,v:value};}return null;});});for(const mv of moves){if(mv)await fine(mv.k,mv.v);}await sheet('more');await page.click('#studioApply');await pause(150);}
 }
 const pass=await test();if(!pass)console.log('SUPPORTED DIAGNOSTIC',JSON.stringify(await page.evaluate(()=>GAME_CTX().ob)));ok(pass,name+': Level '+(a.level+1)+' current gate');await page.click('#studioNext');await pause(180);
}ok(await page.evaluate(()=>Object.keys(SMQ_STUDIO.workspace().completed).length===6),name+': guided supported flow complete');if(name==='lidar-ttd')ok(await page.locator('#studioSummary').innerText().then(t=>t.includes('미지원')), 'LiDAR summary labels unsupported full PIC GDS');}
// Actual CDP touch events change the view, retain the design, and keep page scroll fixed.
await page.selectOption('#studioTrack','mzm-dr8');await page.selectOption('#studioLevel','0');await page.setViewportSize({width:390,height:844});await page.evaluate(()=>document.querySelectorAll('.studio-sheet.open [data-close-sheet]').forEach(x=>x.click()));await pause(100);
const cdp=await ctx.newCDPSession(page),r=await page.locator('#field').boundingBox(),cx=r.x+r.width/2,cy=r.y+r.height/2,design=await page.evaluate(()=>JSON.stringify(GAME_CTX().d));
await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:cx-35,y:cy,id:1},{x:cx+35,y:cy,id:2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:cx-60,y:cy+20,id:1},{x:cx+80,y:cy+20,id:2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await pause(80);
ok(await page.locator('#field').evaluate(e=>e.style.transform.includes('scale(2)')),'actual two-finger Pinch / Pan changes visualization view');ok(design===await page.evaluate(()=>JSON.stringify(GAME_CTX().d)),'Touch view interaction preserves design');ok(await page.evaluate(()=>scrollY===0),'Touch manipulation does not scroll body');await page.click('#studioFit');ok(await page.locator('#field').evaluate(e=>e.style.transform.includes('scale(1)')),'Fit resets device view');
await sheet('tune');const canvasBefore=await page.locator('#field').boundingBox();await page.locator('#studioTune').evaluate(e=>e.scrollTop=1000);const canvasAfter=await page.locator('#field').boundingBox();ok(canvasBefore.y===canvasAfter.y&&canvasBefore.height===canvasAfter.height,'panel scroll keeps Canvas fixed');const mobileParam=await page.evaluate(()=>({p:GAME_CTX().params[0],v:GAME_CTX().d[GAME_CTX().params[0].k]}));await fine(mobileParam.p.k,mobileParam.v===mobileParam.p.min?mobileParam.p.min+mobileParam.p.step:mobileParam.p.min);ok(await page.evaluate(({p,v})=>GAME_CTX().d[p.k]!==v,mobileParam),'Mobile numeric Parameter control changes actual design');await fine(mobileParam.p.k,mobileParam.v);
await page.selectOption('#studioLevel','2');await pause(200);const lr=await page.locator('#lab-cv').boundingBox(),lh=await page.evaluate(()=>LABUI.state().C.hash),beforeTouch=await page.locator('#lab-cv').screenshot();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:lr.x+100,y:lr.y+100,id:1},{x:lr.x+180,y:lr.y+100,id:2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:lr.x+80,y:lr.y+120,id:1},{x:lr.x+220,y:lr.y+120,id:2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await pause(80);const afterTouch=await page.locator('#lab-cv').screenshot();ok(!beforeTouch.equals(afterTouch),'actual Lab Pinch / two-finger Pan changes rendered canvas');ok(lh===await page.evaluate(()=>LABUI.state().C.hash),'Lab Touch preserves Geometry Hash');await page.click('[data-z="fit"]');await page.screenshot({path:path.join(out,'mobile-lab-touch.png')});
await page.setViewportSize({width:1440,height:900});
// Actual Fab UI repeats the same wafer seed inside an independent Track.
await page.selectOption('#studioTrack','fundamentals');await page.selectOption('#studioLevel','2');await pause(150);await ref();await sheet('inspect');await page.click('#btn-fab');await page.waitForFunction(()=>!GAME_SHELL.busy(),null,{timeout:30000});await pause(600);const fab1=await page.evaluate(()=>SMQ_STUDIO.workspace().progress.fab['1-3'][0]);ok(Number.isInteger(fab1.seed)&&fab1.n===69,'actual Track Fab Run stores seed / sample count');await page.click('#fab-repro [data-seed="fix"]');await page.click('#btn-fab');await page.waitForFunction(()=>!GAME_SHELL.busy(),null,{timeout:30000});await pause(600);const fab2=await page.evaluate(()=>SMQ_STUDIO.workspace().progress.fab['1-3'][0]);ok(fab1.seed===fab2.seed&&fab1.pass===fab2.pass&&fab1.hash===fab2.hash,'Track Fab fixed seed reproduces actual result');ok(await page.locator('#fab-repro').innerText().then(t=>t.includes('95 %')&&t.includes('Monte Carlo')),'Fab displays interval and statistical interpretation');
// Theme preserves exact designs and actual Fab seed/results; preferences restore under file:///.
await page.selectOption('#studioTrack','fundamentals');await page.selectOption('#studioLevel','0');await pause(200);const stateBefore=await page.evaluate(()=>JSON.stringify({d:SMQ_STUDIO.workspace().designs,f:SMQ_STUDIO.workspace().fab,seed:SMQ_STUDIO.workspace().seedFix}));await page.click('#themeToggle');await pause(100);ok(await page.evaluate(()=>document.documentElement.dataset.theme==='dark'),'single HTML Dark toggle');ok(stateBefore===await page.evaluate(()=>JSON.stringify({d:SMQ_STUDIO.workspace().designs,f:SMQ_STUDIO.workspace().fab,seed:SMQ_STUDIO.workspace().seedFix})),'Theme preserves design / Fab / seed');await page.screenshot({path:path.join(out,'dark-desktop.png')});await page.reload();await pause(250);ok(await page.evaluate(()=>document.documentElement.dataset.theme==='dark'),'Theme survives file reload');
ok(errors.length===0,'no browser page errors: '+errors.join(' | '));ok(requests.length===0,'no external HTTP runtime requests');await ctx.close();
}finally{await browser.close();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({html,sha256:require('crypto').createHash('sha256').update(fs.readFileSync(html)).digest('hex'),checks,errors,requests,measurements},null,2));}
console.log('Browser checks:',checks.length,'PASS');})().catch(e=>{console.error(e);process.exit(1)});
