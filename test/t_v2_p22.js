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
 w.SMQ_V2.navigate('passive');let ui=w.SMQ_V2.foundations();ui.flush();ui.edit('2');ui.flush();
 ok(b.$('#scienceMode').options.length===7,'all TE/TM selectors');
 for(const mode of ['TE0','TE1','TE2','TE3']){b.$('#scienceMode').value=mode;b.$('#scienceMode').dispatchEvent(new w.Event('change'));ok(b.$('.science-field').dataset.mode===mode,'selected '+mode);}
 const before=JSON.stringify(w.SMQ_V2.state());b.$('#scienceField').value='intensity';b.$('#scienceField').dispatchEvent(new w.Event('change'));ok(before===JSON.stringify(w.SMQ_V2.state()),'view selection read only');
 ok([...w.document.querySelectorAll('.topnav button')].map(e=>e.textContent).join('|')==='Home|Session|종료','exact navigation');
 ok(w.SMQ_V2.exit(),'exit saved');ok(b.$('#v2ResumeExit'),'safe exit screen');b.$('#v2ResumeExit').click();ok(w.SMQ_V2.state().foundations.si1310.width===2,'exit resume design');
 ok(b.errors.length===0,'no runtime errors');console.log(count+' P2.2 checks PASS');
}finally{b.dom.window.close();}
