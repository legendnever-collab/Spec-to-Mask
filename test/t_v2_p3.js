// C01–C05 against the actual assembled executable. No duplicate device model.
const assert=require('assert');process.env.SMQ_HTML||='dist/index.html';
const boot=require('./v2_boot'),b=boot(),w=b.w,L=w.eval('SMQ_V2_LANE'),M=w.eval('SMQ_V2_MZM'),B=w.eval('MZM_BENCH'),S=w.eval('SMQ_V2_SCHEMA'),C=w.eval('SMQ_V2_CORE');
const clone=x=>JSON.parse(JSON.stringify(x)),near=(a,b,tol=1e-9)=>Math.abs(a-b)<tol;
let count=0;const ok=(v,m)=>{assert(v,m);count++;console.log('PASS',m);};
try{
 for(const p of Object.keys(S.domains)){
  const a=L.fresh(p),before=JSON.stringify(a),r=L.evaluate(a,1),tx=M.evaluate(L.workspace(a),p,1),raw=B.analyse(M.level(p),clone(a.tx.design),clone(a.tx.bench),clone(a.tx.pn));
  ok(S.laneWorkspace(a,p)&&JSON.stringify(a)===before,p+' C01: valid independent lane / pure evaluation');
  ok(JSON.stringify(r.tx)===JSON.stringify(tx),p+' C01: same full Tx result from existing V2 evaluator');
  for(const k of ['vpi','il','through','dcElectrodeVpp','dcEffectiveVpp'])ok(near(r.tx.bench[k],raw[k]),p+' C01: Bench scalar '+k);
  ok(JSON.stringify(r.tx.bench.samples)===JSON.stringify(raw.samples)&&JSON.stringify(r.tx.bench.eye)===JSON.stringify(raw.eye),p+' C01: entire RF sweep and seeded dynamic eye exactly match Bench');
  const n=clone(a);L.edit(n,'RT',50);L.edit(n,'source',50);L.edit(n,'vpp',2.5);const nr=L.evaluate(n,2);
  ok(near(nr.tx.bench.dcElectrodeVpp,1.25,.01)&&near(nr.tx.bench.dcEffectiveVpp,1.25,.01),p+' C02: open-circuit 2.5 Vpp gives 1.25 Vpp loaded junction at DC');
  const bn=B.analyse(M.level(p),clone(n.tx.design),clone(n.tx.bench),clone(n.tx.pn));ok(nr.tx.bench.samples.every((s,i)=>s.eo.every((v,j)=>near(v,bn.samples[i].eo[j]))),p+' C02: effective complex voltage remains the existing convention');
  ok(r.tx.transfer.every(q=>near(q.main+q.complement,r.tx.bench.through)&&q.main>=0&&q.main<=r.tx.bench.through),p+' C03: complementary power bound');
  const bad=clone(a);L.edit(bad,'reverseBias',0);let br=L.evaluate(bad,3);ok(br.metrics.rawGap.value===null&&!L.supported(br)&&br.tx.bench.eye.traces.length===0,p+' C03: PN excursion invalidates eye');
  L.edit(bad,'reverseBias',1.5);L.edit(bad,'bias',0);br=L.evaluate(bad,4);ok(!br.tx.bench.eye.monotonic&&br.metrics.rawGap.value===null&&!L.supported(br),p+' C03: folded levels cannot receive an eye or observed credit');
  ok(!L.observe(bad,br,4),p+' C03: invalid observation is not awarded');
  ok(r.rate.rawGbps===224&&r.rate.netGbps===null&&!r.rate.fecVerified,p+' C04: 112 GBd PAM4 is 224 raw with no FEC/net claim');
  const rate=clone(a);L.edit(rate,'baud',100);ok(L.evaluate(rate,5).rate.rawGbps===200,p+' C04: 100 GBd PAM4 is 200 raw only');L.edit(rate,'baud',112);L.edit(rate,'modulation',0);ok(L.evaluate(rate,6).rate.rawGbps===112,p+' C04: 112 GBd NRZ is 112 raw');
  ok(r.optical===null&&r.receiver===null&&Object.values(r.unsupported).every(v=>v===null)&&r.engineering==='NOT EVALUATED'&&!r.externalVerified,p+' excluded blocks stay unevaluated');
  const p2=M.fresh(p);p2.design.L=4.5;p2.bench.baud=20;p2.pn.geometry.xj=.035;const p2Before=JSON.stringify(p2),original=JSON.stringify(a.original);L.importP2(a,p2,p);
  ok(a.tx.bench.baud===20&&JSON.stringify(a.tx)===JSON.stringify(M.snapshot(p2))&&JSON.stringify(p2)===p2Before,p+' C05: P2 import copies all inputs without changing source or baud');
  ok(a.tx!==p2&&a.tx.design!==p2.design&&a.tx.pn.geometry!==p2.pn.geometry,p+' C05: import is deeply isolated');
  L.edit(a,'L',3);ok(JSON.stringify(p2)===p2Before&&JSON.stringify(a.original)===original,p+' C05: lane tuning cannot mutate P2 or Original');
  const comp=L.snapshot(a);L.edit(a,'L',5);const rev=a.revision;L.restore(a,comp);ok(a.tx.design.L===3&&a.revision>rev,p+' C05: restore creates a revision');
  const stale=L.evaluate(a,7);ok(!L.matches(stale,a,8),p+' C05: late request rejected');a.tx.bench.driver+=1;ok(!L.matches(stale,a,7),p+' C05: same-revision input change rejected');a.tx.bench.driver-=1;a.designId+='other';ok(!L.matches(stale,a,7),p+' C05: equal revision cannot borrow other design evidence');
  const v=L.fresh(p);const sig=L.evaluate(v,8);ok(!L.matches({...sig,modelSignature:'other'},v,8)&&!L.matches({...sig,contractVersion:'other'},v,8),p+' changed model / contract invalidates result');
  const from=clone(v);from.provenance.kind='p2';from.provenance.designId='import';from.provenance.revision=1;ok(!L.matches(sig,from,8),p+' source provenance participates in identity');
  const damaged=clone(v);damaged.wavelengthUm+=.001;assert.throws(()=>L.evaluate(damaged,9));count++;
  for(const [key,value]of [['L',NaN],['L',.1],['vpp',Infinity],['baud',112.5],['source',50.5],['na',18],['laserPower',10]])ok(!L.edit(v,key,value),p+' invalid / unsupported edit rejected '+key);
  const parent=C.create();parent.platform=p;parent.by[p]||=C.fresh(p);const oldBy=JSON.stringify(parent.by);L.ensure(parent);ok(S.valid(parent)&&JSON.stringify(parent.by)===oldBy,p+' additive state preserves P1');
 }
 const uiState=()=>w.SMQ_V2.state();w.SMQ_V2.startMzm();w.SMQ_V2.mzm().flush();w.SMQ_V2.mzm().edit('20','baud');w.SMQ_V2.mzm().flush();
 const p2=JSON.stringify(uiState().mzm);w.SMQ_V2.startLane();let ui=w.SMQ_V2.lane();ui.flush();const original=JSON.stringify(ui.state().original);
 b.$('#laneImport').click();ui.flush();ok(ui.state().tx.bench.baud===20&&JSON.stringify(uiState().mzm)===p2,'UI P2 import preserves original rate and source state');
 const same=ui.result();ui.edit('3','L');ok(!ui.current()&&b.$('#laneVpi').textContent==='—'&&!b.$('#lanePhysical').children.length,'UI edit clears stale metrics and physical drawing synchronously');ui.flush();ok(ui.result().tx.inputs.design.L===3,'UI evaluates new input');ok(!ui.accept(same,true),'UI rejects late result');
 b.$('#laneCapture').click();ui.edit('4','L');ui.flush();b.$('#laneRestore').click();ui.flush();ok(ui.state().tx.design.L===3,'UI Comparison restores current inputs');b.$('#laneOriginal').click();ui.flush();ok(JSON.stringify(ui.state().original)===original,'UI Original remains protected');
 const firstMountResult=ui.result();w.SMQ_V2.navigate('overview');w.SMQ_V2.startLane();ui=w.SMQ_V2.lane();ui.flush();ok(!ui.accept(firstMountResult,true),'request IDs cannot be reused after Chapter remount');
 const s=JSON.stringify(uiState());b.$('#laneLearn').click();b.$('#v2LearnClose').click();ok(JSON.stringify(uiState())===s,'Learn open/close never mutates saved state');
 ui.edit('','L');ok(!ui.current()&&!ui.flush(),'blank length cannot restore prior result');b.$('#laneOptions').click();w.document.querySelector('#laneTarget').click();ok(!ui.current()&&!ui.flush(),'Target Apply cannot revive a different blank parameter');b.$('#v2LearnClose').click();b.$('#laneOriginal').click();ui.flush();
 const opts=b.$('#laneOptions');opts.click();const voltage=w.document.querySelector('[data-lane-param=vpp]');voltage.value='';voltage.dispatchEvent(new w.Event('input'));b.$('#v2LearnClose').click();ok(!ui.current()&&!ui.flush(),'closing options preserves invalid voltage draft');opts.click();ok(w.document.querySelector('[data-lane-param=vpp]').value==='','reopening options retains blank draft');b.$('#v2LearnClose').click();b.$('#laneOriginal').click();ui.flush();
 // A mere flush, restore or import never awards a hands-on observation.
 ok(!ui.state().progress.observed,'programmatic setup does not award observation');ui.edit('3','L');const pending=ui.state(),rr=L.evaluate(pending,ui.result()?.requestId||9999);ok(!ui.accept(rr,true),'wrong request cannot manufacture observation');ui.flush();
 const store=w.eval('SMQ_STORE'),key=S.KEY,backup=store.makeBackup(true);ok(store.validate(backup).ok&&backup.data[key].lane.si1310,'Full Backup carries valid lane state');
 for(const mutate of [a=>a.lane.si1310.tx.bench.baud=1000,a=>a.lane.si1310.wavelengthUm=9,a=>a.lane.si1310.source={cwPowerDbm:10},a=>a.lane={fake:a.lane.si1310}]){const bad=clone(backup);mutate(bad.data[key]);bad.checksum='fnv1a32:'+store.fnv(JSON.stringify(bad.data));ok(!store.validate(bad).ok,'valid-checksum malformed / unsupported lane rejected');}
 const saved=clone(uiState()),reload=boot({[key]:saved});ok(!reload.w.SMQ_V2.lane().current(),'reload never trusts saved evidence');reload.w.SMQ_V2.lane().flush();ok(reload.w.SMQ_V2.lane().state().designId===saved.lane.si1310.designId,'reload resumes exact lane and recalculates');reload.dom.window.close();
 const beforeRestore=w.localStorage.getItem(key);ok(store.restore(backup,{ctx:{platforms:w.eval('PLATFORMS')}}).ok,'transaction restores lane backup');ok(store.undo({ctx:{platforms:w.eval('PLATFORMS')}}).ok&&w.localStorage.getItem(key)===beforeRestore,'Undo Restore preserves previous lane bytes');
 const old=clone(backup);delete old.data[key].lane;old.data[key].scene='overview';old.checksum='fnv1a32:'+store.fnv(JSON.stringify(old.data));ok(store.validate(old).ok,'old backups remain accepted without lane');
 const oldUI=ui;w.SMQ_V2.navigate('mzm');w.SMQ_V2.mzm().flush();ok(!oldUI.current()&&!oldUI.accept(same,true),'disposed Lane cannot accept after navigation');ok(JSON.stringify(uiState().mzm)===p2,'all lane actions preserve P2 state bytes');
 const Q=boot();Q.w.SMQ_V2.startLane();Q.w.SMQ_V2.lane().flush();const setter=Q.w.Storage.prototype.setItem;Q.w.Storage.prototype.setItem=function(k,v){if(k===key)throw new Q.w.DOMException('quota','QuotaExceededError');return setter.call(this,k,v);};Q.w.SMQ_V2.lane().edit('4','L');ok(Q.$('#v2SaveBanner').textContent.includes('실패'),'quota failure surfaces Save / Backup recovery');Q.w.Storage.prototype.setItem=setter;Q.dom.window.close();
 ok(b.errors.length===0,'zero P3 state / integration runtime errors');console.log(count+' P3.1 model/state checks passed');
}finally{b.dom.window.close();}
