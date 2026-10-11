// Learning Guide e2e: every level opens a guide with sections A–G (plus S, the current step's explanation, on a Guided step), every live parameter has an explanation row,
// the interactive example renders, references carry links, and closing the guide leaves the design and score untouched.
// node test/e2e/guide.js [platform] [ids]
const {JSDOM}=require('jsdom');const fs=require('fs');
const html=fs.readFileSync(require('path').join(__dirname,'../../dist/index.html'),'utf8');
const plat=process.argv[2]||'si1310', ids=(process.argv[3]||'1-1,1-2,1-3,1-4,1-5,1-6,1-7,2-1,2-2,2-3,2-3R,2-4,2-5,3A,3A+,3W,D-1,D-2,B-1,B-2,B-3').split(',');
const dom=new JSDOM('<!doctype html><html><head></head><body>'+html+'</body></html>',{runScripts:'outside-only',pretendToBeVisual:true,url:'https://g'+Date.now()+'.test/'});
const w=dom.window;
const mkCtx=()=>{const g=()=>({addColorStop(){}});return new Proxy({},{get:(t,k)=>{if(k==='measureText')return()=>({width:30});if(k==='createImageData')return(a,b)=>({data:new Uint8ClampedArray(a*b*4)});if(k==='createLinearGradient'||k==='createRadialGradient')return g;if(k in t)return t[k];return typeof k==='string'?(()=>{}):undefined},set:(t,k,v)=>{t[k]=v;return true}});};
w.HTMLCanvasElement.prototype.getContext=mkCtx;w.ResizeObserver=class{observe(){}};
Object.defineProperty(w.HTMLElement.prototype,'clientWidth',{get(){return 700}});
w.atob=(s)=>Buffer.from(s,'base64').toString('binary');
const errs=[];w.addEventListener('error',e=>errs.push(e.message+' @'+((e.error&&e.error.stack)||'').split('\n').slice(1,3).join('|')));
w.eval(html.split('<script>')[1].split('</script>')[0]);
const $=s=>w.document.querySelector(s);const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let fail=0;const bad=(m)=>{fail++;console.log('  FAIL',m);};
(async()=>{
 await sleep(300);
 $(`#pick-lam .choice[data-lam="${plat.endsWith('1310')?1.31:1.55}"]`).click(); $(`#pick-mat .choice[data-mat="${plat.startsWith('sin')?'sin':'si'}"]`).click(); $('#btn-start').click(); await sleep(400);
 const runOne=async(id,tag)=>{
  const before=JSON.stringify(JSON.parse(w.localStorage.getItem('smq3-designs')||'{}')), score=$('#score-big').textContent;
  $('#btn-guide').focus(); $('#btn-guide').click(); await sleep(120);
  const dlg=$('#guide-dlg'); if(dlg.hidden) return bad(id+' guide did not open');
  // a level opened on a Guided step adds section S (that step's explanation) before A–G
  const secs=[...w.document.querySelectorAll('#guide-body .gsec')].map(s=>s.id), stepping=!!$('main.game.stepping')||!$('#m-guided').hidden&&!!$('.stp[aria-current="step"]');
  if(secs.filter(x=>x!=='g-S').join()!=='g-A,g-B,g-C,g-D,g-E,g-F,g-G'||(secs.includes('g-S')&&(secs[0]!=='g-S'||!stepping))) bad(id+' sections '+secs);
  if(secs.includes('g-S')&&!/무엇을 왜 하나/.test($('#g-S').textContent)) bad(id+' step section S has no explanation');
  const rows=[...w.document.querySelectorAll('#g-C tr[data-k]')], miss=rows.filter(r=>r.classList.contains('miss')).map(r=>r.dataset.k);
  const nP=w.document.querySelectorAll('#prm-list .prm').length; if(rows.length!==nP) bad(`${id} param rows ${rows.length} vs controls ${nP}`); if(miss.length) bad(id+' params without explanation: '+miss);
  rows.forEach(r=>{const u=r.children[2].textContent.trim(); if(!u) bad(id+' empty unit cell '+r.dataset.k);});
  if(!$('#gx-gen')&&!$('#gx-cw')) bad(id+' no interactive example');
  if($('#gx-k')){ const s=$('#gx-k'); for(const o of [...s.options].slice(0,3)){ s.value=o.value; s.dispatchEvent(new w.Event('change')); await sleep(60); const r=$('#gx-v'); r.value=String((+r.min*0.3+ +r.max*0.7)); r.dispatchEvent(new w.Event('input')); await sleep(20); if(!$('#gx-t').textContent.trim()) bad(id+' example tiles empty for '+o.value); } }
  const links=[...w.document.querySelectorAll('#g-G a[href^="https://"]')].length; if(links<3) bad(id+' references '+links);
  const lim=w.document.querySelectorAll('#g-F .badge2').length; if(lim<3) bad(id+' model-limit rows '+lim);
  if(!$('#g-E li')) bad(id+' mission list empty');
  if(!$('#g-B svg')) bad(id+' no schematic');
  // depth toggle
  $('#guide-depth [data-depth="deep"]').click(); if(w.document.querySelector('.gdlg').dataset.depth!=='deep') bad(id+' depth toggle');
  $('#guide-depth [data-depth="basic"]').click();
  const keyEsc=new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}); dlg.dispatchEvent(keyEsc); await sleep(60);
  if(!dlg.hidden) bad(id+' Escape did not close');
  if(w.document.activeElement!==$('#btn-guide')) bad(id+' focus not restored to the guide button');
  const after=JSON.stringify(JSON.parse(w.localStorage.getItem('smq3-designs')||'{}'));
  if(after!==before) bad(id+' design changed by the guide');
  if($('#score-big').textContent!==score) bad(id+' score changed by the guide');
  console.log(`ok ${tag||id} · params ${nP} · refs ${links} · limits ${lim}`);
 };
 for(const id of ids){ $(`.node[data-id="${id}"]`).click(); await sleep(700); await runOne(id); }
 if(ids.includes('D-1')){ // rectangular layout mode guide (parameter list changes)
  $('.node[data-id="D-1"]').click(); await sleep(300); const r=$('#p-lay'); r.value='2'; r.dispatchEvent(new w.Event('input',{bubbles:true})); await sleep(700); await runOne('D-1','D-1 (직사각형 레이아웃)');
  const m=$('#p-dm'); m.value='1'; m.dispatchEvent(new w.Event('input',{bubbles:true})); await sleep(700); await runOne('D-1','D-1 (Mode B)');
 }
 if(ids.includes('1-7')){ // guided step guide
  $('.node[data-id="1-7"]').click(); await sleep(300); const s=$('.stp[data-step="0"]'); if(s){s.click(); await sleep(700); await runOne('1-7','1-7 (Guided step 1)');}
 }
 if(ids.includes('2-3R')){ // microring: the Full Design guide must have a row for every parameter (Guided step 1 shows only R)
  $('.node[data-id="2-3R"]').click(); await sleep(300); const f=$('[data-gm="full"]'); if(f){f.click(); await sleep(700); await runOne('2-3R','2-3R (Full Design)');}
 }
 console.log(fail?`FAILED ${fail}`:'guide checks passed','errors',errs.slice(0,5));process.exit(fail||errs.length?1:0);
})();
