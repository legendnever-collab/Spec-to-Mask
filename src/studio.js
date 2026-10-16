// Unified Photonics Studio: additive navigation/presentation adapter; no solver replacements.
(() => {
'use strict';
const $ = s => document.querySelector(s), clone = v => JSON.parse(JSON.stringify(v)), SH = window.GAME_SHELL, LU = window.LABUI;
if (!SH || !LU) return;
const text = v => { const e=document.createElement('span');e.innerHTML=String(v??'');return e.textContent; };
const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const TRACKS = [
 {id:'fundamentals',name:'PIC Fundamentals',levels:[
  {name:'Waveguide',ids:['1-1'],goal:'폭을 바꾸며 모드·손실·편광을 관찰하세요.'},
  {name:'Directional Coupler',ids:['1-2'],goal:'Coupling Gap과 길이로 분배비를 맞추세요.'},
  {name:'Splitter / MMI',ids:['1-3','1-4','1-5'],goal:'분배비·균일도·크기를 실제 모델로 검토하세요.'},
  {name:'Spot Size Converter',ids:['1-6'],goal:'Taper 길이와 Tip 폭의 손실 Trade-off를 확인하세요.'},
  {name:'CWDM',ids:['1-7'],goal:'Guided Steps로 파장 분리를 만들고 Full Design을 Test하세요.'},
  {name:'Component Review',ids:['2-4','2-5'],goal:'PD와 Laser의 성능·전력 예산을 검토하세요. Component JSON까지 지원합니다.'}]},
 {id:'mzm-dr8',name:'MZM DR8',mod:0,levels:[
  {name:'Tx Specification / TW-MZM',ids:['2-2','2-3'],goal:'PN Phase와 TW-MZM의 대역폭·손실·구동 전압을 맞추세요.'},
  {name:'DR8 Architecture',ids:['3A','3A+'],goal:'8 × 200G 데이터 레인의 Optical Budget과 전력을 검토하세요.'},
  {name:'Schematic / Floorplan',lab:[0,1],goal:'회로 연결과 다이 경계를 실제 Lab 검사로 확인하세요.'},
  {name:'Optical Routing',lab:[2],goal:'배선 길이·굽힘·손실·DRC를 확인하세요.'},
  {name:'Electrical Interface',lab:[3],goal:'RF / DC 연결과 급전 방식을 확인하세요.'},
  {name:'Verification / Mask Handoff',lab:[4,5],goal:'Verification → Circuit Export → GDS 재검사 절차를 확인하세요.'}]},
 {id:'mrr-dr8',name:'MRR DR8',mod:1,levels:[
  {name:'Resonance / Q',ids:['2-3R'],goal:'Resonance·Q·RC·Thermal Guided Steps를 직접 조절하세요.'},
  {name:'Thermal / DR8 Architecture',ids:['2-1','3A+'],goal:'Heater 전력과 MRR DR8의 Lock·Optical Budget을 검토하세요.'},
  {name:'Schematic / Floorplan',lab:[0,1],goal:'8개 MRR의 회로와 다이 배치를 확인하세요.'},
  {name:'Optical Routing',lab:[2],goal:'실제 배선 형상과 손실·DRC를 확인하세요.'},
  {name:'Electrical Interface',lab:[3],goal:'Ring 구동선과 Heater 연결을 확인하세요.'},
  {name:'Verification / Mask Handoff',lab:[4,5],goal:'현재 Geometry의 Verification과 Circuit Export를 완료하세요.'}]},
 {id:'mrr-wdm8',name:'MRR WDM8',mod:2,levels:[
  {name:'Wavelength Planning',ids:['1-7'],goal:'파장 간격과 분리 원리를 Guided CWDM으로 확인하세요.'},
  {name:'Resonance Allocation',ids:['2-3R'],goal:'FSR·Q·Thermal Tuning의 단일 Ring 제약을 확인하세요.'},
  {name:'WDM8 Engine',ids:['3W'],goal:'공유 Bus의 8λ·FSR·Crosstalk·Heater Budget을 맞추세요.'},
  {name:'PIC Schematic / Layout',lab:[0,1],goal:'WDM 공유 Bus·Ring 배정과 다이 경계를 확인하세요.'},
  {name:'Routing / Thermal / DRC',lab:[2,3],goal:'실제 배선·Thermal 가정·전기 인터페이스 검사를 확인하세요.'},
  {name:'Verification / Mask Handoff',lab:[4,5],goal:'현재 설계를 검증하고 Circuit Export 및 GDS 재검사 절차를 확인하세요.'}]},
 {id:'lidar-ttd',name:'FMCW LiDAR / TTD',levels:[
  {name:'Delay Spiral',ids:['D-1'],goal:'길이·굽힘 반경·다이 경계와 지연을 맞추세요.'},
  {name:'Switched Delay',ids:['D-2'],goal:'Switched Delay의 지연 범위와 손실을 확인하세요.'},
  {name:'Chirp / Reference',ids:['B-1'],goal:'Chirp와 Reference 경로의 측정 한계를 확인하세요.'},
  {name:'Optical Steering',ids:['B-2'],goal:'Steering의 시야각·각도 분해능을 확인하세요.'},
  {name:'System Budget',ids:['B-3'],goal:'FMCW System Budget과 정확도 가정을 확인하세요.'},
  {name:'Engineering Capstone',summary:true,goal:'검증한 Device / System 결과를 종합하세요. 전체 LiDAR PIC GDS는 미지원입니다.'}]}
];
const KEY='smq3-studio';
let root=SMQ_STORE.get(KEY,null);
if (!root || root.schema!=='smq-studio/1' || !root.by || SMQ_STORE.status().corrupt.some(x=>x.key===KEY)) root={schema:'smq-studio/1',by:{},active:null};
let active=null, ws=null, entering=false, raf=0, dirty=false, inspector='tune';
const track=()=>TRACKS.find(t=>t.id===active), phase=()=>ws && track().levels[ws.level], step=()=>ws && (ws.sub|0);
const scopeKey=()=>SH.plat()+'|'+active;
const historyKey=()=>ws.level+':'+step();
function save(){if(ws){ws.updated=Date.now();ws.id=SH.curId();} return SMQ_STORE.set(KEY,root);}
function newWS(){return {level:0,sub:0,designs:{},lab:{},progress:{stars:{easy:{},std:{},hard:{}},cards:{},best:{},ai:{},missions:{}},tests:{},completed:{},original:{},snapshots:[],mode:'guided'};}
function syncScope(){if(!SH.plat())return;const p=root.by[SH.plat()]||(root.by[SH.plat()]={});ws=p[active]||(p[active]=newWS());SH.setScope(ws);LU.setScope(ws);}
function leave(){if(ws)save();SH.setScope(null);LU.setScope(null);active=null;ws=null;root.active=null;save();}
function enter(id,level){if(!SH.plat() || SH.busy())return;if(!TRACKS.some(t=>t.id===id))return;if(ws)save();active=id;root.active=id;syncScope();if(level!=null){ws.level=level;ws.sub=0;}navigate();}
function navigate(){if(!ws||entering)return;entering=true;closeSheets();const p=phase(),t=track();
 if(p.summary){LU.close();SH.go('B-3');}
 else if(p.ids){const id=p.ids[Math.min(step(),p.ids.length-1)];LU.close();if(!ws.designs[id]){const l=window.GAME_LEV(id);ws.designs[id]=clone(l.start);if(id==='3A+')ws.designs[id].mod=t.mod===1?1:0;}
  SH.go(id);
 }else{if(!ws.lab.d){LU.open();if(t.mod!=null){const st=LU.state();const d=LAB.defaults({pf:SH.pf(),lev:window.GAME_LEV,cards:SH.cards(),des3:SH.design('3A+'),desW:SH.design('3W')},{mod:t.mod,share:0});Object.assign(st.d,d);}}
 LU.open();LU.mission(p.lab[Math.min(step(),p.lab.length-1)]);}
 entering=false;save();refresh();resize();}
// Compact shell and original semantic DOM nodes: existing event handlers and model views are retained.
const nav=document.createElement('nav');nav.id='studioNav';nav.setAttribute('aria-label','Track / Level');nav.innerHTML=`<select id="studioTrack" aria-label="Architecture Track"><option value="legacy">Legacy · 자유 탐색</option>${TRACKS.map(t=>`<option value="${t.id}">${t.name}</option>`).join('')}</select><select id="studioLevel" aria-label="Track-local Level"></select><button class="btn" id="studioStart">Start New…</button><button class="btn" id="studioReplay">Guide</button>`;
$('.top').after(nav);
const goal=document.createElement('section');goal.id='studioGoal';goal.innerHTML='<div><b id="studioTitle"></b><span id="studioGoalLine"></span></div><span id="studioStatus" role="status"></span><button class="btn pri" id="studioNext">Next</button>';
nav.after(goal);
const bar=document.createElement('nav');bar.id='studioActions';bar.setAttribute('aria-label','Context actions');bar.innerHTML='<button class="btn" data-sheet="tune">Tune</button><button class="btn" data-sheet="inspect">Inspect</button><button class="btn pri" id="studioTest">Test</button><button class="btn" data-sheet="more">More</button>';
$('#gamewrap').after(bar);
const theme=document.createElement('button');theme.id='themeToggle';theme.className='btn';$('.hdr-r').append(theme);
const shellUI=SH.ui();
function setTheme(v){document.documentElement.dataset.theme=v;theme.textContent=v==='dark'?'Light':'Dark';theme.setAttribute('aria-label',`Theme · ${v} · 전환`);shellUI.theme=v;SH.saveUI();window.SMQ_PALETTE?.refresh();if(SH.plat())SH.redraw();LU.redraw();}
function sheet(id,title){const a=document.createElement('aside');a.id='studio'+id[0].toUpperCase()+id.slice(1);a.className='studio-sheet';a.dataset.sheet=id;a.setAttribute('aria-label',title);a.innerHTML=`<div class="sheet-heading"><b>${title}</b><button class="btn" data-close-sheet aria-label="패널 닫기">×</button></div>`;$('#gamewrap').append(a);return a;}
const tune=sheet('tune','Parameters · Inspector'),inspect=sheet('inspect','Inspect · Results'),more=sheet('more','Tracks · Reference · Advanced');
const move=(el,to)=>{if(el)to.append(el);};
move($('#pcol'),tune);move($('.lab-head'),tune);move($('#lab-insp'),tune);
['#mission','#coach','#delta','#tiles','#spec','#xpanel','#cmpcard','#fab','#lab-out'].forEach(s=>move($(s),inspect));
['.mapwrap','#pathbar','#ai','#db','#cards','#scope'].forEach(s=>move($(s),more));
const metrics=document.createElement('div');metrics.id='studioMetrics';$('#cwrap').append(metrics);
const reference=document.createElement('section');reference.id='studioReference';reference.className='card';more.prepend(reference);
const controls=document.createElement('section');controls.className='card';controls.innerHTML='<h2>Workspace</h2><div class="row-btns"><button class="btn" id="studioNew">Start New…</button><button class="btn" id="studioSnapshot">Snapshot</button><button class="btn" id="studioRestoreSnapshot">Restore Snapshot</button><button class="btn" id="studioCopy">Copy Legacy Design…</button><button class="btn" id="studioPlatform">Platform 선택</button><button class="btn" id="studioBackup">Text Backup / Restore</button><button class="btn" id="studioGuide">Guided / Replay</button><button class="btn" id="studioFree">Free Exploration</button></div><p class="note">Start New는 현재 Track을 Revision에 보관합니다. 기존 Level·Platform 기록은 유지됩니다.</p><div id="studioSummary"></div>';more.prepend(controls);
move($('#lab-lib'),more);
const scrim=document.createElement('div');scrim.id='studioScrim';scrim.addEventListener('click',closeSheets);$('#gamewrap').append(scrim);
const banner=document.createElement('div');banner.id='studioBanner';banner.hidden=true;goal.after(banner);
function tell(msg){banner.textContent=msg;banner.hidden=false;setTimeout(()=>banner.hidden=true,6000);}
const mobile=()=>window.innerWidth<=900;
function closeSheets(){document.querySelectorAll('.studio-sheet').forEach(e=>e.classList.remove('open'));scrim.classList.remove('open');bar.querySelectorAll('[data-sheet]').forEach(b=>b.setAttribute('aria-pressed','false'));}
function openSheet(id){closeSheets();inspector=id;const e=document.querySelector(`.studio-sheet[data-sheet="${id}"]`);e.classList.add('open');scrim.classList.toggle('open',mobile());bar.querySelector(`[data-sheet="${id}"]`)?.setAttribute('aria-pressed','true');if(mobile()){e.tabIndex=-1;e.focus({preventScroll:true});}resize();}
bar.addEventListener('click',e=>{const b=e.target.closest('[data-sheet]');if(b){const was=document.querySelector(`.studio-sheet[data-sheet="${b.dataset.sheet}"]`).classList.contains('open');if(was&&mobile())closeSheets();else openSheet(b.dataset.sheet);}});
document.addEventListener('click',e=>{if(e.target.closest('[data-close-sheet]'))closeSheets();});document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSheets();});
function identity(){if(LU.isOpen()){const a=LU.state();return JSON.stringify([SH.plat(),a.C?.hash,a.C?.mod,a.C&&a.C.d,a.CHK?.sig]);}return SH.testIdentity();}
function liveGate(){const p=phase();if(p?.summary)return [0,1,2,3,4].every(i=>ws.completed[i]);if(LU.isOpen()){const st=LU.state(),i=p?.lab?.[step()]??(st.s.cur|0);return !!st.s.live?.[LU.MISS[i].id] && (track()?.mod==null || st.C.d.mod===track().mod);}const c=window.GAME_CTX();return SH.currentGate() && !(c?.id==='3A+' && track()?.mod!=null && +c.d.mod!==(track().mod===1?1:0));}
function fresh(){const a=ws?.tests?.[historyKey()];return !!a && a.identity===identity() && liveGate();}
function runTest(){if(LU.isOpen()){const b=document.querySelector('[data-la="run"]');if(b)b.click();else {LU.mission(4);document.querySelector('[data-la="run"]')?.click();LU.mission(phase()?.lab?.[step()]??4);}}
 else if(!SH.testNow())return;
 if(ws){ws.tests=ws.tests||{};ws.tests[historyKey()]={identity:identity(),ok:liveGate(),at:Date.now()};save();}
 refresh();if(!liveGate())openSheet('inspect');}
