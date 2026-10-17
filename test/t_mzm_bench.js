const assert=require('assert'),fs=require('fs'),vm=require('vm'),G=require('./load')();
vm.runInContext(fs.readFileSync('src/bench/mzm.js','utf8').replace('const MZM_BENCH =','var MZM_BENCH ='),G);
const B=G.MZM_BENCH,X=G.KINDS.mzm._x;let count=0;
const ok=(v,m)=>{assert(v,m);count++;console.log('PASS',m);};
const near=(a,b,tol=1e-9)=>Math.abs(a-b)<tol;
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
let n=B.twoPort([0,100],[50,0],.005);ok(near(Math.hypot(...n.s11),0)&&near(Math.hypot(...n.s21),1),'lossless matched line: no reflection and unit transmitted power');
n=B.twoPort([20,100],[50,0],.005);ok(near(Math.hypot(...n.s21),Math.exp(-.1)),'matched lossy line gives exp(-alpha L) field attenuation');
n=B.twoPort([20,100],[30,-5],0);ok(near(Math.hypot(...n.s11),0)&&near(Math.hypot(...n.s21),1),'zero-length network is identity even with complex Zc');
ok(dist(B.meanExp([0,0],.005),[1,0])===0&&dist(B.meanExp([0,1e-8],.005),[1,2.5e-11])<1e-15,'velocity match integral has stable analytic limit');
ok(near(Math.hypot(...B.meanExp([0,2*Math.PI/.005],.005)),0),'one-cycle velocity mismatch cancels EO integral');
assert.throws(()=>B.analyse({}, {}, {...B.defaults(),probe:1.5}));count++;console.log('PASS invalid fractional probe rejected');
for(const pid of Object.keys(G.PLATFORMS)){
 const l={...G.LEVELS.find(l=>l.id==='2-3'),...G.PSPEC[pid]['2-3'],pf:G.PLATFORMS[pid]},d={...l.ref},cfg=B.defaults();
 const before=JSON.stringify(d),r=B.analyse(l,d,cfg),b=X.build(l,d);
 ok(JSON.stringify(d)===before,pid+': analysis never changes input design');
 ok(r.samples.length===120&&r.samples.every(s=>Number.isFinite(s.eoDb)&&s.zc.every(Number.isFinite)),pid+': complete finite sweep');
 ok(r.samples.every(s=>dist(s.eo,b.resp(s.f).V)<1e-9),pid+': default EO equals existing engine at every frequency');
 ok(near(r.dcElectrodeVpp,cfg.vpp*d.RT/(cfg.source+d.RT),.01),pid+': DC electrode voltage respects source/load divider');
 ok(r.samples.every(s=>Math.hypot(...s.s11)**2+Math.hypot(...s.s21)**2<=1+1e-8),pid+': passive two-port power bound');
 ok(r.transfer.every(s=>near(s.main+s.complement,r.through)&&s.main>=0&&s.complement>=0),pid+': optical output power conservation including loss');
 ok(near(r.transfer[50].main,r.transfer[50].complement),pid+': quadrature has equal output powers at zero RF voltage');
 const phase=B.analyse(l,d,{...cfg,bias:0});ok(near(phase.transfer[50].main,phase.through)&&near(phase.transfer[50].complement,0),pid+': zero phase directs all surviving light to main');
 const source=B.analyse(l,d,{...cfg,source:100,vpp:5});ok(dist(source.probe.s21,r.probe.s21)===0&&!near(source.dcElectrodeVpp,r.dcElectrodeVpp),pid+': source voltage differs from electrode voltage and does not redefine S parameters');
 const mismatch=B.analyse(l,d,{...cfg,ng:2});ok(dist(mismatch.probe.s21,r.probe.s21)===0&&dist(mismatch.probe.eo,r.probe.eo)>.001,pid+': optical velocity mismatch affects EO, not electrical S21');
 const load=B.analyse(l,{...d,RT:d.RT+10},cfg);ok(dist(load.probe.s11,r.probe.s11)===0&&dist(load.probe.loadedReflection,r.probe.loadedReflection)>.001,pid+': terminated reflection distinguished from two-port S11');
 ok(Math.abs(r.probe.eoDb-r.probe.s21Db)>.01,pid+': EO and electrical S21 are distinct');
 ok(!r.referenceChecked&&r.confidence==='Educational model',pid+': uncalibrated reference never marked verified');
}
// Versioned dynamic eye and live PN coupling, independent of Mission scoring.
const old={source:75,vpp:2.5,ng:3.9,bias:.5,probe:56};
ok(B.migrate(old).source===75&&B.migrate(old).pnMode===0&&B.migrate(old).baud===112,'beta.1 settings migrate additively without changing existing source');
ok(!B.valid({...B.defaults(),modulation:.5})&&!B.valid({...B.defaults(),seed:1.5}),'discrete settings reject fractional values');
for(const modulation of [0,1]) {
 const cfg={...B.defaults(),modulation},e=B.dynamicEye(cfg,()=>[.5,0],2,.8);
 const idealGap=Math.min(...e.ideal.slice(1).map((v,i)=>Math.abs(v-e.ideal[i])));
 ok(near(e.opening,idealGap,1e-10),'flat channel '+e.modulation+': exact analytical cosine level spacing');
 ok(near(e.voltageMin,-.5)&&near(e.voltageMax,.5)&&e.powerMin>=0&&e.powerMax<=.8,'flat channel '+e.modulation+': no source amplitude renormalization / optical power gain');
 const e2=B.dynamicEye(cfg,()=>[.5,0],2,.8);ok(JSON.stringify(e)===JSON.stringify(e2),'seeded '+e.modulation+' eye repeats exactly');
}
for(const pid of Object.keys(G.PLATFORMS)) {
 const l={...G.LEVELS.find(l=>l.id==='2-3'),...G.PSPEC[pid]['2-3'],pf:G.PLATFORMS[pid]},d={...l.ref};
 const pl={...G.LEVELS.find(l=>l.id==='2-2'),...G.PSPEC[pid]['2-2']},context={geometry:{...pl.ref},source:'test workspace'},before=JSON.stringify(context);
 const cfg={...B.defaults(),pnMode:1},r=B.analyse(l,d,cfg,context),hi=B.analyse(l,d,{...cfg,reverseBias:2.5},context);
 ok(JSON.stringify(context)===before,pid+': live PN calculation does not mutate workspace geometry');
 ok(r.pnSweep.length===31&&r.pnSweep.every(s=>Number.isFinite(s.VpiL)&&s.Cp>0&&s.Rp>0&&s.alpha>=0),pid+': complete finite 0–3 V PN sweep');
 ok(hi.pn.Cp<r.pn.Cp&&hi.pn.loss<r.pn.loss&&hi.pn.Wd>r.pn.Wd,pid+': increased reverse bias widens depletion and reduces capacitance / absorption');
 ok(!near(hi.probe.eoDb,r.probe.eoDb)&&JSON.stringify(hi.eye.traces)!==JSON.stringify(r.eye.traces),pid+': reverse bias propagates through RF / EO and dynamic eye');
 ok(r.eye.powerMin>=0&&r.eye.powerMax<=r.through&&r.eye.biasDomainValid,pid+': dynamic power bound and valid junction reverse bias');
 const fast=r.eye,slow=B.analyse(l,d,{...cfg,baud:20},context).eye;
 ok(slow.opening>fast.opening,pid+': slower PAM4 has less ISI with identical channel / seed');
 const nrz=B.analyse(l,d,{...cfg,modulation:0},context).eye;
 ok(nrz.groups.length===2&&fast.groups.length===4&&nrz.rawGbps===112&&fast.rawGbps===224,pid+': NRZ / PAM4 grouping and raw-rate accounting');
 const narrow=B.analyse(l,d,{...cfg,driver:5},context).eye;
 ok(narrow.opening<fast.opening,pid+': narrow driver closes eye instead of rescaling it open');
 const bad=B.analyse(l,d,{...cfg,reverseBias:0},context).eye;
 ok(!bad.biasDomainValid&&bad.opening===null&&bad.traces.length===0,pid+': forward-bias excursion cannot produce a valid eye');
 const fixed=B.analyse(l,d,{...B.defaults(),reverseBias:0}),fixed2=B.analyse(l,d,{...B.defaults(),reverseBias:3});
 ok(JSON.stringify(fixed.eye.traces)===JSON.stringify(fixed2.eye.traces),pid+': fixed card does not invent PN bias dependence');
 const folded=B.analyse(l,d,{...B.defaults(),bias:0}).eye;
 ok(!folded.monotonic&&folded.opening===null,pid+': folded optical levels cannot claim an open data eye');
}
assert.throws(()=>B.analyse({},{}, {...B.defaults(),pnMode:1}));count++;console.log('PASS missing live PN geometry rejected');
console.log(count+' MZM bench model checks passed');
