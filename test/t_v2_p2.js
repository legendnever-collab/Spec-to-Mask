// Numerical identities use actual unchanged Bench output; state checks use the delivered HTML.
const assert=require('assert'),fs=require('fs'),boot=require('./v2_boot');let count=0;
const ok=(v,m)=>{assert(v,m);count++;console.log('PASS',m);},near=(a,b,t=1e-10)=>Math.abs(a-b)<t;
const A=boot(),{w,$}=A,M=w.eval('SMQ_V2_MZM'),S=w.eval('SMQ_V2_SCHEMA'),B=w.eval('MZM_BENCH'),C=w.eval('SMQ_V2_CORE'),store=w.eval('SMQ_STORE');
try{
 for(const p of Object.keys(w.eval('PLATFORMS'))){
  const a=M.fresh(p),l=M.level(p),before=JSON.stringify(a);ok(S.mzmWorkspace(a),p+': valid additive MZM workspace');
  const r=M.evaluate(a,p,7),raw=B.analyse(l,a.design,a.bench,a.pn);
  ok(JSON.stringify(a)===before,p+': model never mutates inputs');ok(r.bench.vpi===raw.vpi&&r.bench.il===raw.il,p+': exact unchanged Bench Vpi / optical loss');
  ok(JSON.stringify(r.bench.samples)===JSON.stringify(raw.samples)&&JSON.stringify(r.bench.eye)===JSON.stringify(raw.eye),p+': RF / EO / eye are the exact same Bench result');
  ok(near(r.static.phaseDrive,Math.PI*a.voltage/raw.vpi),p+': index / length phase equals Bench differential convention');
  ok(near(r.static.deltaN,r.static.slope*a.voltage),p+': same local PN slope sets effective-index perturbation');
  const vpil=raw.pn.VpiL;
  for(const L of [.5,2,3,6]){const z=JSON.parse(before);z.design.L=L;const q=M.evaluate(z,p,8);ok(near(q.bench.vpi*z.design.eta*L*.1,vpil),p+': active-length VpiL invariant at '+L);ok(near(q.bench.il,raw.pn.loss*z.design.eta*L+.2*(1-z.design.eta)*L+1),p+': declared active/passive/1dB loss at '+L);}
  for(const q of raw.transfer){const pt=M.point(raw,a.bench,q.v,a.design.L,a.design.eta,l.pf.lam);assert(near(pt.main,q.main)&&near(pt.complement,q.complement));}ok(true,p+': extended static sweep equals all original Bench transfer samples');
  ok(r.transfer.every(x=>x.main>=0&&x.complement>=0&&near(x.main+x.complement,raw.through)),p+': main + complement conserve surviving power');
  const zero=M.point(raw,{...a.bench,bias:0},0,a.design.L,a.design.eta,l.pf.lam),dark=M.point(raw,{...a.bench,bias:1},0,a.design.L,a.design.eta,l.pf.lam);
  ok(near(zero.main,raw.through)&&near(dark.main,0),p+': constructive / destructive analytical limits');
  const old=M.evaluate(a,p,11);ok(!M.matches(old,a,p,12),p+': late request rejected');a.revision++;ok(!M.matches(old,a,p,11),p+': revision rejects stale evidence');a.revision--;a.designId+='other';ok(!M.matches(old,a,p,11),p+': equal revision on different design cannot borrow evidence');
  const z=JSON.parse(before);z.bench.reverseBias=0;const bad=M.evaluate(z,p,9);ok(!bad.bench.eye.biasDomainValid&&bad.bench.eye.opening===null&&!M.supported(bad,'eye'),p+': out-of-domain eye stays unavailable');ok(!M.supported(bad,'voltage'),p+': static PN domain boundary explicitly unavailable');
  z.bench.reverseBias=1.5;z.bench.baud=112;const fast=M.evaluate(z,p,9);ok(r.bench.eye.opening>fast.bench.eye.opening,p+': same current design loses raw gap at high symbol rate');ok(fast.bench.eye.rawGbps===224,p+': 112 GBd PAM4 equals 224 Gb/s raw');
  z.bench.driver=5;const narrow=M.evaluate(z,p,9);ok(narrow.bench.eye.opening<fast.bench.eye.opening,p+': driver bandwidth changes actual eye');
  const again=M.evaluate(JSON.parse(before),p,99);ok(JSON.stringify(again.bench.eye.traces)===JSON.stringify(r.bench.eye.traces),p+': same seed and design reproduce exact eye');
  const dependency=JSON.parse(before);dependency.pn.geometry.xj+=.005;ok(!M.matches(r,dependency,p,7),p+': PN geometry alone invalidates same-revision evidence');ok(!M.matches({...r,modelSignature:'changed-model'},JSON.parse(before),p,7),p+': changed model signature rejected');
  const folded=JSON.parse(before);folded.bench.bias=0;const fold=M.evaluate(folded,p,7);ok(fold.bench.eye.opening===null&&M.targets(fold,'eye').status==='NOT VERIFIED',p+': folded levels cannot receive a model target');
  ok(Object.values(r.unsupported).every(x=>x===null)&&!r.externalVerified,p+': no fabricated BER/FEC/receiver/measurement result');
 }
 for(const [k,v]of [['L',NaN],['L',.1],['voltage',3],['baud',112.5],['driver',0],['source',50.5],['bias',Infinity]])ok(!S.scalar(k,v),'invalid input rejected: '+k+' '+v);
 // P1 migration preserves its data exactly. MZM workspace is an additive independent field.
 const old=C.create();old.by.si1310.observed=true;C.finish(old.by.si1310,'observed');const original=JSON.stringify(old.by);ok(S.valid(old),'P1 save remains valid without MZM data');M.ensure(old);ok(S.valid(old)&&JSON.stringify(old.by)===original,'P1 completion and Original preserved during additive migration');
 const legacy={'smq3-studio':JSON.stringify({schema:'smq-studio/1',by:{},active:null,journey:{schema:'smq-journey/1',active:true,by:{}}}),'smq3-designs':JSON.stringify({si1310:{'1-1':{w:.67}}})};
 const U=boot({...legacy,[S.KEY]:old}),uw=U.w,u=U.$,ui=()=>uw.SMQ_V2.mzm();uw.SMQ_V2.startMzm();ui().flush();ok(ui().current(),'Length starts without Verify');
 const orig=ui().state();ui().edit('3','L');ok(!ui().current()&&u('#p2K1').textContent==='—','input synchronously invalidates all current KPIs');ui().flush();ok(ui().result().inputs.design.L===3,'new result uses current input');
 let snap=JSON.stringify(uw.SMQ_V2.state());u('#p2Learn').click();u('#v2LearnClose').click();ok(JSON.stringify(uw.SMQ_V2.state())===snap,'Learn open / close is byte-equivalent for design and progress');
 ui().edit('','L');ok(!ui().current()&&!ui().flush(),'blank numeric draft cannot borrow earlier result');u('#p2Mode').click();ok(!ui().current()&&!ui().flush()&&u('#p2Fine').value==='','mode switch preserves invalid draft and cannot revive a target');u('#p2Mode').click();ui().edit('3','L');ui().flush();
 const r0=ui().result(),rev=ui().state().revision;u('#p2Mode').click();ui().flush();ok(ui().state().revision===rev&&ui().result().identity===r0.identity,'Engineer mode keeps physical identity unchanged');
 u('#p2Capture').click();ui().edit('4','L');ui().flush();u('#p2Restore').click();ui().flush();ok(ui().state().design.L===3&&ui().state().revision>rev,'Comparison restore creates new revision and recalculates');u('#p2Original').click();ui().flush();ok(JSON.stringify(ui().state().original)===JSON.stringify(orig.original)&&ui().state().design.L===orig.original.design.L,'Original stays protected across captures and restores');
 const preview=JSON.stringify(uw.SMQ_V2.state());u('#p2Solution').click();ok(JSON.stringify(uw.SMQ_V2.state())===preview,'Reference preview creates no completion');u('#p2ApplyReference').click();ui().flush();ok(ui().state().revision>rev&&JSON.stringify(ui().state().original)===JSON.stringify(orig.original),'explicit Reference Apply recalculates and protects Original');
 for(const [k,v]of Object.entries(legacy))ok(uw.localStorage.getItem(k)===v,'P2 preserves legacy bytes: '+k);
 const us=uw.eval('SMQ_STORE'),backup=us.makeBackup(true);ok(us.validate(backup).ok&&backup.data[S.KEY].mzm.si1310,'Full Backup carries validated P2 inputs / history');
 const corrupt=JSON.parse(JSON.stringify(backup));corrupt.data[S.KEY].mzm.si1310.bench.baud=1000;corrupt.checksum='fnv1a32:'+us.fnv(JSON.stringify(corrupt.data));ok(!us.validate(corrupt).ok,'valid-checksum malformed P2 backup rejected');
 const fresh=ui().result();ui().edit('2.7','L');ui().flush();ok(!ui().accept(fresh,true),'late previous result cannot replace current UI identity');
 const saved=JSON.parse(uw.localStorage.getItem(S.KEY));const R=boot({[S.KEY]:saved});ok(R.w.SMQ_V2.mzm()&&!R.w.SMQ_V2.mzm().current(),'reload does not trust saved current-result evidence');R.w.SMQ_V2.mzm().flush();ok(R.w.SMQ_V2.mzm().state().designId===saved.mzm.si1310.designId,'reload preserves exact MZM identity and recalculates');R.dom.window.close();
 const oldBackup=JSON.parse(JSON.stringify(backup));delete oldBackup.data[S.KEY].mzm;oldBackup.data[S.KEY].scene='overview';oldBackup.checksum='fnv1a32:'+us.fnv(JSON.stringify(oldBackup.data));ok(us.validate(oldBackup).ok,'old P1-only backup remains restorable');
 const preRestore=uw.localStorage.getItem(S.KEY);const restored=us.restore(backup,{ctx:{platforms:uw.eval('PLATFORMS')}});ok(restored.ok&&JSON.parse(uw.localStorage.getItem(S.KEY)).mzm.si1310.design.L===backup.data[S.KEY].mzm.si1310.design.L,'Full Restore transaction applies exact P2 design');const undone=us.undo({ctx:{platforms:uw.eval('PLATFORMS')}});ok(undone.ok&&uw.localStorage.getItem(S.KEY)===preRestore,'Undo Restore recovers prior P2 state bytes');
 const N=boot();N.w.SMQ_V2.startMzm();N.w.SMQ_V2.mzm().flush();N.$('#p2Next').click();ok(N.w.SMQ_V2.state().mzm.si1310.progress.length.completion.kind==='unobserved','Continue without tune never awards Discover');N.dom.window.close();
 const Q=boot();Q.w.SMQ_V2.startMzm();Q.w.SMQ_V2.mzm().flush();const setter=Q.w.Storage.prototype.setItem;Q.w.Storage.prototype.setItem=function(k,v){if(k===S.KEY)throw new Q.w.DOMException('quota','QuotaExceededError');return setter.call(this,k,v);};Q.w.SMQ_V2.mzm().edit('3','L');ok(Q.$('#v2SaveBanner').textContent.includes('실패'),'failed P2 write exposes Backup recovery message');Q.w.Storage.prototype.setItem=setter;Q.dom.window.close();
 ok(U.errors.length===0,'no P2 integration runtime errors');U.dom.window.close();ok(A.errors.length===0,'no model boot errors');
 console.log(count+' P2 model/state checks passed');
}finally{A.dom.window.close();}
