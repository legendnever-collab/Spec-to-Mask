// Shared startup / backup validation, loaded before the persistence scanner.
const SMQ_JOURNEY_SCHEMA = (() => {
 const obj=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
 const record=v=>obj(v)&&!Object.keys(v).some(k=>['__proto__','constructor','prototype'].includes(k));
 const snapshot=v=>record(v)&&record(v.designs)&&record(v.mzmBench)&&record(v.budget)&&Number.isInteger(v.revision)&&v.revision>=0;
 function work(w){return record(w)&&record(w.designs)&&record(w.lab)&&record(w.progress)&&record(w.progress.stars)&&['easy','std','hard'].every(k=>record(w.progress.stars[k]))&&['cards','best','ai','missions'].every(k=>record(w.progress[k]))&&['tests','completed','original','introduced','practice','evidence'].every(k=>record(w[k]))&&Number.isInteger(w.revision)&&w.revision>=0&&typeof w.designId==='string'&&w.designId.length>0&&record(w.mzmBench)&&Array.isArray(w.snapshots)&&w.snapshots.every(snapshot)&&(!w.protectedOriginal||snapshot(w.protectedOriginal));}
 function valid(j){return record(j)&&j.schema==='smq-journey/1'&&typeof j.active==='boolean'&&record(j.by)&&Object.entries(j.by).every(([pf,p])=>['si1310','si1550','sin1310','sin1550'].includes(pf)&&record(p)&&Number.isInteger(p.index)&&Number.isInteger(p.unlocked)&&p.index>=0&&p.index<=p.unlocked&&p.unlocked<=3&&work(p.tutorial)&&work(p.mzm)&&Array.from({length:p.unlocked},(_,i)=>p.tutorial.completed['0-'+(i+1)]).every(v=>record(v)&&Number.isFinite(v.at)));}
 return {valid};
})();
