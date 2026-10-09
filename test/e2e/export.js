// Click "설계 내보내기" on levels loaded with their calibrated reference designs and save the smq-design/1 JSON.
// node test/e2e/export.js <platform|all> <ids> [outdir]
const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'../../dist/index.html'),'utf8');
const PS=new Function(fs.readFileSync(path.join(__dirname,'../../src/data/pspec.js'),'utf8')+';return PSPEC;')();
const plats=(process.argv[2]||'all')==='all'?['si1310','si1550','sin1310','sin1550']:process.argv[2].split(',');
const ids=(process.argv[3]||'1-3,1-4,1-5,D-1').split(',');
const out=process.argv[4]||path.join(__dirname,'../../tools/smq2gds/examples');
fs.mkdirSync(out,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function run(plat){
  const dom=new JSDOM('<!doctype html><html><head></head><body>'+html+'</body></html>',{runScripts:'outside-only',pretendToBeVisual:true,url:'https://e'+plat+Date.now()+'.test/'});
  const w=dom.window;
  const mkCtx=()=>{const g=()=>({addColorStop(){}});return new Proxy({},{get:(t,k)=>{if(k==='measureText')return()=>({width:30});if(k==='createImageData')return(a,b)=>({data:new Uint8ClampedArray(a*b*4)});if(k==='createLinearGradient'||k==='createRadialGradient')return g;if(k in t)return t[k];return typeof k==='string'?(()=>{}):undefined},set:(t,k,v)=>{t[k]=v;return true}});};
  w.HTMLCanvasElement.prototype.getContext=mkCtx;w.ResizeObserver=class{observe(){}};
  Object.defineProperty(w.HTMLElement.prototype,'clientWidth',{get(){return 700}});
  w.URL.createObjectURL=()=>'blob:x';w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=function(){};
  const errs=[];w.addEventListener('error',e=>errs.push(e.message));
  const D={};D[plat]={};ids.forEach(id=>{if(PS[plat][id]&&PS[plat][id].ref)D[plat][id]={...PS[plat][id].ref};});
  w.localStorage.setItem('smq3-designs',JSON.stringify(D));w.localStorage.setItem('smq3-progress',JSON.stringify({plat:null,by:{}}));
  w.eval(html.split('<script>')[1].split('</script>')[0]);
  const $=s=>w.document.querySelector(s);
  await sleep(200);
  $(`#pick-lam .choice[data-lam="${plat.endsWith('1310')?1.31:1.55}"]`).click();$(`#pick-mat .choice[data-mat="${plat.startsWith('sin')?'sin':'si'}"]`).click();$('#btn-start').click();await sleep(300);
  for(const id of ids){
    $(`.node[data-id="${id}"]`).click();await sleep(300);
    $('#btn-export').click();await sleep(50);
    const j=JSON.parse($('#jsonOut').value);
    if(j.schema!=='smq-design/1'||j.level.id!==id||j.platform.id!==plat)throw new Error('bad export '+plat+id);
    const f=path.join(out,`smq_${plat}_${id}.json`);fs.writeFileSync(f,JSON.stringify(j,null,2)+'\n');
    console.log(f.replace(/.*\//,''),'geometry',j.geometry?j.geometry.pcell:'-','| primary',j.predicted.primary.value,'| stars',j.level.stars,'| ok',j.predicted.objectives.map(o=>o.ok?1:0).join(''));
  }
  if(errs.length){console.log('ERRORS',errs);process.exitCode=1;}
}
(async()=>{for(const p of plats)await run(p);process.exit(process.exitCode||0);})();
