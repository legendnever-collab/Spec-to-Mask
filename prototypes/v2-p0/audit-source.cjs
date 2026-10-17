// Read existing source models without production UI changes. Output is not wired to UX mock.
const fs=require('fs'),path=require('path'),vm=require('vm');
process.chdir(path.resolve(__dirname,'../..'));
const G=require('../../test/load')();
vm.runInContext(fs.readFileSync('src/bench/mzm.js','utf8').replace('const MZM_BENCH =','var MZM_BENCH ='),G);
const report={source:'289523340dedb04866a07151614c521654c16bc3',scope:'Read-only existing-engine audit, not P0 prototype output or external validation',platforms:[]};
for(const [pfid,pf]of Object.entries(G.PLATFORMS)){
 const make=id=>({...G.LEVELS.find(l=>l.id===id),...G.PSPEC[pfid][id],pf}),wg=make('1-1'),mz=make('2-3');
 const widths=[G.KINDS.wg.params(wg)[0].min,pf.w0,G.KINDS.wg.params(wg)[0].max].map(w=>{const r=G.KINDS.wg.evaluate(wg,{...wg.ref,w});return {w,te0:r.te[0],nTE:r.nTE,scatteringDbPerCm:r.alpha};});
 const length=[.5,2,3,6].map(L=>{const r=G.KINDS.mzm.evaluate(mz,{...mz.ref,L,useCard:0});return {L,Vpi:r.Vpi,IL:r.IL,bw:r.bw};});
 report.platforms.push({pfid,wgParams:G.KINDS.wg.params(wg),widths,mzmRef:mz.ref,pnRef:mz.pnRef,length,bendAudit:[pf.mat==='si'?1:10,pf.mat==='si'?2:20,pf.mat==='si'?8:80,pf.mat==='si'?20:200].map(R=>({R,width:pf.w0,...G.LAB.routeLoss([{t:'A',c:[0,0],r:R,a0_deg:0,a1_deg:90,w:pf.w0}],pf)}))});
}
fs.writeFileSync(path.join(__dirname,'source-audit.json'),JSON.stringify(report,null,2));console.log('Read-only audit: four platforms, width and MZM length outputs recorded');
