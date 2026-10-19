// P3.1 composition only. PN, CPW, driver, transfer and FFT remain in the existing Tx model.
const SMQ_V2_LANE = (() => {
  const S=SMQ_V2_SCHEMA,M=SMQ_V2_MZM,clone=SMQ_V2_CORE.clone;
  const contractVersion='p3-lane-contract/1',signature='v2-lane/1;'+contractVersion+';'+M.signature;
  const snapshot=w=>clone({tx:w.tx,provenance:w.provenance});
  function fresh(p){M.level(p);const tx=M.reference(p),provenance={kind:'reference',platform:p,designId:null,revision:null},a={tx,provenance};return {schema:'smq-lane/1',designId:'lane-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10),revision:0,platform:p,wavelengthUm:PLATFORMS[p].lam,...clone(a),source:null,passive:null,receiver:null,original:clone(a),comparison:null,progress:{observed:false,lastOutcome:'none',completion:null}};}
  function ensure(state){state.lane??={};state.lane[state.platform]??=fresh(state.platform);return state.lane[state.platform];}
  // Structural bridge, not a second P2 workspace. Bookkeeping never writes P2 or awards progress.
  function workspace(w){return {...clone(w.tx),designId:w.designId,revision:w.revision,original:clone(w.original.tx),comparison:null,experiment:'length',mode:'discover',progress:Object.fromEntries(S.experiments.map(k=>[k,{observed:false,lastOutcome:'none',completion:null}]))};}
  const payload=w=>M.canonical({schema:w.schema,designId:w.designId,revision:w.revision,platform:w.platform,wavelengthUm:w.wavelengthUm,...snapshot(w),source:w.source,passive:w.passive,receiver:w.receiver,contractVersion,modelSignature:signature});
  const identity=w=>JSON.stringify(payload(w));
  const matches=(r,w,requestId)=>!!r&&S.laneWorkspace(w,w.platform)&&r.identity===identity(w)&&r.requestId===requestId&&r.modelSignature===signature&&r.contractVersion===contractVersion;
  function evaluate(w,requestId){
    if(!S.laneWorkspace(w,w.platform))throw Error('Lane Design State가 올바르지 않습니다.');
    const id=identity(w),tx=M.evaluate(workspace(w),w.platform,requestId),b=tx.bench,e=b.eye;
    const metric=(value,unit,status='MODEL',reason=null)=>({value,unit,status,reason,plane:'MZM Input / Main Output',basis:'Existing MZM Bench · P/Pin'});
    const supported=e.biasDomainValid&&e.monotonic,reason=!e.biasDomainValid?'PN Reverse Bias Domain을 벗어났습니다.':!e.monotonic?'Non-monotonic Levels입니다.':null;
    return Object.freeze({identity:id,inputDigest:SMQ_STORE.fnv(id),requestId,designId:w.designId,revision:w.revision,platform:w.platform,wavelengthUm:w.wavelengthUm,contractVersion,modelSignature:signature,tx,
      rate:{modulation:e.modulation,baudGBd:e.baud,rawGbps:e.rawGbps,netGbps:null,fecVerified:false},optical:null,receiver:null,
      metrics:{vpi:metric(b.vpi,'V'),loss:metric(b.il,'dB'),phaseDrive:metric(tx.static.valid?tx.static.phaseDrive:null,'rad',tx.static.valid?'MODEL':'INVALID',tx.static.valid?null:'Static PN Domain을 벗어났습니다.'),rawGap:metric(supported?e.opening:null,'P/Pin',supported?'MODEL':'NOT VERIFIED',reason)},
      discovery:w.progress.observed?'observed':'unobserved',engineering:'NOT EVALUATED',externalVerified:false,
      unsupported:{laserPower:null,linkBudget:null,receiverSensitivity:null,cascadedEye:null,BER:null,FEC:null,net200G:null},
      limitations:['Local Linearized PN · Equal Arm · Fixed Optical Loss','256-symbol periodic Raw Eye · no noise / FFE / CDR','240 GHz truncation · no measured BER / FEC','Laser / Channel / Receiver: NOT EVALUATED','SiN Active Layer: Heterogeneous Si PN','P2.2 MMI conservation / symmetry: NOT VERIFIED']});
  }
  function edit(w,k,v){if(!S.laneWorkspace(w,w.platform)||!['L','g','eta','RT','voltage','source','vpp','ng','bias','probe','reverseBias','baud','driver','modulation','seed'].includes(k))return false;const a=workspace(w);if(!M.edit(a,k,v))return false;w.tx=M.snapshot(a);w.revision++;return true;}
  function restore(w,a){if(!S.laneSnapshot(a,w.platform))throw Error('복원할 Lane Snapshot이 올바르지 않습니다.');Object.assign(w,clone(a));w.revision++;}
  function importP2(w,p2,p){if(p!==w.platform||!S.mzmWorkspace(p2))throw Error('같은 Platform의 유효한 P2 Design이 필요합니다.');restore(w,{tx:M.snapshot(p2),provenance:{kind:'p2',platform:p,designId:p2.designId,revision:p2.revision}});}
  function target(w){const a=snapshot(w);a.tx.bench.baud=112;a.tx.bench.modulation=1;restore(w,a);}
  function supported(r){return !!r&&r.tx.static.valid&&r.tx.bench.eye.biasDomainValid&&r.tx.bench.eye.monotonic;}
  function observe(w,r,requestId){if(!matches(r,w,requestId)||!supported(r))return false;w.progress.observed=true;return true;}
  function finish(w,kind){SMQ_V2_CORE.finish(w.progress,kind);}
  return {contractVersion,signature,fresh,ensure,snapshot,workspace,payload,identity,matches,evaluate,edit,restore,importP2,target,supported,observe,finish};
})();
