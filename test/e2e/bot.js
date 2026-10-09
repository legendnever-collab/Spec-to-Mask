const {JSDOM}=require('jsdom');const fs=require('fs');
const html=fs.readFileSync(require('path').join(__dirname,'../../dist/index.html'),'utf8');
const dom=new JSDOM('<!doctype html><html><head></head><body>'+html+'</body></html>',{runScripts:'outside-only',pretendToBeVisual:true,url:'https://f'+Date.now()+'.test/'});
const w=dom.window;
const mkCtx=()=>{const g=()=>({addColorStop(){}});return new Proxy({},{get:(t,k)=>{if(k==='measureText')return()=>({width:30});if(k==='createImageData')return(a,b)=>({data:new Uint8ClampedArray(a*b*4)});if(k==='createLinearGradient'||k==='createRadialGradient')return g;if(k in t)return t[k];return typeof k==='string'?(()=>{}):undefined},set:(t,k,v)=>{t[k]=v;return true}});};
w.HTMLCanvasElement.prototype.getContext=mkCtx;w.atob=(x)=>Buffer.from(x,'base64').toString('binary');w.ResizeObserver=class{observe(){}};
Object.defineProperty(w.HTMLElement.prototype,'clientWidth',{get(){return 700}});
const errs=[];w.addEventListener('error',e=>errs.push(e.message));
// optional preset designs: DES='{"D-1":{...}}' plays those levels from the given design (e.g. a layout mode)
if(process.env.DES){const pl=process.argv[5]||'si1310';w.localStorage.setItem('smq3-designs',JSON.stringify({[pl]:JSON.parse(process.env.DES)}));w.localStorage.setItem('smq3-progress',JSON.stringify({plat:null,by:{}}));}
w.eval(html.split('<script>')[1].split('</script>')[0]);
const $=s=>w.document.querySelector(s);const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const coach=()=>$('#coach').hidden?'':$('#coach').textContent.replace(/\s+/g,' ').trim();
const set=(k,v)=>{const r=$('#p-'+k);r.value=String(v);r.dispatchEvent(new w.Event('input',{bubbles:true}));};
const symMap=()=>Object.fromEntries([...w.document.querySelectorAll('.prm')].map(p=>[p.querySelector('label i').textContent.trim(),p.querySelector('input').dataset.k]));
const mode=process.argv[2]||'std', tier=process.argv[3]||'2', ids=(process.argv[4]||'1-1,1-2,1-3,1-4,1-5,1-6,1-7').split(','), plat=process.argv[5]||'si1310';
async function play(id){
 $(`.node[data-id="${id}"]`).click(); await sleep(300);
 $(`#hint-seg button[data-h="${tier}"]`).click(); await sleep(300);
 let last='';
 for(let i=0;i<(+process.env.MAXIT||90);i++){
  await sleep(250); const t=coach(), sm=symMap(); let m, act='';
  if(m=t.match(/권장: (.+?) \(기준/)){ for(const part of m[1].split('·')){ const q=part.trim().match(/^(\S+) = ([\-\d.]+)/); if(q&&sm[q[1]]){set(sm[q[1]],q[2]);act+='rec '+q[1]+' ';} } }
  else if(m=t.match(/열 격리 = (\d)/)){set('iso',m[1]);act='iso';}
  else if(m=t.match(/ h ≥ ([\d.]+) µm/)){set('h',m[1]);act='h>=';}
  else if(m=t.match(/ h ≈ ([\d.]+) µm/)){set('h',m[1]);act='h~';}
  else if(m=t.match(/[^I]L ≥ (\d+) µm/)){set('L',m[1]);act='L>=';}
  else if(m=t.match(/[^I]L ≤ (\d+) µm/)){set('L',m[1]);act='L<=';}
  else if(m=t.match(/간격 p ≥ ([\d.]+) µm/)){set('pitch',m[1]);act='pitch';}
  else if(m=t.match(/길이 하한 ≈ (\d+) µm/)){set('L',m[1]);act='Lmin';}
  else if(m=t.match(/TE2가 guided 되는 폭은 대략 (\d+) nm/)){set('w',(+m[1]+60)/1000);act='wmulti';}
  else if(m=t.match(/TE1 차단 폭 ≈ (\d+) nm\./)){set('w',(+m[1]-50)/1000);act='wsingle';}
  else if(m=t.match(/목표 폭 ≈ (\d+) nm/)){set('w',+m[1]/1000);act='wpol';}
  else if(m=t.match(/최대 폭 ≈ (\d+) nm/)){set('w',(+m[1]-6)/1000);act='wmax';}
  else if(m=t.match(/창: (\d+) nm ~ (\d+) nm/)){set('w',(+m[1]+ +m[2])/2000);act='wwin';}
  else if(m=t.match(/지금 갭에서 Lπ ≈ ([\d.]+) µm/)){set('L',m[1]);act='Lpi';}
  else if(m=t.match(/예: 갭 ≈ ([\d.]+) µm, L ≈ ([\d.]+) µm/)){set('g',m[1]);set('L',m[2]);act='gL';}
  else if(m=t.match(/추천 한 수: (\S+) ([\-\d.]+).*? → ([\-\d.]+)/)){ if(sm[m[1]]){set(sm[m[1]],m[3]);act='mv '+m[1];} }
  else if(m=t.match(/최적 팁 ≈ ([\d.]+)/)){set('tw',m[1]);act='tw';}
  else if(m=t.match(/출발점: W ≈ ([\d.]+) µm, s ≈ ([\d.]+)/)){set('W',m[1]);set('s',m[2]);act='Wstart';}
  else if(m=t.match(/s ([\d.]+) · wₜ ([\d.]+) µm로/)){set('s',m[1]);set('wt',m[2]);act='swt';}
  else if(m=t.match(/목표 L ≈ ([\d.]+)/)){set('L',m[1]);act='L';}
  else if(m=t.match(/ L ≈ ([\d.]+) µm → 면적/)){set('L',m[1]);act='Lshort';}
  else if(m=t.match(/목표 s ≈ ([\d.]+)/)){set('s',m[1]);act='s';}
  else if(m=t.match(/s ≈ ([\d.]+) µm로 옮긴/)){set('s',m[1]);act='sP';}
  else if(m=t.match(/wₜ = ([\d.]+) µm이면/)){set('wt',m[1]);act='wt';}
  else if(m=t.match(/wₜ ≤ ([\d.]+)/)){set('wt',m[1]);act='wt<=';}
  else if(m=t.match(/s ≥ ([\d.]+)/)){set('s',m[1]);act='s>=';}
  else if(m=t.match(/s ≤ ([\d.]+)/)){set('s',m[1]);act='s<=';}
  else if(m=t.match(/W ≥ ([\d.]+)/)){set('W',m[1]);act='W>=';}
  else if(m=t.match(/Lt ≈ (\d+) µm, p ≈ ([\d.]+)/)){set('Lt',m[1]);set('p',m[2]);act='Ltp';}
  else if(m=t.match(/목표 ΔL₁ ≈ ([\d.]+)/)){set('dL1',m[1]);act='dL1';}
  else if(m=t.match(/목표 ΔL₂ ≈ ([\d.]+)/)){set('dL2',m[1]);act='dL2';}
  else if(m=t.match(/(φ₁|φ₂ₐ|φ₂ᵦ) ≈ ([\-\d.]+)π로/)){set(sm[m[1]],m[2]);act='trim';}
  else if(m=t.match(/wₐ ≈ ([\d.]+) µm이면/)){set('wa',m[1]);act='wa';}
  else if(/차수를 올려/.test(t)){set('ord',(+$('#p-ord').value)+1);act='ord+';}
  else if(m=t.match(/최악 코너.*최적 팁 ≈ ([\d.]+)/)){set('tw',m[1]);act='twR';}
  else if(m=t.match(/광섬유와 크기가 맞는 팁은 ≈ ([\d.]+)/)){set('tw',m[1]);act='tw2';}
  else if(/Tape-out 해보세요/.test(t)){ $('#btn-fab').click(); await sleep(3500); act='fab';}
  else if(/단계 완료/.test(t)&&$('#step-next')){ $('#step-next').click(); await sleep(300); act='next '+$('#score-brk').textContent.slice(0,20);}
  if(process.env.V) console.log('   ',i,act,t.slice(0,150));
  if(!act || (act===last && t===coach())) { if(!act) break; }
  last=act;
 }
 const objs=[...w.document.querySelectorAll('.obj')].map(o=>o.classList.contains('live')?'✓':'✗').join('');
 console.log(`${mode}/t${tier} ${id} final ${[...w.document.querySelectorAll('.prm input')].map(i=>i.dataset.k+'='+i.value).join(' ')} | ${$('#score-big').textContent} | ${objs} | yield ${$('#yield').textContent} | coach: ${coach().slice(0,110)}`);
}
(async()=>{await sleep(300);
 $(`#pick-lam .choice[data-lam="${plat.endsWith('1310')?1.31:1.55}"]`).click(); $(`#pick-mat .choice[data-mat="${plat.startsWith('sin')?'sin':'si'}"]`).click(); $('#btn-start').click(); await sleep(400);
 if(mode!=='std'){$(`#mode-seg button[data-m="${mode}"]`).click(); await sleep(300);}
 for(const id of ids) await play(id); console.log('errors',errs.slice(0,3));process.exit(0);})();