$('#studioTest').addEventListener('click',runTest);
function advance(){if(!ws||!fresh())return;const p=phase(),c=window.GAME_CTX();
 if(!LU.isOpen()&&c?.step){$('#step-next')?.click();refresh();return;}
 const n=(p.ids||p.lab||[0]).length;
 ws.completed=ws.completed||{};ws.records=ws.records||{};ws.records[historyKey()]={identity:identity(),at:Date.now(),id:SH.curId(),lab:LU.isOpen(),metrics:LU.isOpen()?{hash:LU.state().C.hash,verification:Object.fromEntries(['PASS','WARNING','FAIL','NOT VERIFIED'].map(x=>[x,LU.state().CHK.checks.filter(c=>c.status===x).length]))}:clone(c?.K.tiles(c.l,c.res)||[])};
 if(step()+1<n){ws.sub=step()+1;navigate();return;}
 ws.completed[ws.level]=Date.now();if(ws.level<5){ws.level++;ws.sub=0;navigate();}else{if(Object.keys(ws.completed).length===6)ws.finished=Date.now();save();summary();openSheet('more');refresh();}}
$('#studioNext').addEventListener('click',advance);
$('#studioTrack').addEventListener('change',e=>{if(e.target.value==='legacy'){leave();LU.close();SH.go(SH.curId());refresh();}else enter(e.target.value);});
$('#studioLevel').addEventListener('change',e=>{if(ws){ws.level=+e.target.value;ws.sub=0;navigate();}else SH.go(e.target.value);});
function highlight(){const c=window.GAME_CTX();if(LU.isOpen()){const p=$('#lab-params input');if(p){p.classList.add('studio-target');p.scrollIntoView?.({block:'center'});}return;}
 const hint=$('#coach').textContent;const p=c?.params?.find(p=>hint.includes(text(p.label)))||c?.params?.[0];if(!p)return;const el=$('#p-'+p.k);el?.closest('.prm')?.classList.add('studio-target');el?.scrollIntoView?.({block:'center'});}
