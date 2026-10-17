// Checkpoint B: controller, current real-model evidence and additive migration.
const {boot,wait,storage}=require('../helpers/journey'),assert=require('assert');
let n=0;const ok=(v,m)=>{assert(v,m);console.log('PASS',m);n++;};
(async()=>{
 const legacy={schema:'smq-studio/1',by:{si1310:{fundamentals:{designs:{'1-1':{w:.67}},lab:{},level:0,sub:0}}},active:null,customField:{keep:1}};
 const seed={'smq3-studio':legacy,'smq3-progress':{plat:'si1310',by:{si1310:{stars:{easy:{'1-1':7},std:{'2-3':7},hard:{}},cards:{},best:{},ai:{},missions:{}}}},'smq3-designs':{si1310:{'1-1':{w:.67}}},'smq3-lab':{si1310:{v:2,d:{W:6},done:{schematic:true}}},'smq3-ui':{onboarded:1,studioWelcomed:1}};
 let A=boot(seed),{w,$}=A;await wait(100);let C=w.eval('SMQ_JOURNEY_CORE'),store=w.eval('SMQ_STORE');const old=store.makeBackup(true);
 ok(store.validate(old).ok,'beta.2 backup without journey validates');w.SMQ_JOURNEY.enter();await wait(100);
 const j=()=>w.SMQ_JOURNEY,ws=()=>j().workspace(),p=()=>j().state();
 ok(j().step().id==='0-1','new curriculum starts Chapter 0 Step 1 despite legacy stars');ok(!C.canGo(p(),3)&&!C.canGo(p(),1),'Chapter 1 and future Tutorial steps are locked');j().go(2);ok(j().step().id==='0-1','future navigation blocked');
 ok($('#studioNext').disabled,'legacy completion and automatic calculation grant no curriculum PASS');
 const state=JSON.stringify(ws());$('#studioSolution').click();$('#journeyDialogClose').click();ok(JSON.stringify(ws())===state,'Solution Preview changes no design, progress or verification');$('#journeyLearn').click();$('#journeyDialogClose').click();ok(JSON.stringify(ws())===state,'Common Knowledge does not change mission state');
 const ls=C.engineLevels(w.GAME_LEV);let r=C.calculate(ws(),ls);
 ok(Number.isFinite(r.laser.rx)&&r.bench.samples.length===120,'controller uses real existing Laser and MZM solvers');
 ok(!C.complete(p(),'si1310',r),'unverified current design cannot complete');
 ws().introduced['0-1']=true;let before=C.fingerprint(ws(),'si1310');ws().designs['2-5'].P+=1;C.touch(ws(),'si1310',before,'0-1:P');r=C.calculate(ws(),ls);ws().evidence['0-1']=C.evaluate(ws(),'si1310',C.steps[0],r);
 ok(C.current(ws(),'si1310','0-1'),'explicit current model evaluation produces valid evidence');
 const evaluated=C.copy(ws());before=C.fingerprint(ws(),'si1310');ws().designs['2-5'].P+=1;C.touch(ws(),'si1310',before,'0-1:P');ok(!C.current(ws(),'si1310','0-1'),'parameter revision invalidates previous PASS');ok(!C.complete(p(),'si1310',C.calculate(ws(),ls)),'stale PASS cannot unlock Next');
 ws().evidence['0-1']=C.evaluate(ws(),'si1310',C.steps[0],C.calculate(ws(),ls));ok(C.complete(p(),'si1310',C.calculate(ws(),ls)),'current evidence and practice unlock Step 2');
 const designs=JSON.stringify(ws().designs);j().go(1);await wait(80);j().go(0);ok(j().step().id==='0-1'&&JSON.stringify(ws().designs)===designs,'completed step revisit preserves exact designs');j().go(1);await wait(80);store.set('smq3-studio',w.SMQ_STUDIO.root());
 const snapshot=storage(w);A.close();A=boot(snapshot);w=A.w;$=A.$;await wait(120);C=w.eval('SMQ_JOURNEY_CORE');store=w.eval('SMQ_STORE');
 ok(j().isActive()&&j().step().id==='0-2','reload resumes current Step 2');ok(!C.current(ws(),'si1310','0-1'),'reload never trusts saved numeric PASS');
 const saved=store.makeBackup(true);ok(store.validate(saved).ok,'new additive curriculum backup validates');const bad=C.copy(saved);bad.data['smq3-studio'].journey.by.si1310.index=99;bad.checksum='fnv1a32:'+store.fnv(JSON.stringify(bad.data));ok(!store.validate(bad).ok,'malformed curriculum rejected despite valid checksum');
 const records=JSON.stringify(ws().designs);$('#journeyAdvanced').click();await wait(80);ok(!j().isActive()&&w.SMQ_STUDIO.active()==='fundamentals','Advanced content remains accessible');$('#journeyResume').click();await wait(80);ok(j().step().id==='0-2'&&JSON.stringify(ws().designs)===records,'Advanced return resumes exact curriculum design and step');
 const originalId=ws().designId;
 for(const pf of ['si1550','sin1310','sin1550','si1310']){
  $('#plat-chip').click();$('[data-lam="'+(pf.endsWith('1310')?'1.31':'1.55')+'"]').click();$('[data-mat="'+(pf.startsWith('sin')?'sin':'si')+'"]').click();$('#btn-start').click();await wait(100);
  ok(w.GAME_SHELL.plat()===pf&&j().isActive(),pf+' actual Platform switch resumes curriculum');
  if(pf!=='si1310')ok(j().step().id==='0-1'&&ws().designId!==originalId&&j().calculate().bench.samples.length===120,pf+' independent workspace uses actual platform model');
 }
 ok(j().step().id==='0-2'&&ws().designId===originalId&&JSON.stringify(ws().designs)===records,'return to original Platform restores current step and exact design');
 ok(JSON.parse(w.localStorage.getItem('smq3-studio')).customField.keep===1,'unknown Legacy root fields preserved');
 ok(w.localStorage.getItem('smq3-lab')===JSON.stringify(seed['smq3-lab'])&&JSON.parse(w.localStorage.getItem('smq3-progress')).by.si1310.stars.std['2-3']===7,'Legacy Lab and stars preserved');
 ok(store.restore(old).ok,'actual beta.2 backup Restore succeeds');const restored=boot(storage(w));await wait(100);ok(restored.w.SMQ_STUDIO.root().by.si1310.fundamentals.designs['1-1'].w===.67&&!restored.w.SMQ_JOURNEY.isActive(),'old backup loads Legacy and grants no curriculum progress');restored.close();ok(store.undo().ok,'Restore Undo retains original state');
 const corrupt=JSON.parse(snapshot['smq3-studio']);corrupt.journey.by.si1310.tutorial.evidence=null;const B=boot({...seed,'smq3-studio':corrupt});await wait(100);ok(B.w.SMQ_STUDIO.root().by.si1310.fundamentals.designs['1-1'].w===.67&&B.w.SMQ_STUDIO.root().customField.keep===1,'corrupt additive journey recovery preserves existing Track and unknown fields');ok(B.w.eval('SMQ_STORE').quarantine()['smq3-studio']?.length===1,'original malformed save is quarantined before recovery');B.close();
 ok(!A.errors.length,'zero application errors in controller run');A.close();console.log(n+' curriculum controller checks passed');
})().catch(e=>{console.error(e);process.exit(1);});
