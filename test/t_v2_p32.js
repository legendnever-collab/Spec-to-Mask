// C06–C07: scalar dimensional arithmetic, explicit owners and existing Tx identity.
const assert=require('assert');process.env.SMQ_HTML||='dist/index.html';const boot=require('./v2_boot'),b=boot(),w=b.w,O=w.eval('SMQ_V2_OPTICAL'),L=w.eval('SMQ_V2_LANE'),M=w.eval('SMQ_V2_MZM'),S=w.eval('SMQ_V2_SCHEMA'),C=w.eval('SMQ_V2_CORE'),clone=x=>JSON.parse(JSON.stringify(x));let count=0;const ok=(v,m)=>{assert(v,m);count++;},near=(a,b)=>Math.abs(a-b)<1e-9;
try{
for(const d of [-30,-10,0,3,10,30])ok(near(O.mwToDbm(O.dbmToMw(d)),d),'dBm round trip '+d);
for(const v of [-1,NaN,Infinity,-Infinity]){assert.throws(()=>O.mwToDbm(v));count++;}
for(const v of [NaN,Infinity,-Infinity]){assert.throws(()=>O.dbmToMw(v));count++;}
ok(O.mwToDbm(0)===null,'zero power has no finite logarithm');const zero=O.settled([0,0]);ok(zero.omaOuter.mW===0&&zero.omaOuter.dBm===null,'zero OMA remains zero with undefined logarithm');
for(const levels of [[-1,0],[NaN,1],[Infinity,1],[]]){assert.throws(()=>O.settled(levels));count++;}
for(const p of Object.keys(S.domains)){
 const a=L.fresh(p),p31=clone(a),p2=M.fresh(p),before=JSON.stringify(p2);L.enableOptical(a);const orig=clone(a.original),r=L.evaluate(a,1),g=r.optical;
 ok(S.laneWorkspace(a,p)&&g.signature===O.signature&&g.identity===r.identity,'current valid ledger '+p);
 ok(g.planes.A.cw.dBm===10&&near(g.planes.B.cw.mW,10*10**(-.1)),'A/B CW and input loss '+p);
 ok(g.planes.A.omaOuter===null&&g.planes.B.omaOuter===null,'no OMA before modulation '+p);
 for(const id of ['C','D','E','F']){
 const plane=g.planes[id];ok(plane.status==='MODEL'&&plane.averageSettled.mW>=0&&plane.omaOuter.mW>=0,'settled valid '+id+p);
 ok(near(plane.averageSettled.mW,plane.levels_mW.reduce((x,y)=>x+y,0)/plane.levels_mW.length),'equal probability average '+id+p);
 ok(near(plane.omaOuter.mW,Math.max(...plane.levels_mW)-Math.min(...plane.levels_mW)),'outer OMA '+id+p);
 }
 ok(g.planes.C.levels_mW.every((v,i)=>near(v,g.planes.B.cw.mW*r.tx.bench.eye.ideal[i])),'no second MZM IL '+p);
 ok(near(g.planes.E.omaOuter.mW/g.planes.D.omaOuter.mW,10**(-.3)),'3 dB is exact 10^(-.3) '+p);
 ok(new Set(g.terms.map(x=>x.owner)).size===5&&g.terms.every(t=>t.appliedOnce),'one owner per term '+p);
 ok(g.terms.map(t=>t.from+t.to).join(',')==='AB,BC,CD,DE,EF'&&g.terms[1].includedInTransfer,'planes and MZM owner '+p);
 const laser=clone(a);L.editOptical(laser,'cwPowerDbm',11);const lr=L.evaluate(laser,2);
 for(const id of ['A','B'])ok(near(lr.optical.planes[id].cw.dBm-g.planes[id].cw.dBm,1),'CW +1 dB '+id+p);
 for(const id of ['C','D','E','F']){ok(near(lr.optical.planes[id].averageSettled.dBm-g.planes[id].averageSettled.dBm,1),'+1 average '+id+p);ok(near(lr.optical.planes[id].omaOuter.dBm-g.planes[id].omaOuter.dBm,1),'+1 OMA '+id+p);ok(lr.optical.planes[id].levels_mW.every((v,i)=>near(v/g.planes[id].levels_mW[i],10**.1)),'+1 levels '+id+p);}
 for(const [key,affected]of [['txInputLossDb','BCDEF'],['txOutputLossDb','DEF'],['channelLossDb','EF'],['rxInputLossDb','F']]){
 const x=clone(a);L.editOptical(x,key,x.passive[key]+1);const z=L.evaluate(x,3).optical;for(const id of 'ABCDEF'){const old=g.planes[id],now=z.planes[id],delta=(now.cw||now.averageSettled).dBm-(old.cw||old.averageSettled).dBm;ok(near(delta,affected.includes(id)?-1:0),'owner-local loss '+key+id+p);}
 }
 ok(JSON.stringify(r.tx.bench)===JSON.stringify(lr.tx.bench)&&JSON.stringify(a.tx)===JSON.stringify(laser.tx),'optical edit preserves Tx values '+p);
 ok(g.rawGap.value===r.tx.bench.eye.opening&&g.rawGap.unit==='P/Pin'&&g.dynamicAverage===null&&g.dynamicOMA===null,'raw gap distinct from settled OMA '+p);
 ok(g.receiverSensitivity===null&&g.linkMargin===null&&r.receiver===null&&g.engineering==='NOT EVALUATED'&&!g.externalVerified,'no receiver/closure claim '+p);
 const domain=clone(a);L.edit(domain,'reverseBias',0);const dr=L.evaluate(domain,4);ok(dr.optical.planes.F.omaOuter===null&&dr.optical.planes.F.averageSettled===null&&dr.optical.planes.A.cw,'PN domain invalidates modulated evidence but not CW '+p);
 const fold=clone(a);L.edit(fold,'bias',0);const fr=L.evaluate(fold,5);ok(fr.optical.planes.F.omaOuter===null&&fr.optical.planes.F.status==='NOT VERIFIED'&&fr.optical.planes.F.diagnosticOuter,'folded level range is diagnostic only '+p);
 const comp=L.snapshot(a);L.editOptical(a,'channelLossDb',8);L.restore(a,comp);ok(a.passive.channelLossDb===3&&JSON.stringify(a.original)===JSON.stringify(orig),'comparison restores optics and protects Original '+p);
 L.importP2(a,p2,p);ok(JSON.stringify(p2)===before&&a.source.cwPowerDbm===10&&a.passive.channelLossDb===3&&a.tx.bench.baud===20,'P2 import preserves optical inputs and baud '+p);
 const old=clone(p31);delete old.original.source;delete old.original.passive;ok(S.laneWorkspace(old,p),'old P3.1 Snapshot valid '+p);L.enableOptical(old);ok(old.original.source.cwPowerDbm===10,'additive optical defaults preserve old Tx Original '+p);
 for(const [key,value]of [['cwPowerDbm',NaN],['cwPowerDbm',Infinity],['channelLossDb',-1],['txInputLossDb',NaN],['rxInputLossDb',Infinity]]){const bytes=JSON.stringify(a);ok(!L.editOptical(a,key,value)&&JSON.stringify(a)===bytes,'invalid edit is pure '+key+p);}
 const x=clone(a);x.passive.channelLossDb=-1;ok(!S.laneWorkspace(x,p),'negative loss state invalid '+p);assert.throws(()=>L.evaluate(x,9));count++;
 ok(!L.matches(r,laser,1),'optical input / revision reject stale result '+p);
 const state=C.create();state.platform=p;state.by[p]||=C.fresh(p);state.lane={[p]:a};ok(S.valid(state),'save schema includes ledger state '+p);
}
const cache=L.fresh('si1310');cache.tx.bench.seed=65500;L.enableOptical(cache);const evaluate=M.evaluate;let calls=0;M.evaluate=(...args)=>{calls++;return evaluate(...args);};const first=L.evaluate(cache,100);L.editOptical(cache,'channelLossDb',4);const second=L.evaluate(cache,101);M.evaluate=evaluate;
ok(calls===1&&JSON.stringify(first.tx.bench)===JSON.stringify(second.tx.bench),'same Tx input reuses numerical result without calling Tx evaluator');ok(second.tx.revision===cache.revision&&second.tx.requestId===101&&second.tx.identity===M.identity(L.workspace(cache),'si1310'),'cached numerical result rebinds current Tx identity');
const state=C.create();state.lane={si1310:cache};const store=w.eval('SMQ_STORE');store.set(S.KEY,state);const backup=store.makeBackup(true);ok(store.validate(backup).ok,'optical state Full Backup validation');const loaded=boot({[S.KEY]:state});loaded.w.SMQ_V2.startLane();loaded.w.SMQ_V2.lane().flush();ok(loaded.w.SMQ_V2.lane().result().optical.planes.F.omaOuter.mW>0,'saved optical state resumes and recalculates');loaded.dom.window.close();
ok(b.errors.length===0,'no runtime errors');console.log(count+' P3.2 model/state checks passed');
}finally{b.dom.window.close();}
