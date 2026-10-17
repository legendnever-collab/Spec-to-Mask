// P0 isolated UX verification; never asserts learner comprehension or production physics.
const fs=require('fs'),path=require('path'),assert=require('assert');
const {chromium}=require('playwright');
const root=__dirname,out=path.join(root,'screenshots');fs.mkdirSync(out,{recursive:true});
const results=[],measurements=[],errors=[],requests=[];
function ok(value,message){results.push({ok:!!value,message});assert(value,message);}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.SMQ_BROWSER||undefined,headless:true,args:process.env.SMQ_BROWSER?['--no-sandbox','--disable-gpu','--disable-software-rasterizer','--no-zygote','--single-process','--disable-dev-shm-usage']:['--no-sandbox']});
 const version=await browser.version(),context=await browser.newContext({reducedMotion:'reduce'}),p=await context.newPage();
 p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
 const url='file://'+path.join(root,'index.html');
 try{
 for(const [width,height] of [[1440,900],[1366,768],[390,844],[320,568]]){
  await p.setViewportSize({width,height});
  for(const scene of ['overview','wg','mzm']){
   await p.goto(url+'?scene='+scene);
   for(const theme of ['light','dark']){
    if(theme==='dark')await p.click('#theme');
    const m=await p.evaluate(()=>{
     const rect=s=>{const e=document.querySelector(s);return e?e.getBoundingClientRect().toJSON():null;};
     const visible=[...document.querySelectorAll('button,input')].filter(e=>e.getBoundingClientRect().width>0);
     return {width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,knob:rect('#knob'),physical:rect('.physical'),plot:rect('.plot'),kpis:rect('.kpis'),aside:rect('.aside'),action:rect('.actions'),minButtonHeight:Math.min(...visible.filter(e=>e.tagName==='BUTTON').map(e=>e.getBoundingClientRect().height))};
    });measurements.push({scene,theme,...m});
    ok(m.minButtonHeight>=44,`${scene} ${theme} ${width}: buttons at least44px`);if(m.knob)ok(m.knob.height>=44,`${scene} ${theme} ${width}: range input at least44px`);
    ok(m.scrollWidth<=width,`${scene} ${theme} ${width}x${height}: no horizontal overflow`);
    if(width>760){ok(m.scrollHeight<=height+1,`${scene} ${theme} ${width}x${height}: desktop no page scroll`);if(scene!=='overview')for(const k of ['knob','physical','plot','kpis','aside'])ok(m[k].bottom<=height&&m[k].top>=0,`${scene} ${theme} ${width}: ${k} in viewport`);}
    else if(scene!=='overview'){ok(m.physical.height>=100,`${scene} ${theme} ${width}: physical view readable`);ok(m.kpis.bottom<=height-58,`${scene} ${theme} ${width}: KPI above action bar`);ok(m.knob.bottom<=height-58,`${scene} ${theme} ${width}: primary knob above action bar`);}
    await p.screenshot({path:path.join(out,`${scene}-${theme}-${width}x${height}.png`)});
   }
  }
 }
 await p.setViewportSize({width:1440,height:900});await p.goto(url+'?scene=mzm');
 const snap=()=>p.evaluate(()=>P0_REVIEW.snapshot()),mod=()=>p.evaluate(()=>P0_REVIEW.model());
 async function move(v){await p.locator('#knob').fill(String(v));}
 let a=await snap(),r=await mod();await move(3);let b=await snap(),r2=await mod();
 ok(b.revision===a.revision+1&&r2.ratio<r.ratio&&r2.lossLength>r.lossLength,'MZM fixture: length, normalized Vπ and active loss change together');
 ok(await p.locator('[data-view]').evaluateAll(es=>new Set(es.map(e=>e.dataset.revision)).size===1),'physical / plot / KPI share one revision');
 ok(await p.locator('#physical').innerHTML()!==''&&await p.locator('#plot').innerHTML()!=='','fixture diagram and plot rendered');
 await p.screenshot({path:path.join(out,'mzm-length-3mm-1440x900.png')});
 a=await snap();await p.click('#learnButton');ok(await p.locator('#learn').evaluate(e=>e.open),'Learn opens');
 ok(await p.locator('#learnBody').innerText().then(t=>t.includes('3.00 mm')&&t.includes('NOT PHYSICS VERIFIED')),'Learn reflects selected parameter and model confidence');
 await p.keyboard.press('Escape');ok(JSON.stringify(a)===JSON.stringify(await snap()),'Learn open/Escape preserves complete memory state');
 ok(await p.locator('#learnButton').evaluate(e=>document.activeElement===e),'Learn returns keyboard focus');
 await p.click('#learnButton');await p.click('#closeLearn');ok(JSON.stringify(a)===JSON.stringify(await snap()),'Learn explicit close preserves state');
 const physical=await p.locator('.physical').elementHandle();await p.click('#engineer');b=await snap();ok(b.mode==='engineer'&&b.revision===a.revision&&JSON.stringify(b.values)===JSON.stringify(a.values),'Engineer adds constraints without changing design or revision');
 ok(await physical.evaluate(e=>e.isConnected)&&await p.locator('#constraints').isVisible(),'Discover → Engineer retains physical panel and reveals constraints');
 await p.click('#compare');await move(4);await p.click('#restore');ok((await snap()).values.mzm===3,'captured comparison restores independently of Original');await p.click('#reset');ok((await snap()).values.mzm===2,'protected Original remains 2 mm');
 await p.locator('#knob').focus();await p.keyboard.press('ArrowRight');ok((await snap()).values.mzm>2,'slider supports keyboard arrow');
 a=await snap();await p.click('#theme');ok(JSON.stringify(a)===JSON.stringify(await snap()),'theme is a presentation preference, no design change');
 await p.goto(url+'?scene=wg');a=await snap();await move(12);r2=await mod();ok(r2.footprint>1&&(await snap()).revision>a.revision,'Waveguide radius changes geometric area');
 ok(await p.locator('#kpi1').innerText()==='Not evaluated','bend loss is unavailable, never fabricated');
 await p.screenshot({path:path.join(out,'wg-radius-12um-1440x900.png')});
 await p.click('#continue');ok((await snap()).scene==='mzm'&&(await snap()).completed,'Continue after observation requires no engineering target');
 await p.goto(url+'?scene=wg');await p.click('#skip');b=await snap();ok(b.scene==='mzm'&&b.skipped&&!b.completed,'Skip continues without falsely awarding completion');
 await p.goto(url+'?scene=wg');await p.click('#continue');b=await snap();ok(b.scene==='mzm'&&!b.completed,'Continue without manipulation does not award Discover completion');
 await p.goto(url+'?scene=mzm');await p.setViewportSize({width:1366,height:768});await p.click('#engineer');
 const eng=await p.locator('.aside').evaluate(e=>({client:e.clientHeight,scroll:e.scrollHeight,bottom:e.getBoundingClientRect().bottom}));ok(eng.scroll<=eng.client&&eng.bottom<=768,'Engineer constraints fit desktop 1366x768');
 await p.screenshot({path:path.join(out,'mzm-engineer-1366x768.png')});
 await p.click('#learnButton');await p.screenshot({path:path.join(out,'learn-physics-1366x768.png')});await p.keyboard.press('Escape');
 ok(await p.evaluate(()=>localStorage.length===0),'prototype performs no localStorage writes');
 await p.evaluate(()=>localStorage.setItem('smq3-progress','legacy-sentinel'));await p.reload();ok(await p.evaluate(()=>localStorage.getItem('smq3-progress'))==='legacy-sentinel','preexisting legacy storage bytes preserved');
 ok(requests.length===0,'offline runtime requests no external HTTP');ok(errors.length===0,'no browser runtime errors');
 }finally{
 fs.writeFileSync(path.join(root,'verification.json'),JSON.stringify({scope:'P0 UX MOCK ONLY; no user learning or production physics validation',browser:version,node:process.version,htmlSHA256:require('crypto').createHash('sha256').update(fs.readFileSync(path.join(root,'index.html'))).digest('hex'),results,measurements,errors,requests},null,2));await browser.close();
 }
 console.log(`P0: ${results.length} checks PASS; Chromium ${version}`);
})().catch(e=>{console.error(e);process.exitCode=1;});
