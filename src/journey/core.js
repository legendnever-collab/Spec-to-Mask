// Additive curriculum controller. Device solvers and legacy objectives are unchanged.
const SMQ_JOURNEY_CORE = (() => {
'use strict';
const copy=v=>JSON.parse(JSON.stringify(v));
const session=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
const steps=[
 {id:'0-1',ch:0,n:1,title:'Understand Optical Communication',level:'2-5',keys:['P']},
 {id:'0-2',ch:0,n:2,title:'Understanding 200G',level:'2-3',keys:['modulation','baud']},
 {id:'0-3',ch:0,n:3,title:'Learn the Controls',level:'2-3',keys:['L','driver']}
];
const chapters=['Tutorial','Build a 200G MZM Link','Learn the Microring','Build a 200G MRM Link','Architecture Decision'];
function workspace(level){return {privateHistory:true,level:0,sub:0,designs:{},lab:{},progress:{stars:{easy:{},std:{},hard:{}},cards:{},best:{},ai:{},missions:{}},tests:{},completed:{},original:{},snapshots:[],mzmBench:{...MZM_BENCH.defaults(),pnMode:1,modulation:0,baud:28},introduced:{},practice:{},evidence:{},revision:0,designId:level+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),budget:null,rationale:''};}
function engineLevels(get){return Object.fromEntries(['2-2','2-3','2-4','2-5'].map(id=>[id,get(id)]));}
function init(w,ls){for(const [id,l] of Object.entries(ls))if(!w.designs[id])w.designs[id]=copy(l.start);if(!w.budget)w.budget={channel:2,coupling:ls['2-5'].parts.ssc,sensitivity:KINDS.pd.evaluate(ls['2-4'],ls['2-4'].ref).sensDbm};}
function validDesign(w,ls){return Object.entries(ls).every(([id,l])=>KINDS[l.kind].params(l).every(p=>Number.isFinite(w.designs[id]?.[p.k])&&w.designs[id][p.k]>=p.min&&w.designs[id][p.k]<=p.max))&&MZM_BENCH.valid(w.mzmBench)&&w.budget&&[['channel',0,20],['coupling',0,5],['sensitivity',-40,10]].every(([k,lo,hi])=>Number.isFinite(w.budget[k])&&w.budget[k]>=lo&&w.budget[k]<=hi);}
function calculate(w,ls){
 if(!validDesign(w,ls))throw Error('유효하지 않은 설계/실험/예산 입력');
 const pn=KINDS.pn.evaluate(ls['2-2'],w.designs['2-2']),bench=MZM_BENCH.analyse(ls['2-3'],{...w.designs['2-3'],useCard:0},w.mzmBench,{geometry:w.designs['2-2'],source:'Chapter-local PN geometry · '+w.designId});
 const e=bench.eye,outerOMA=e.ideal?.length===4?Math.abs(e.ideal[0]-e.ideal[3]):null;
 let link=null;
 if(outerOMA>0){const parts={...ls['2-5'].parts,ssc:w.budget.coupling,split:0,mux:0,gain:10*Math.log10(outerOMA),pen:0,sens:w.budget.sensitivity};const r=KINDS.els.evaluate({...ls['2-5'],parts},{...w.designs['2-5'],ns:0,useCard:0});
 link={laserDbm:w.designs['2-5'].P,outerOMA,omaGainDb:parts.gain,channel:w.budget.channel,couplingEach:w.budget.coupling,couplingCount:3,sensitivity:w.budget.sensitivity,rxOMA:r.rx+r.chan-w.budget.channel,rinPenalty:r.rin,margin:r.margin+r.chan-w.budget.channel,laserPj:r.pj,source:'KINDS.els, explicit single-lane loss adapter',limitation:'Independent reference PD sensitivity; static outer OMA, no dynamic ISI penalty in budget; no joint BER/FEC simulation'};}
 const laser=KINDS.els.evaluate(ls['2-5'],w.designs['2-5']);
 return {laser,pn:{Cp:pn.Cp,Rp:pn.Rp,VpiL:pn.VpiL,loss:pn.loss,fRC:pn.fRC},pnPass:KINDS.pn.objectives(ls['2-2'],pn).t1.every(x=>x.ok),bench,link};
}

function fingerprint(w,pf){return SMQ_STORE.fnv(JSON.stringify([pf,SMQ_JOURNEY_MODEL_SIGNATURE,MODEL_VERSION,MZM_BENCH.version,'journey-controller/2',w.designId,w.designs,w.mzmBench,w.budget]));}
function createPlatform(){return {index:0,unlocked:0,tutorial:workspace('tutorial'),mzm:workspace('mzm')};}
function unlocked(p){let i=0;while(i<3&&p.tutorial.completed[steps[i].id])i++;return i;}
function canGo(p,i){return Number.isInteger(i)&&i>=0&&i<=3&&i<=unlocked(p);}
function navigate(p,i){if(!canGo(p,i))return false;p.index=i;p.unlocked=unlocked(p);return true;}
function touch(w,pf,before,key,kind='Tune'){
 const after=fingerprint(w,pf);if(before===after)return false;
 w.revision++;w.finished=null;
 // Only real parameter edits earn the tutorial's hands-on practice. Apply/restore are design revisions.
 if(key&&kind==='Tune'){const [id,field]=key.split(':');const a=w.practice[id]||(w.practice[id]={fields:{},at:Date.now()});a.fields[field]=true;}
 return true;
}
function practice(w,id){const f=w.practice[id]?.fields||{};return id==='0-1'?!!f.P:id==='0-2'?!!f.modulation&&!!f.baud:!!f.L||!!f.driver;}
function objective(id,r,w){
 if(id==='0-1')return !!r.laser&&Number.isFinite(r.laser.rx)&&Number.isFinite(r.laser.margin);
 if(id==='0-2')return w.mzmBench.modulation===1&&w.mzmBench.baud===112&&r.bench.eye.rawGbps===224&&r.bench.eye.traces.length>0;
 return r.bench.samples.length===120&&r.bench.samples.every(v=>Number.isFinite(v.eoDb));
}
function evaluate(w,pf,step,r){return {
 ok:!!(w.introduced[step.id]&&practice(w,step.id)&&objective(step.id,r,w)),
 conceptIntroduced:!!w.introduced[step.id],practiceCompleted:practice(w,step.id),currentDesignEvaluated:true,
 engineeringObjectiveMet:objective(step.id,r,w),fingerprint:fingerprint(w,pf),revision:w.revision,designIdentity:w.designId,
 session,at:Date.now(),source:step.id==='0-1'?'KINDS.els':'mzm-bench/2 / mzm-eye/1',
 calculation:{rawGbps:r.bench.eye.rawGbps,eyeGap:r.bench.eye.opening,laserOutput:r.laser.rx,laserMargin:r.laser.margin},external:'NOT VERIFIED'
};}
function current(w,pf,id){const e=w.evidence[id];return !!w.introduced[id]&&practice(w,id)&&!!e?.ok&&e.currentDesignEvaluated===true&&e.session===session&&e.revision===w.revision&&e.designIdentity===w.designId&&e.fingerprint===fingerprint(w,pf);}
function complete(p,pf,r){const x=steps[p.index],w=p.tutorial;if(!x||!current(w,pf,x.id)||!evaluate(w,pf,x,r).ok)return false;
 w.completed[x.id]={at:Date.now(),fingerprint:fingerprint(w,pf),revision:w.revision};
 if(x.id==='0-3')w.finished={at:Date.now(),fingerprint:fingerprint(w,pf)};
 p.unlocked=unlocked(p);p.index=Math.min(p.index+1,3);return true;
}
function snapshot(w,label){const v=copy({designs:w.designs,mzmBench:w.mzmBench,budget:w.budget,rationale:w.rationale,revision:w.revision});w.snapshots.push({label,at:Date.now(),...v});w.snapshots=w.snapshots.slice(-12);return v;}
return {steps,chapters,copy,workspace,createPlatform,engineLevels,init,validDesign,calculate,fingerprint,touch,practice,objective,evaluate,current,unlocked,canGo,navigate,complete,snapshot,session};
})();
if (typeof window !== 'undefined') window.SMQ_JOURNEY_CORE = SMQ_JOURNEY_CORE;
