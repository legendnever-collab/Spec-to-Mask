const {JSDOM}=require('jsdom');const fs=require('fs');
const html=fs.readFileSync(require('path').join(__dirname,'../../dist/index.html'),'utf8');
const dom=new JSDOM('<!doctype html><html><head></head><body>'+html+'</body></html>',{runScripts:'outside-only',pretendToBeVisual:true,url:'https://s'+Date.now()+'.test/'});
const w=dom.window;
const mkCtx=()=>{const g=()=>({addColorStop(){}});return new Proxy({},{get:(t,k)=>{if(k==='measureText')return()=>({width:30});if(k==='createImageData')return(a,b)=>({data:new Uint8ClampedArray(a*b*4)});if(k==='createLinearGradient'||k==='createRadialGradient')return g;if(k in t)return t[k];return typeof k==='string'?(()=>{}):undefined},set:(t,k,v)=>{t[k]=v;return true}});};
w.HTMLCanvasElement.prototype.getContext=mkCtx;w.ResizeObserver=class{observe(){}};
Object.defineProperty(w.HTMLElement.prototype,'clientWidth',{get(){return 700}});
w.atob=(s)=>Buffer.from(s,'base64').toString('binary');
const errs=[];w.addEventListener('error',e=>errs.push(e.message+' @'+((e.error&&e.error.stack)||'').split('\n').slice(1,3).join('|')));
try{w.eval(html.split('<script>')[1].split('</script>')[0]);}catch(e){console.log('THROW',e.stack)}
const $=s=>w.document.querySelector(s);const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const coach=()=>$('#coach').hidden?'(hidden)':$('#coach').textContent.replace(/\s+/g,' ').trim();
const plat=process.argv[2]||'si1310';
(async()=>{
 await sleep(300);
 console.log('setup visible',!$('#setup').hidden,'game hidden',$('#gamewrap').hidden);
 $(`#pick-lam .choice[data-lam="${plat.endsWith('1310')?1.31:1.55}"]`).click(); $(`#pick-mat .choice[data-mat="${plat.startsWith('sin')?'sin':'si'}"]`).click();
 console.log('summary:',$('#pick-sum').textContent.slice(0,200));
 $('#btn-start').click(); await sleep(500);
 console.log('chip',$('#plat-chip').textContent,'| map',$('#map').textContent.replace(/\s+/g,' ').slice(0,160));
 for(const id of (process.argv[3]||'1-1,1-2,1-3,1-4,1-5,1-6,1-7,2-1,2-2,2-3,2-4,2-5,3A,3A+,D-1,D-2,B-1,B-2,B-3').split(',')){
  $(`.node[data-id="${id}"]`).click(); await sleep(450);
  console.log(`\n== ${id} ${$('#m-name').textContent} | ${$('#m-eyebrow').textContent} | ${$('#score-big').textContent}`);
  console.log(' pre:',$('#m-preface').hidden?'-':$('#m-preface').textContent.slice(0,60),'| concepts:',$('#m-concepts').hidden?'-':$('#m-concepts').querySelector('summary').textContent.slice(0,80));
  console.log(' tiles',$('#tiles').textContent,'| objs',$('#objs').textContent.replace(/\s+/g,' ').slice(0,200));
  console.log(' chart',$('#chart-title').textContent,$('#chart').innerHTML.length,'| coach',coach().slice(0,150));
 }
 console.log('\nerrors',errs.slice(0,5));process.exit(0);
})();
