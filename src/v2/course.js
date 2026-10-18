// Additive course inputs; kernels and their coefficients remain unchanged.
const SMQ_V2_COURSE = (() => {
 const passiveSteps=['width','bend','ybranch','couplers'],newSteps=['bend','ybranch','couplers'];
 const record=()=>({observed:false,lastOutcome:'none',completion:null});
 const level=(p,id)=>({...LEVELS.find(a=>a.id===id),...PSPEC[p][id],pf:PLATFORMS[p]});
 function defaults(p){const a=level(p,'1-3').ref,b=level(p,'1-2').ref;return {radius:SMQ_V2_SCHEMA.domains[p].start,shape:0,gap:b.g,dcLength:b.L,mmiWidth:a.W,mmiLength:a.L,coupler:'dc'};}
 function ensure(w,p){w.course??=defaults(p);w.original.course??=defaults(p);if(w.comparison)w.comparison.course??=defaults(p);for(const k of newSteps)w.progress[k]??=record();return w;}
 function edit(w,p,k,v){const a={...w.course,[k]:v};if(!SMQ_V2_SCHEMA.courseInputs(a,p)||JSON.stringify(a)===JSON.stringify(w.course))return false;w.course=a;w.revision++;return true;}
 function extra(w,p){if(!w.course)return {};const c=w.course,pf=PLATFORMS[p];if(w.step==='bend'){const b=SMQ_V2_CORE.at(p,c.radius),other=(pf.mat==='si'?'sin':'si')+(pf.lam<1.4?'1310':'1550'),q=SMQ_V2_SCHEMA.domains[other],R=Math.max(q.min,Math.min(q.max,c.radius)),paired=SMQ_V2_CORE.at(other,R);return {bend:b,paired:{platform:other,radius:R,result:paired},contrast:WGP[p].nco-WGP[p].nox};}
 if(w.step==='couplers'){const dc=KINDS.dc.evaluate(level(p,'1-2'),{g:c.gap,L:c.dcLength}),l=level(p,'1-3'),d={...l.ref,W:c.mmiWidth,L:c.mmiLength},prev={mat:PQ.PF.nCore===PQ.nSiN?'sin':'si',t:PQ.PF.t,rules:PQ.PF.rules};let mmi;try{PQ.setPlatform(pf.mat,pf.t,pf.rules);mmi=KINDS.mmi.evaluate(l,d);}finally{PQ.setPlatform(prev.mat,prev.t,prev.rules);}return {dc,mmi,mmiGeometry:d};}
 return {};}
 return {passiveSteps,newSteps,record,level,defaults,ensure,edit,extra};
})();
