// P2 adapter: unchanged live PN / loaded CPW / dynamic eye. No legacy card/global writes.
const SMQ_V2_MZM = (() => {
  const S=SMQ_V2_SCHEMA,clone=SMQ_V2_CORE.clone;
  const signature='v2-mzm/1;PN-local-slope;'+MZM_BENCH.version+';kernels@28952334';
  const canonical=v=>Array.isArray(v)?v.map(canonical):S.obj(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
  const snapshot=w=>clone({design:w.design,pn:w.pn,bench:w.bench,voltage:w.voltage});
  function level(p){if(!PLATFORMS[p])throw Error('지원하는 Platform을 선택하세요.');return {...LEVELS.find(l=>l.id==='2-3'),...PSPEC[p]['2-3'],pf:PLATFORMS[p]};}
  function reference(p){return {design:{...level(p).ref,useCard:0},pn:{source:'P2 Platform Reference Geometry',geometry:clone(PSPEC[p]['2-2'].ref)},bench:{...MZM_BENCH.defaults(),pnMode:1},voltage:1};}
  function fresh(p){const a=reference(p);a.design.L=4.5;a.bench.baud=20;return {...clone(a),designId:'mzm-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10),revision:0,original:clone(a),comparison:null,experiment:'length',mode:'discover',progress:Object.fromEntries(S.experiments.map(k=>[k,{observed:false,lastOutcome:'none',completion:null}]))};}
  function ensure(state){state.mzm??={};state.mzm[state.platform]??=fresh(state.platform);return state.mzm[state.platform];}
  const payload=(w,p)=>canonical({designId:w.designId,revision:w.revision,platform:p,wavelength:PLATFORMS[p].lam,...snapshot(w),modelSignature:signature});
  const identity=(w,p)=>JSON.stringify(payload(w,p));
  const cache=new Map();
  function bench(w,p){const input=canonical({platform:p,design:w.design,pn:w.pn,bench:w.bench}),key=JSON.stringify(input);if(!cache.has(key)){cache.set(key,MZM_BENCH.analyse(level(p),clone(w.design),clone(w.bench),clone(w.pn)));if(cache.size>16)cache.delete(cache.keys().next().value);}return cache.get(key);}
  // Same equal-arm, fixed-loss, locally linearized transfer as MZM_BENCH.analyse.
  function point(b,cfg,v,L,eta,lambda){const slope=lambda*1e-4/(2*b.pn.VpiL),deltaN=slope*v,phase=Math.PI*(cfg.bias+v/b.vpi),main=b.through*(1+Math.cos(phase))/2;
    return {voltage:v,slope,deltaN,phase,phaseDrive:2*Math.PI/lambda*deltaN*(eta*L*1000),main,complement:b.through-main,valid:cfg.reverseBias-Math.abs(v)/2>=0&&cfg.reverseBias+Math.abs(v)/2<=3};}
  function evaluate(w,p,requestId){if(!S.mzmWorkspace(w))throw Error('MZM Design State를 확인하세요.');const b=bench(w,p),id=identity(w,p),staticPoint=point(b,w.bench,w.voltage,w.design.L,w.design.eta,PLATFORMS[p].lam);
    const transfer=Array.from({length:101},(_,i)=>point(b,w.bench,-2.5+i*.05,w.design.L,w.design.eta,PLATFORMS[p].lam));
    const lengthCurve=Array.from({length:61},(_,i)=>{const L=.5+5.5*i/60;return {L,vpi:b.pn.VpiL/(w.design.eta*L*.1),il:b.pn.loss*w.design.eta*L+.2*(1-w.design.eta)*L+1};});
    return Object.freeze({identity:id,inputDigest:SMQ_STORE.fnv(id),requestId,designId:w.designId,revision:w.revision,platform:p,modelSignature:signature,inputs:snapshot(w),bench:b,static:staticPoint,transfer,lengthCurve,
      activeLength:w.design.eta*w.design.L,activeLoss:b.pn.loss*w.design.eta*w.design.L,confidence:'Educational / Analytical Model',externalVerified:false,unsupported:{BER:null,FEC:null,net200G:null,receiver:null,noise:null,jitter:null}});}
  const matches=(r,w,p,q)=>!!r&&r.identity===identity(w,p)&&r.requestId===q&&r.modelSignature===signature;
  function edit(w,k,v){if(!S.scalar(k,v))return false;const a=snapshot(w),where=k==='voltage'?a:['L','g','eta','RT'].includes(k)?a.design:a.bench;if(where[k]===v)return false;where[k]=v;if(!S.mzmInputs(a))return false;Object.assign(w,a);w.revision++;return true;}
  function restore(w,a){if(!S.mzmInputs(a))throw Error('복원할 MZM Input이 올바르지 않습니다.');Object.assign(w,clone(a));w.revision++;}
  function finish(w,kind){SMQ_V2_CORE.finish(w.progress[w.experiment],kind);}
  function supported(r,e){return !!r&&(e==='length'||e==='voltage'&&r.static.valid||e==='eye'&&r.bench.eye.biasDomainValid&&r.bench.eye.monotonic);}
  function targets(r,e){if(!r)return {status:'NOT VERIFIED',text:'현재 Design으로 다시 계산해야 합니다.'};let checks;
    if(e==='length')checks=[['Vπ ≤ 10 V',r.bench.vpi<=10],['Optical Loss ≤ 4 dB',r.bench.il<=4]];
    else if(e==='voltage'){if(!r.static.valid)return {status:'NOT VERIFIED',text:'PN Reverse Bias의 지원 범위를 벗어났습니다.'};checks=[['|Vdiff| ≤ 2 V',Math.abs(r.static.voltage)<=2],['Static Main ≥ 10% Pin',r.static.main>=.1]];}
    else{if(!supported(r,e))return {status:'NOT VERIFIED',text:'이 조건에서는 유효한 Raw Eye Gap을 계산하지 못했습니다.'};checks=[['EO BW ≥ 40 GHz',r.bench.bandwidth!==null&&r.bench.bandwidth>=40],['Peak Vdiff ≤ 1.5 V',Math.max(Math.abs(r.bench.eye.voltageMin),Math.abs(r.bench.eye.voltageMax))<=1.5]];}
    return {status:checks.every(x=>x[1])?'MODEL TARGET MET':'TARGET NOT MET',checks,text:checks.map(x=>x[0]+(x[1]?' ✓':' · 조정 필요')).join(' / ')};}
  return {signature,canonical,snapshot,reference,fresh,ensure,payload,identity,evaluate,matches,edit,restore,finish,supported,targets,point,level};
})();
