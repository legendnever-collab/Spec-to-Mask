const assert=require('assert'),boot=require('./v2_boot');const b=boot(),w=b.w,S=w.eval('SMQ_V2_SCIENCE'),F=w.eval('SMQ_V2_FOUNDATIONS');let count=0;const ok=(v,m)=>{assert(v,m);count++;};
try{
 for(const p of ['si1310','si1550','sin1310','sin1550']){
  const data=w.eval('P22_FIELDS')[p];ok(data&&data.boundary.includes('Dirichlet'),p+' provenance');
  for(const sample of Object.values(data.fields)){
   const r=F.mode(p,sample.width),list=S.modeOptions(p,sample.width);
   ok(list.filter(a=>a.name.startsWith('TE')&&a.guided).every(a=>a.supported||a.reason.includes('판정')),p+sample.width+' all guided TE have field or explicit cutoff disagreement');
   for(const a of list.filter(a=>a.supported)){
    ok(a.field.E.length===2560,p+' numeric grid');
    ok(a.field.E.every(Number.isFinite),p+' finite field');
    ok(a.sample.width===sample.width,p+' exact geometry');
    if(w.eval('WGP')[p].ws.includes(sample.width))ok(Math.abs(a.field.neff-a.neff)<.002,p+' field/table discretization agreement');
    ok(Math.abs(a.field.parity)>.99,p+' parity');
   }
  }
  ok(!S.mode(p,.457123,'TE0').supported,p+' off-grid unsupported');
 }
 const M=w.eval('SMQ_V2_MATERIALS'),state=w.SMQ_V2.state(),fw=F.ensure(state);M.ensure(fw,'si1310');
 for(const family of ['si','sin','iox','ldw','polymer']){M.edit(fw,'material',family);M.edit(fw,'materialRadius',M.profiles[family].domain[0]);const r=M.result(fw,'si1310');ok(r.family===family,'material identity '+family);ok(['si','sin'].includes(family)?r.valid&&!Number.isNaN(r.a.total):!r.valid&&r.a===null,'supported numerical domain '+family);}
 M.edit(fw,'comparison','fixed');ok(!M.result(fw,'si1310').valid,'fixed geometry not promoted to calibrated result');
 M.edit(fw,'material','si');M.edit(fw,'comparison','representative');M.edit(fw,'materialRadius',1);const shape1=M.view(fw,'si1310').physical;M.edit(fw,'materialRadius',8);ok(shape1!==M.view(fw,'si1310').physical,'radius updates geometry');ok(M.radiusLabel(4000)==='4.00 mm'&&M.radiusLabel(20000)==='2.00 cm','material scale units');
 const P=w.eval('SMQ_V2_PASSIVE_SCIENCE'),C=w.eval('SMQ_V2_COURSE'),PQ=w.eval('PQ');
 for(const p of ['si1310','si1550','sin1310','sin1550']){const a=F.fresh(p);C.ensure(a,p);a.step='couplers';for(const type of ['1x2','2x2']){a.science.mmiType=type;const z=F.evaluate(a,p,1),q=z.mmi.sol,dx=q.grid.x[1]-q.grid.x[0],map=PQ.fieldMap(q,z.mmi.d.L,3),norm=j=>Array.from({length:q.grid.n},(_,i)=>map[j*q.grid.n+i]*dx).reduce((a,b)=>a+b,0);ok(Math.abs(norm(0)-norm(2))<1e-5,p+type+' guided field norm');const diagnostic=P.mmi(z,p).plot;if(q.P[0]+q.P[1]>1+1e-6)ok(diagnostic.includes('NOT VERIFIED: Port basis overlap'),p+type+' nonorthogonal port energy flagged');if(type==='1x2'&&Math.abs(q.P[0]-q.P[1])>1e-6)ok(diagnostic.includes('NOT VERIFIED: Grid asymmetry'),p+' grid asymmetry flagged');
 for(let k=0;k<2;k++){let re=0,im=0;for(let i=0;i<q.grid.n;i++){let er=0,ei=0;for(let j=0;j<q.beta.length;j++){const ph=-(q.beta[j]-q.beta[0])*z.mmi.d.L;er+=q.c[j]*q.mmi.v[j][i]*Math.cos(ph);ei+=q.c[j]*q.mmi.v[j][i]*Math.sin(ph);}re+=er*q.outs[k][i]*dx;im+=ei*q.outs[k][i]*dx;}ok(Math.abs(re*re+im*im-q.P[k])<1e-8,p+type+' direct exit-field port overlap '+k);}
 ok(Math.abs(Math.sin(Math.PI*z.dc.d.L/(2*z.dc.Lpi))**2-z.dc.k)<1e-12,p+' CMT consistent');}}
 for(const ratio of [0,.2,.5,1])for(const phase of [0,Math.PI/2,Math.PI,2*Math.PI]){const a=P.amplitudes(ratio,phase),ideal=F.ideal(ratio,phase);ok(Math.abs(a.p1+a.p2-1)<1e-12,'MZI complex power conservation');ok(Math.abs(a.p1-ideal.main)<1e-12,'MZI port convention');}
 const PN=w.eval('SMQ_V2_PN_SCIENCE'),A=w.eval('SMQ_V2_ACTIVE');
 for(const platform of ['si1310','si1550','sin1310','sin1550']){const ctx=A.context(platform);let prev=null;for(const bias of [0,.1,1,1.5,2,3]){const q=PN.calculate(ctx,bias),p=q.p;
 ok(Math.abs(p.NA*p.xp-p.ND*p.xn)/(p.NA*p.xp)<1e-12,'PN charge neutrality');
 ok(Math.abs(q.cells.reduce((sum,c)=>sum+c.I*q.m.dx,0)-1)<1e-10,'PN normalized optical mode');
 ok(q.cells.every(c=>c.n>=0&&c.h>=0&&Number.isFinite(c.n+c.h)),'PN physical mobile density');
 const fresh=F.fresh(platform);C.ensure(fresh,platform);A.ensure(fresh);fresh.step='pn';fresh.activeDemo.reverseBias=bias;const result=F.evaluate(fresh,platform,3).active;
 ok(Math.abs(q.deltaN-result.pn.deltaN)<1e-14&&Math.abs(q.phase-result.pn.phase)<1e-12,'PN rendered input and KPI identity');
 if(prev){ok(q.p.Wd>prev.p.Wd&&q.Cp<prev.Cp,'PN depletion / capacitance trend');ok(q.loss<prev.loss&&q.deltaN>prev.deltaN,'PN loss / index trend');ok(q.overlap.n<prev.overlap.n&&q.overlap.h<prev.overlap.h,'PN optical carrier overlap decreases');ok(Math.abs(q.p.Wd**2/prev.p.Wd**2-(q.p.vbi+bias)/(q.p.vbi+prev.bias))<1e-12,'PN governing equation');}prev=q;
 }}
 w.SMQ_V2.navigate('passive');let ui=w.SMQ_V2.foundations();ui.flush();ui.edit('2');ui.flush();
 ok(b.$('#scienceMode').options.length===7,'all TE/TM selectors');
 for(const mode of ['TE0','TE1','TE2','TE3']){b.$('#scienceMode').value=mode;b.$('#scienceMode').dispatchEvent(new w.Event('change'));ok(b.$('.science-field').dataset.mode===mode,'selected '+mode);}
 const before=JSON.stringify(w.SMQ_V2.state());b.$('#scienceField').value='intensity';b.$('#scienceField').dispatchEvent(new w.Event('change'));ok(before===JSON.stringify(w.SMQ_V2.state()),'view selection read only');
 ok([...w.document.querySelectorAll('.topnav button')].map(e=>e.textContent).join('|')==='Home|Session|종료','exact navigation');
 ok(w.SMQ_V2.exit(),'exit saved');ok(b.$('#v2ResumeExit'),'safe exit screen');b.$('#v2ResumeExit').click();ok(w.SMQ_V2.state().foundations.si1310.width===2,'exit resume design');
 ok(b.errors.length===0,'no runtime errors');console.log(count+' P2.2 checks PASS');
}finally{b.dom.window.close();}
