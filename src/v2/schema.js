// v2 additive ownership/validation. Loaded before persistence scanning; no legacy schema changes.
const SMQ_V2_SCHEMA = (() => {
  const KEY='smq-v2-learning',schema='smq-learning/1';
  const domains={si1310:{min:1,max:8,step:.1,start:1,width:.36},si1550:{min:1,max:10,step:.1,start:1,width:.46},sin1310:{min:10,max:80,step:1,start:10,width:.78},sin1550:{min:10,max:100,step:1,start:10,width:1}};
  const obj=v=>!!v&&typeof v==='object'&&!Array.isArray(v)&&!Object.keys(v).some(k=>['__proto__','constructor','prototype'].includes(k));
  const radius=(v,p)=>typeof v==='number'&&Number.isFinite(v)&&v>=domains[p].min&&v<=domains[p].max;
  function workspace(w,p){return obj(w)&&typeof w.designId==='string'&&w.designId.length>0&&w.designId.length<=100&&Number.isSafeInteger(w.revision)&&w.revision>=0&&radius(w.R,p)&&obj(w.original)&&radius(w.original.R,p)&&(w.comparison===null||obj(w.comparison)&&radius(w.comparison.R,p))&&typeof w.observed==='boolean'&&(w.completion===null||obj(w.completion)&&['observed','skipped','unobserved'].includes(w.completion.kind)&&Number.isFinite(w.completion.at)&&(w.completion.kind!=='observed'||w.observed))&&['none','observed','skipped','unobserved'].includes(w.lastOutcome);}
  function valid(v){return obj(v)&&v.schema===schema&&typeof v.active==='boolean'&&['overview','waveguide','summary'].includes(v.scene)&&Object.hasOwn(domains,v.platform)&&obj(v.by)&&Object.entries(v.by).every(([p,w])=>Object.hasOwn(domains,p)&&workspace(w,p));}
  return {KEY,schema,domains,valid,workspace,radius};
})();
