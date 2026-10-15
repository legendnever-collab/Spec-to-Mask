/* Actual Chromium UI regression against the selected newly built offline HTML.
   Browser binary is supplied by CI Playwright or SMQ_BROWSER; no in-app external dependencies. */
const fs=require('fs'),path=require('path'),assert=require('assert');
const {chromium}=require('playwright');
const html=path.resolve(process.env.SMQ_HTML||'dist/index.html'),out=path.resolve(process.env.SMQ_QA_OUT||'artifacts/v110-qa/browser');fs.mkdirSync(out,{recursive:true});
const checks=[],errors=[],requests=[],measurements=[];
function ok(c,m){checks.push({ok:!!c,message:m});console.log(c?'PASS':'FAIL',m);assert(c,m);}
const pause=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const browser=await chromium.launch({executablePath:process.env.SMQ_BROWSER||undefined,args:process.env.SMQ_BROWSER?['--no-sandbox','--disable-gpu','--disable-software-rasterizer','--no-zygote','--single-process','--disable-dev-shm-usage']:['--no-sandbox'],headless:true});
try{const ctx=await browser.newContext({viewport:{width:1440,height:900},hasTouch:true,acceptDownloads:true}),page=await ctx.newPage();page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.stack);});page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});page.on('dialog',d=>d.accept());
await page.goto('file://'+html);await page.click('[data-lam="1.31"]');await page.click('[data-mat="si"]');await page.click('#btn-start');await page.click('[data-welcome-track="mzm-dr8"]');await pause(300);
ok(await page.evaluate(()=>document.characterSet==='UTF-8'&&document.documentElement.lang==='ko'&&document.compatMode==='CSS1Compat'),'HTML5 / UTF-8 / Korean language');
async function sheet(id){const e=page.locator('#studio'+id[0].toUpperCase()+id.slice(1));if(!(await e.evaluate(x=>x.classList.contains('open'))))await page.click(`#studioActions [data-sheet="${id}"]`);}
async function fine(k,v){await sheet('tune');let n=page.locator(`[data-fine="${k}"]`);await n.fill(String(v));await n.press('Tab');await pause(150);}
async function lab(k,v){await sheet('tune');let n=page.locator(`[data-lk="${k}"]`);await n.evaluate((e,v)=>{e.value=String(v);e.dispatchEvent(new Event('input',{bubbles:true}));},v);await pause(220);}
async function ref(){await sheet('more');await page.click('#studioPreview');const before=await page.evaluate(()=>JSON.stringify(GAME_CTX().d));await page.click('#studioPreview');ok(before===await page.evaluate(()=>JSON.stringify(GAME_CTX().d)),'Reference Preview preserves design');await page.click('#studioApply');await pause(250);}
async function test(){await page.click('#studioTest');await pause(180);return page.evaluate(()=>SMQ_STUDIO.liveGate()&&SMQ_STUDIO.fresh());}
// Viewport geometry; panels measured separately from the actual visible canvas.
for(const [width,height] of [[1440,900],[1280,800],[1024,640],[390,844],[360,640],[320,568],[844,390],[667,375]]){await page.setViewportSize({width,height});if(width<=900)await page.evaluate(()=>document.querySelectorAll('[data-close-sheet]').forEach(e=>{if(e.closest('.open'))e.click();}));await pause(150);const m=await page.evaluate(()=>{const cv=document.querySelector('#field').getBoundingClientRect(),g=document.querySelector('#studioGoal').getBoundingClientRect(),pa=document.querySelector('.studio-sheet.open')?.getBoundingClientRect();return {width:innerWidth,height:innerHeight,canvas:cv.toJSON(),goal:g.toJSON(),panel:pa?.toJSON(),overflow:document.documentElement.scrollWidth>innerWidth,bodyScroll:document.body.scrollHeight>innerHeight+1,touch:[...document.querySelectorAll('#studioActions button')].map(e=>e.getBoundingClientRect().height)};});measurements.push(m);ok(m.canvas.height>=150&&m.canvas.bottom<=height&&m.canvas.top>=0,`${width}x${height}: first-screen Canvas (${m.canvas.height}px)`);ok(!m.overflow&&!m.bodyScroll,`${width}x${height}: no body overflow`);ok(m.touch.every(v=>v>=44),`${width}x${height}: 44px context actions`);if(m.panel)ok(m.canvas.right<=m.panel.left,`${width}x${height}: Canvas / Inspector separated`);await page.screenshot({path:path.join(out,`light-${width}x${height}.png`)});}
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
  if(a.level===0&&a.sub===0){const d=await page.evaluate(()=>JSON.stringify(GAME_CTX().d));const par=await page.evaluate(()=>GAME_CTX().params[0]);await fine(par.k,par.min);ok(!await page.evaluate(()=>SMQ_STUDIO.fresh()),name+': edit makes Test stale');await sheet('more');await page.click('#studioApply');await pause(160);ok(d===await page.evaluate(()=>JSON.stringify(GAME_CTX().d)),name+': Reference Apply reproducible');}
 }else{
  if(a.mission===2){await lab('wr',1);}
  if(a.mission===1){await sheet('tune');await page.click('[data-la="fit"]');await pause(200);}
  if(a.mission===5){await sheet('tune');const download=page.waitForEvent('download');await page.click('#lab-params [data-la="exp-all"]');await download;await pause(180);}
 }
 const pass=await test();if(!pass)console.log('DIAGNOSTIC',JSON.stringify(await page.evaluate(()=>LABUI.isOpen()?LABUI.state().CHK.checks.filter(x=>x.status==='FAIL'):GAME_CTX().ob)));
 ok(pass,`${name}: L${a.level+1}.${a.sub+1} actual engine gate and fresh test`);
 await page.click('#studioNext');await pause(220);
}
const state=await page.evaluate(()=>({completed:SMQ_STUDIO.workspace().completed,lab:SMQ_STUDIO.workspace().lab,designs:SMQ_STUDIO.workspace().designs}));ok(Object.keys(state.completed).length===6,`${name}: all six Levels completed`);ok(state.lab.live.verification&&state.lab.live.export,`${name}: current Verification and Circuit Export valid`);ok(await page.locator('#studioSummary').innerText().then(t=>t.includes('Foundry Readiness: NOT VERIFIED')),`${name}: Foundry Readiness truthful`);fs.writeFileSync(path.join(out,name+'-state.json'),JSON.stringify(state,null,2));await page.screenshot({path:path.join(out,name+'-summary.png')});await page.reload();await pause(350);ok(await page.evaluate(n=>SMQ_STUDIO.active()===n&&Object.keys(SMQ_STUDIO.workspace().completed).length===6,name),`${name}: resume after file reload`);
}
// Theme preserves exact designs and Fab seed/results; preferences restore under file:///.
await page.selectOption('#studioTrack','mzm-dr8');await page.selectOption('#studioLevel','0');await pause(200);const stateBefore=await page.evaluate(()=>JSON.stringify({d:SMQ_STUDIO.workspace().designs,f:SMQ_STUDIO.workspace().fab,seed:SMQ_STUDIO.workspace().seedFix}));await page.click('#themeToggle');await pause(100);ok(await page.evaluate(()=>document.documentElement.dataset.theme==='dark'),'single HTML Dark toggle');ok(stateBefore===await page.evaluate(()=>JSON.stringify({d:SMQ_STUDIO.workspace().designs,f:SMQ_STUDIO.workspace().fab,seed:SMQ_STUDIO.workspace().seedFix})),'Theme preserves design / Fab / seed');await page.screenshot({path:path.join(out,'dark-desktop.png')});await page.reload();await pause(250);ok(await page.evaluate(()=>document.documentElement.dataset.theme==='dark'),'Theme survives file reload');
ok(errors.length===0,'no browser page errors: '+errors.join(' | '));ok(requests.length===0,'no external HTTP runtime requests');await ctx.close();
}finally{await browser.close();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({html,sha256:require('crypto').createHash('sha256').update(fs.readFileSync(html)).digest('hex'),checks,errors,requests,measurements},null,2));}
console.log('Browser checks:',checks.length,'PASS');})().catch(e=>{console.error(e);process.exit(1)});
