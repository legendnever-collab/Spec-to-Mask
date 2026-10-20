// P3.1 composition only. PN, CPW, driver, transfer and FFT remain in the existing Tx model.
const SMQ_V2_LANE = (() => {
  const S=SMQ_V2_SCHEMA,M=SMQ_V2_MZM,clone=SMQ_V2_CORE.clone,O=SMQ_V2_OPTICAL;
  const contractVersion='p3-lane-contract/1',signature='v2-lane/2;'+contractVersion+';'+M.signature+';'+O.signature;
  const snapshot=w=>clone({tx:w.tx,provenance:w.provenance,source:w.source??null,passive:w.passive??null});
  function fresh(p){M.level(p);const tx=M.reference(p),provenance={kind:'reference',platform:p,designId:null,revision:null},a={tx,provenance,source:null,passive:null};return {schema:'smq-lane/1',designId:'lane-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10),revision:0,platform:p,wavelengthUm:PLATFORMS[p].lam,...clone(a),source:null,passive:null,receiver:null,original:clone(a),comparison:null,progress:{observed:false,lastOutcome:'none',completion:null}};}
  function ensure(state){state.lane??={};state.lane[state.platform]??=fresh(state.platform);return state.lane[state.platform];}
  // Structural bridge, not a second P2 workspace. Bookkeeping never writes P2 or awards progress.
  function workspace(w){return {...clone(w.tx),designId:w.designId,revision:w.revision,original:clone(w.original.tx),comparison:null,experiment:'length',mode:'discover',progress:Object.fromEntries(S.experiments.map(k=>[k,{observed:false,lastOutcome:'none',completion:null}]))};}
  const payload=w=>M.canonical({schema:w.schema,designId:w.designId,revision:w.revision,platform:w.platform,wavelengthUm:w.wavelengthUm,...snapshot(w),source:w.source,passive:w.passive,receiver:w.receiver,opticalRevision:w.opticalRevision??0,contractVersion,modelSignature:signature});
  const identity=w=>JSON.stringify(payload(w));
  const matches=(r,w,requestId)=>!!r&&S.laneWorkspace(w,w.platform)&&r.identity===identity(w)&&r.requestId===requestId&&r.modelSignature===signature&&r.contractVersion===contractVersion;
  const txCache=new Map();
  function txResult(w,requestId){const input=workspace(w),key=JSON.stringify(M.canonical({platform:w.platform,tx:w.tx,signature:M.signature}));
    if(!txCache.has(key)){const r=M.evaluate(input,w.platform,requestId);txCache.set(key,clone(r));if(txCache.size>8)txCache.delete(txCache.keys().next().value);return r;}
    const r=clone(txCache.get(key)),id=M.identity(input,w.platform);return Object.freeze({...r,identity:id,inputDigest:SMQ_STORE.fnv(id),requestId,designId:w.designId,revision:w.revision,inputs:M.snapshot(input)});
  }
  function enableOptical(w){if(!S.laneWorkspace(w,w.platform))throw Error('Lane State를 확인하세요.');if(w.source)return false;const a=O.defaults();Object.assign(w,clone(a));for(const k of ['original','comparison'])if(w[k]&&!w[k].source)Object.assign(w[k],clone(a));w.opticalRevision=(w.opticalRevision??0)+1;w.revision++;return true;}
  function editOptical(w,k,v){if(!S.opticalScalar(k,v)||!S.laneWorkspace(w,w.platform))return false;enableOptical(w);const target=k==='cwPowerDbm'?w.source:w.passive;if(target[k]===v)return false;target[k]=v;w.opticalRevision=(w.opticalRevision??0)+1;w.revision++;return true;}
  function evaluate(w,requestId){
    if(!S.laneWorkspace(w,w.platform))throw Error('Lane Design State가 올바르지 않습니다.');
    const id=identity(w),tx=txResult(w,requestId),b=tx.bench,e=b.eye;
    const metric=(value,unit,status='MODEL',reason=null)=>({value,unit,status,reason,plane:'MZM Input / Main Output',basis:'Existing MZM Bench · P/Pin'});
    const supported=e.biasDomainValid&&e.monotonic,reason=!e.biasDomainValid?'PN Reverse Bias Domain을 벗어났습니다.':!e.monotonic?'Non-monotonic Levels입니다.':null;
    return Object.freeze({identity:id,inputDigest:SMQ_STORE.fnv(id),requestId,designId:w.designId,revision:w.revision,platform:w.platform,wavelengthUm:w.wavelengthUm,contractVersion,modelSignature:signature,tx,
      rate:{modulation:e.modulation,baudGBd:e.baud,rawGbps:e.rawGbps,netGbps:null,fecVerified:false},optical:w.source?O.evaluate(tx,w.source,w.passive,id,w.opticalRevision??0):null,receiver:null,
      metrics:{vpi:metric(b.vpi,'V'),loss:metric(b.il,'dB'),phaseDrive:metric(tx.static.valid?tx.static.phaseDrive:null,'rad',tx.static.valid?'MODEL':'INVALID',tx.static.valid?null:'Static PN Domain을 벗어났습니다.'),rawGap:metric(supported?e.opening:null,'P/Pin',supported?'MODEL':'NOT VERIFIED',reason)},
      discovery:w.progress.observed?'observed':'unobserved',engineering:'NOT EVALUATED',externalVerified:false,
      unsupported:{laserPower:null,linkBudget:null,receiverSensitivity:null,cascadedEye:null,BER:null,FEC:null,net200G:null},
      limitations:['Local Linearized PN · Equal Arm · Fixed Optical Loss','256-symbol periodic Raw Eye · no noise / FFE / CDR','240 GHz truncation · no measured BER / FEC','Laser / Channel / Receiver: NOT EVALUATED','SiN Active Layer: Heterogeneous Si PN','P2.2 MMI conservation / symmetry: NOT VERIFIED']});
  }
  function edit(w,k,v){if(!S.laneWorkspace(w,w.platform)||!['L','g','eta','RT','voltage','source','vpp','ng','bias','probe','reverseBias','baud','driver','modulation','seed'].includes(k))return false;const a=workspace(w);if(!M.edit(a,k,v))return false;w.tx=M.snapshot(a);w.revision++;return true;}
  function restore(w,a){if(!S.laneSnapshot(a,w.platform))throw Error('복원할 Lane Snapshot이 올바르지 않습니다.');Object.assign(w,clone(a),{source:clone(a.source??null),passive:clone(a.passive??null)});w.opticalRevision=(w.opticalRevision??0)+1;w.revision++;}
  function importP2(w,p2,p){if(p!==w.platform||!S.mzmWorkspace(p2))throw Error('같은 Platform의 유효한 P2 Design이 필요합니다.');restore(w,{...snapshot(w),tx:M.snapshot(p2),provenance:{kind:'p2',platform:p,designId:p2.designId,revision:p2.revision}});}
  function target(w){const a=snapshot(w);a.tx.bench.baud=112;a.tx.bench.modulation=1;restore(w,a);}
  function supported(r){return !!r&&r.tx.static.valid&&r.tx.bench.eye.biasDomainValid&&r.tx.bench.eye.monotonic;}
  function observe(w,r,requestId){if(!matches(r,w,requestId)||!supported(r))return false;w.progress.observed=true;return true;}
  function finish(w,kind){SMQ_V2_CORE.finish(w.progress,kind);}
  return {contractVersion,signature,fresh,ensure,snapshot,workspace,payload,identity,matches,evaluate,edit,restore,importP2,target,enableOptical,editOptical,supported,observe,finish};
})();
