// P1 physics adapter: unmodified LAB strip/EIM arc model; no scoring or global platform changes.
const SMQ_V2_CORE = (() => {
  const S=SMQ_V2_SCHEMA,signature='v2-waveguide/1;LAB-arc;strip-EIM@28952334';
  const clone=v=>JSON.parse(JSON.stringify(v)),curves=new Map();
  function fresh(p){return {designId:'wg-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10),revision:0,R:S.domains[p].start,original:{R:S.domains[p].start},comparison:null,observed:false,completion:null,lastOutcome:'none'};}
  function create(){return {schema:S.schema,active:true,scene:'overview',platform:'si1310',by:{si1310:fresh('si1310')}};}
  const payload=(w,p)=>({designId:w.designId,revision:w.revision,platform:p,R:w.R,width:PLATFORMS[p].w0,wavelength:PLATFORMS[p].lam,modelSignature:signature});
  const identity=(w,p)=>JSON.stringify(payload(w,p));
  function at(p,R){if(!Object.hasOwn(S.domains,p)||!S.radius(R,p))throw Error('Bend Radius가 지원 범위를 벗어났습니다.');const pf=PLATFORMS[p],prims=[{t:'A',c:[0,0],r:R,a0_deg:0,a1_deg:90,w:pf.w0}];const loss=LAB.routeLoss(prims,pf);if(![loss.L,loss.prop,loss.bend,loss.total].every(Number.isFinite))throw Error('Model Evaluation을 완료하지 못했습니다.');return {R,width:pf.w0,lambda:pf.lam,footprint:(R+pf.w0/2)**2,length:loss.L,bend:loss.bend,prop:loss.prop,total:loss.total,through:10**(-loss.total/10),prims};}
  function evaluate(w,p,requestId){if(!S.workspace(w,p))throw Error('Design State가 올바르지 않습니다.');const data=at(p,w.R),id=identity(w,p);return Object.freeze({...data,identity:id,inputDigest:SMQ_STORE.fnv(id),designId:w.designId,revision:w.revision,platform:p,requestId,modelSignature:signature,confidence:'Analytical / Surrogate Model',externalVerified:false});}
  function matches(r,w,p,requestId){return !!r&&r.requestId===requestId&&r.identity===identity(w,p)&&r.modelSignature===signature;}
  function edit(w,p,R){if(!S.radius(R,p))return false;if(w.R===R)return false;w.R=R;w.revision++;return true;}
  function curve(p){if(!curves.has(p)){const d=S.domains[p],v=Array.from({length:81},(_,i)=>at(p,d.min+(d.max-d.min)*i/80));curves.set(p,v);}return curves.get(p);}
  function finish(w,kind){w.lastOutcome=kind;if(w.completion?.kind!=='observed'||kind==='observed')w.completion={kind,at:Date.now()};}
  return {signature,clone,fresh,create,payload,identity,at,evaluate,matches,edit,curve,finish};
})();
