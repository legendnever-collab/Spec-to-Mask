// Passive foundations adapter. Existing wg table + explicit lossless two-port teaching model.
const SMQ_V2_FOUNDATIONS = (() => {
 const S=SMQ_V2_SCHEMA,C=SMQ_V2_CORE,clone=C.clone,steps=['width','splitter','path','intro'],signature='foundations/1;wg@28952334;ideal-unitary-coupler/1';
 const limits=(p,k)=>k==='width'?(p.startsWith('sin')?[.4,3]:[.2,2]):k==='ratio'?[0,1]:k==='deltaL'?[0,2]:[-2.5,2.5];
 const snapshot=w=>clone({width:w.width,ratio:w.ratio,deltaL:w.deltaL,introVoltage:w.introVoltage,active:w.active});
 function fresh(p){const a={width:PLATFORMS[p].w0,ratio:.5,deltaL:0,introVoltage:0,active:false};return {...a,designId:'passive-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10),revision:0,step:'width',original:clone(a),comparison:null,progress:Object.fromEntries(steps.map(k=>[k,{observed:false,lastOutcome:'none',completion:null}]))};}
 function ensure(state){state.foundations??={};return state.foundations[state.platform]??=fresh(state.platform);}
 function level(p){return {...LEVELS.find(l=>l.kind==='wg'),...PSPEC[p]['1-1'],pf:PLATFORMS[p]};}
 function mode(p,width){return KINDS.wg.evaluate(level(p),{w:width});}
 // Real orthogonal unitary splitter H_r, then balanced H_0.5 combiner.
 function ideal(ratio,phase){const upperAmplitude=Math.sqrt(ratio),lowerAmplitude=Math.sqrt(1-ratio),cross=2*Math.sqrt(ratio*(1-ratio))*Math.cos(phase);const main=(1+cross)/2;return {upperPower:ratio,lowerPower:1-ratio,upperAmplitude,lowerAmplitude,main,complement:1-main,phase};}
 const identity=(w,p)=>JSON.stringify({designId:w.designId,revision:w.revision,platform:p,wavelength:PLATFORMS[p].lam,...snapshot(w),modelSignature:signature});
 function evaluate(w,p,requestId){if(!S.foundationWorkspace(w,p))throw Error('Passive Input이 올바르지 않습니다.');const pf=PLATFORMS[p],wg=mode(p,w.width),guided=wg.nTE>0,beta=2*Math.PI*wg.te[0]/pf.lam,phase=beta*w.deltaL,id=identity(w,p);
  let intro=null;if(w.step==='intro'){const a=SMQ_V2_MZM.fresh(p);a.voltage=w.active?w.introVoltage:0;a.bench.bias=0;intro=SMQ_V2_MZM.evaluate(a,p,requestId);}
  return Object.freeze({identity:id,requestId,revision:w.revision,platform:p,inputs:snapshot(w),wg,guided,beta,phase,split:ideal(w.ratio,0),path:ideal(.5,phase),intro,modelSignature:signature,externalVerified:false});
 }
 const matches=(r,w,p,q)=>!!r&&r.requestId===q&&r.identity===identity(w,p)&&r.modelSignature===signature;
 function edit(w,p,k,v){if(k==='active'){if(typeof v!=='boolean'||w[k]===v)return false;}else{const [min,max]=limits(p,k);if(!['width','ratio','deltaL','introVoltage'].includes(k)||!Number.isFinite(v)||v<min||v>max||w[k]===v)return false;}w[k]=v;w.revision++;return true;}
 function restore(w,a,p){if(!S.foundationInputs(a,p))throw Error('복원할 Passive Input을 확인하세요.');Object.assign(w,clone(a));w.revision++;}
 const supported=(r,step)=>!!r&&(step==='path'?r.guided:step==='intro'?r.intro?.static.valid:true);
 function finish(w,kind){C.finish(w.progress[w.step],kind);}
 return {steps,signature,limits,snapshot,fresh,ensure,level,mode,ideal,identity,evaluate,matches,edit,restore,supported,finish};
})();