bar.querySelector('[data-sheet=tune]').addEventListener('click',()=>setTimeout(highlight,0));
function snapshot(label){if(!ws)return;ws.snapshots=ws.snapshots||[];ws.snapshots.push({at:Date.now(),label,designs:clone(ws.designs),lab:clone(ws.lab),level:ws.level,sub:ws.sub});ws.snapshots=ws.snapshots.slice(-12);save();}
function restart(){if(!ws){tell('먼저 Track을 선택하세요.');return;}if(!confirm('현재 Track을 Revision에 보관하고 Level 1에서 새로 시작할까요?'))return;snapshot('Before Start New');const old=ws.snapshots;root.by[SH.plat()][active]=newWS();root.by[SH.plat()][active].snapshots=old;syncScope();navigate();}
$('#studioStart').onclick=restart;$('#studioNew').onclick=restart;
$('#studioSnapshot').onclick=()=>{snapshot('Manual');tell('Snapshot 저장 완료');};
$('#studioRestoreSnapshot').onclick=()=>{const sn=ws?.snapshots?.at(-1);if(!sn)return tell('저장한 Snapshot이 없습니다.');const s=clone(sn);snapshot('Before Restore');Object.assign(ws,{designs:s.designs,lab:s.lab,level:s.level,sub:s.sub});SH.setScope(ws);LU.setScope(ws);navigate();};
$('#studioCopy').onclick=()=>{if(!ws)return tell('먼저 Track을 선택하세요.');if(!confirm('Legacy 설계를 현재 Track에 복사할까요? 현재 설계는 Snapshot으로 보관합니다.'))return;snapshot('Before Legacy Copy');Object.assign(ws.designs,SH.legacyDesigns());navigate();};
$('#studioPlatform').onclick=()=>$('#plat-chip').click();
$('#studioBackup').onclick=()=>window.GAME_DATA.open('#bk-copy');
function guide(replay){openSheet('inspect');if(LU.isOpen()){LU.mission(phase()?.lab?.[step()]??0);}else {if(replay)document.querySelector('[data-gm="guided"]')?.click();$('#m-guided').hidden?window.GAME_GUIDE?.open():$('#m-guided').scrollIntoView?.({block:'start'});}highlight();}
$('#studioGuide').onclick=()=>guide(true);$('#studioReplay').onclick=()=>guide(false);
$('#studioFree').onclick=()=>{if(ws){ws.mode='free';save();}if(!LU.isOpen())document.querySelector('[data-gm="full"]')?.click();openSheet('tune');tell('Free Exploration · 현재 Design은 유지됩니다. 완료에는 실제 Test가 필요합니다.');};
function renderReference(){const c=window.GAME_CTX();if(LU.isOpen()){reference.innerHTML='<h2>Reference · Lab</h2><p class="note">기존 Lab Library의 Reference / 내 카드 출처를 확인하세요. 실제 배치 수정은 Inspector에서 수행합니다.</p>';return;}if(!c)return;
 let rows=[];try{const r=c.K.evaluate(c.l,clone(c.l.ref),null,{full:true});rows=c.K.tiles(c.l,r)||[];}catch(e){/* unavailable reference shown explicitly */}
 reference.innerHTML=`<h2>Reference / Same-condition Compare</h2><p class="note">${esc(c.id)} · ${esc(c.plat)} · ${esc(c.mode)} · ${c.step?'Full Reference와 Guided 결과는 다른 목표입니다.':'동일 Platform / 난이도 / Physics 모델'}</p><div class="row-btns"><button class="btn" id="studioPreview">Reference Preview</button><button class="btn" id="studioApply">Explicit Apply</button><button class="btn" id="studioSuggest">Suggested Change</button><button class="btn" id="studioOriginal">Restore Original</button></div><div id="studioRefTable" hidden><table><thead><tr><th>Metric</th><th>My Design</th><th>Reference</th></tr></thead><tbody>${rows.map((r,i)=>`<tr><td>${esc(text(r[0]??r.l??r.k??'Metric'))}</td><td>${esc(text((c.K.tiles(c.l,c.res)?.[i]||[])[1]??'—'))}</td><td>${esc(text(r[1]??r.v??'—'))}</td></tr>`).join('')}</tbody></table><p class="note">Analytical / Surrogate · 실제 모델 수치. Fab 비교는 Inspect의 Same-wafer Comparison에서 같은 Seed로 실행하세요.</p></div>`;
 $('#studioSuggest').onclick=()=>{openSheet('inspect');$('#coach').scrollIntoView?.({block:'center'});};
 $('#studioPreview').onclick=()=>$('#studioRefTable').hidden=!$('#studioRefTable').hidden;
 $('#studioApply').onclick=()=>{if(!ws)return tell('보호된 Original을 위해 Track을 먼저 선택하세요.');ws.original=ws.original||{};if(!ws.original[c.id])ws.original[c.id]={d:clone(SH.design(c.id)),guide:clone(ws.progress.guide?.[c.id]||null)};snapshot('Before Reference Apply');const d=clone(c.l.ref);if(c.id==='3A+'&&track().mod===1)d.mod=1;SH.applyDesign(d,true);save();refresh();tell('Reference 적용 완료 · 실제 Test 후에 진행할 수 있습니다.');};
 $('#studioOriginal').onclick=()=>{if(!ws?.original?.[c.id])return tell('보호된 Original이 없습니다.');const o=ws.original[c.id];if(o.d){if(o.guide){ws.progress.guide=ws.progress.guide||{};ws.progress.guide[c.id]=clone(o.guide);}SH.applyDesign(clone(o.d),!o.guide);}else SH.applyDesign(clone(o),true);save();refresh();};
}
function summary(){if(!ws){$('#studioSummary').innerHTML='<p class="note">Legacy의 21개 Level과 6개 Lab Mission을 그대로 사용할 수 있습니다. Track을 선택하면 독립 Workspace에서 시작합니다.</p>';return;}
 const st=LU.isOpen()?LU.state():null;const g=ws.lab?.gds;const gmatch=g&&st?.C&&g.design_hash===st.C.hash;
 $('#studioSummary').innerHTML=`<h2>Final Engineering Summary</h2><p><b>${esc(track().name)}</b> · 완료 기록 ${Object.keys(ws.completed||{}).length}/6 · 현재 Level ${ws.level+1}</p><p>Current Design: ${liveGate()?'VALID':'검토 필요'} · Test: ${fresh()?'CURRENT':'STALE / NOT RUN'}</p><p>Design Valid: ${st?.CHK?st.CHK.checks.some(c=>c.status==='FAIL')?'FAIL':st.s.live.verification?'VALID':'Test 필요':'현재 Lab 검사 미실시'}<br>Geometry Rechecked: ${gmatch&&!g.summary?.FAIL?'PASS':'NOT VERIFIED'}<br>Foundry Readiness: <b>NOT VERIFIED</b></p><p class="note">${track().mod==null?'Device / System 학습과 Component JSON을 지원합니다. 전체 LiDAR PIC GDS 생성은 미지원입니다.':'Circuit JSON은 브라우저에서 Export합니다. 실제 GDS 생성·Geometry Recheck는 동봉된 Python 도구로 실행하며, 결과를 같은 Design Hash에 붙여넣습니다.'}</p><p class="note">Snapshot / Revision ${ws.snapshots?.length||0} · Stars / Cards는 Platform 공유 학습 자산이며 현재 판정과 구분됩니다.</p>`;
}
function refresh(){if(entering)return;const c=window.GAME_CTX(),lab=LU.isOpen();document.body.classList.toggle('studio-lab',lab);$('#pcol').hidden=lab;$('#btn-wipe').hidden=!!ws;$('#lab-insp').hidden=!lab;$('.lab-head').hidden=!lab;$('#lab-out').hidden=!lab;$('#mission').hidden=lab;$('#lab-lib').hidden=!lab;
 ['#coach','#delta','#spec','#xpanel','#cmpcard','#fab'].forEach(s=>{const el=$(s);if(lab)el.dataset.studioHidden=el.hidden?'1':'0';if(lab)el.style.display='none';else el.style.removeProperty('display');});
 bar.querySelector('[data-sheet=tune]').textContent=lab?'Build':'Tune';$('#studioTest').textContent=lab?'Verify':'Test';
 if(ws){$('#studioTrack').value=active;const opts=track().levels.map((p,i)=>`<option value="${i}">Level ${i+1} · ${p.name}</option>`).join('');if($('#studioLevel').innerHTML!==opts)$('#studioLevel').innerHTML=opts;$('#studioLevel').value=ws.level;const p=phase();$('#studioTitle').textContent=`Level ${ws.level+1} · ${p.name}${(p.ids||p.lab||[]).length>1?' · '+(step()+1)+'/'+(p.ids||p.lab).length:''}`;$('#studioGoalLine').textContent=p.goal;$('#studioStatus').textContent=fresh()?'PASS · CURRENT':liveGate()?'Test 필요':'FAIL · 조절 필요';$('#studioNext').disabled=!fresh();}
 else {$('#studioTrack').value='legacy';const opts=SH.levels().map(l=>`<option value="${l.id}">${l.id} · ${l.name}</option>`).join('');if($('#studioLevel').innerHTML!==opts)$('#studioLevel').innerHTML=opts;$('#studioLevel').value=SH.curId();$('#studioTitle').textContent=lab?$('#lab-h').textContent:(c?.lvl.name||'플랫폼 선택');$('#studioGoalLine').textContent=lab?$('#lab-note').textContent.replace(/\s+/g,' ').slice(0,100):$('#m-do .do-h')?.textContent||'폭·길이·Gap을 바꾸고 실제 결과를 확인하세요.';$('#studioStatus').textContent=c?`${c.stars?'★ 획득':'미획득'} · ${SH.currentGate()?'VALID':'검토 필요'}`:'';$('#studioNext').disabled=true;}
 if(!lab&&c){for(const p of c.params){const row=$('#p-'+p.k)?.closest('.prm');if(row&&!row.querySelector('.fine-value')){const n=document.createElement('input');n.type='number';n.className='fine-value';n.dataset.fine=p.k;n.setAttribute('aria-label',p.label+' 정확한 값');n.min=p.min;n.max=p.max;n.step=p.step;n.value=c.d[p.k];row.append(n);}else if(row&&document.activeElement!==row.querySelector('.fine-value'))row.querySelector('.fine-value').value=c.d[p.k];}}
 if(!lab&&c)metrics.innerHTML=(c.K.tiles(c.l,c.res)||[]).slice(0,2).map(r=>`<span>${esc(text(r[0]))} <b>${esc(text(r[1]))}</b></span>`).join('');
 summary();renderReference();
}
function refreshSoon(){if(raf)return;raf=requestAnimationFrame(()=>{raf=0;refresh();});}
function resize(){if(window.visualViewport)document.documentElement.style.setProperty('--app-height',window.visualViewport.height+'px');if(!mobile()&&!document.querySelector('.studio-sheet.open'))openSheet('tune');if(SH.plat())SH.redraw();LU.redraw();}
const wel=document.createElement('div');wel.id='studioWelcome';wel.className='studio-welcome';wel.hidden=true;wel.innerHTML=`<section role="dialog" aria-modal="true" aria-labelledby="studioWelcomeTitle"><h2 id="studioWelcomeTitle">Unified Photonics Studio</h2><p>Track 선택 → Tune / Build → 실제 Test / Verify → Next. 용어와 모델 근거는 Inspect에서 확인하세요.</p><div class="studio-track-choices">${TRACKS.map(t=>`<button class="btn" data-welcome-track="${t.id}">${t.name} · Level 1</button>`).join('')}</div><p>Design Valid · Geometry Rechecked · Foundry Readiness: NOT VERIFIED를 구분합니다. Save에서 Text Backup / Paste Restore가 가능합니다.</p><button class="btn" id="studioWelcomeSkip">Skip · 자유 탐색</button></section>`;document.body.append(wel);
function dismissWelcome(){wel.hidden=true;$('.wrap').inert=false;shellUI.studioWelcomed=1;SH.saveUI();$('#studioTrack').focus();}
function welcome(){wel.hidden=false;$('.wrap').inert=true;wel.querySelector('button').focus();}
wel.addEventListener('click',e=>{const b=e.target.closest('[data-welcome-track]');if(b){dismissWelcome();enter(b.dataset.welcomeTrack);}if(e.target.closest('#studioWelcomeSkip'))dismissWelcome();});wel.addEventListener('keydown',e=>{if(e.key==='Escape')dismissWelcome();if(e.key==='Tab'){const bs=[...wel.querySelectorAll('button')],a=document.activeElement; if(e.shiftKey&&a===bs[0]){e.preventDefault();bs.at(-1).focus();}else if(!e.shiftKey&&a===bs.at(-1)){e.preventDefault();bs[0].focus();}}});
window.SMQ_STUDIO={save,refreshSoon,tracks:TRACKS,enter,active:()=>active,workspace:()=>ws,identity,fresh,liveGate};
theme.onclick=()=>setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');
SH.onLevel(()=>{if(!entering&&active&&SH.plat()&&SH.studioScope()!==ws)syncScope();refreshSoon();});LU.onRender(refreshSoon);
// Legacy navigation is explicit and does not overwrite a Track workspace.
$('#map').addEventListener('click',e=>{if(!e.target.closest('.node'))return;if(active){leave();refreshSoon();}},true);
$('#plat-chip').addEventListener('click',()=>{if(ws)save();});
$('#btn-start').addEventListener('click',()=>{if(!shellUI.studioWelcomed)welcome();if(active){syncScope();navigate();}refreshSoon();});
// Reuse existing explainable deltas/diagnostics; result clicks lead to real controls.
inspect.addEventListener('click',e=>{if(e.target.closest('#objs li.no,#delta li')){openSheet('tune');highlight();}if(e.target.closest('[data-diag]'))openSheet('tune');});
const paste=document.createElement('section');paste.className='card';paste.innerHTML='<h2>GDS Geometry Recheck · Paste</h2><textarea id="studioGdsText" rows="4" aria-label="Python verification JSON 붙여넣기"></textarea><button class="btn" id="studioGdsPaste">Schema / Hash 검사 후 반영</button><p class="note">Python smq2gds가 생성한 engine_verification.json을 붙여넣으세요. 현재 Hash와 다르면 STALE입니다.</p>';more.append(paste);$('#studioGdsPaste').onclick=()=>{if(!LU.isOpen())return tell('Lab에서 실행하세요.');LU.gdsPaste($('#studioGdsText').value);refresh();};
// Device visualization gestures change only the view transform. Parameters remain the editing interface.
const cv=$('#field'),pts=new Map();let view={x:0,y:0,z:1},drag=null;
function paintView(){cv.style.transform=`translate(${view.x}px,${view.y}px) scale(${view.z})`;}
cv.addEventListener('pointerdown',e=>{pts.set(e.pointerId,{x:e.clientX,y:e.clientY});cv.setPointerCapture?.(e.pointerId);const a=[...pts.values()];drag={v:{...view},a:a.map(p=>({...p}))};});
cv.addEventListener('pointermove',e=>{if(!pts.has(e.pointerId)||!drag)return;pts.set(e.pointerId,{x:e.clientX,y:e.clientY});const a=[...pts.values()];if(a.length===2&&drag.a.length===2){const d=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y),d0=Math.hypot(drag.a[0].x-drag.a[1].x,drag.a[0].y-drag.a[1].y);view.z=Math.max(.5,Math.min(6,drag.v.z*d/Math.max(1,d0)));view.x=drag.v.x+(a[0].x+a[1].x-drag.a[0].x-drag.a[1].x)/2;view.y=drag.v.y+(a[0].y+a[1].y-drag.a[0].y-drag.a[1].y)/2;}else if(a.length===1&&drag.a.length===1){view.x=drag.v.x+a[0].x-drag.a[0].x;view.y=drag.v.y+a[0].y-drag.a[0].y;}paintView();});
['pointerup','pointercancel'].forEach(ev=>cv.addEventListener(ev,e=>{pts.delete(e.pointerId);drag=null;}));
const fit=document.createElement('button');fit.className='btn';fit.id='studioFit';fit.textContent='Fit';fit.style.cssText='position:absolute;right:8px;bottom:8px;z-index:2';fit.onclick=()=>{view={x:0,y:0,z:1};paintView();};$('#cwrap').append(fit);
window.addEventListener('resize',resize);window.visualViewport?.addEventListener('resize',resize);window.addEventListener('pagehide',()=>{if(ws)save();});
document.body.classList.add('studio-ready');setTheme(shellUI.theme==='dark'?'dark':'light');
// Resume only a previously selected Track; v1.0 users retain their exact legacy workspace until choosing Copy/Track.
if(root.active&&TRACKS.some(t=>t.id===root.active)&&SH.plat())enter(root.active);else refresh();
if(!mobile())openSheet('tune');resize();
})();
