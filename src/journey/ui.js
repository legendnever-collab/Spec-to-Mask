// Sequential presentation adapter. Legacy Studio remains a separate workspace.
(() => {
'use strict';
const C=SMQ_JOURNEY_CORE, ST=window.SMQ_STUDIO, SH=window.GAME_SHELL;
const $=s=>document.querySelector(s), esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const root=ST.root();
if(!root.journey)root.journey={schema:'smq-journey/1',active:false,by:{}};
const journey=root.journey;
let running=false,ctx=null,w=null,ls=null,rendering=false,loading=false,last=null,returnFocus=null,pendingEdit=null;
const step=()=>C.steps[ctx?.index], pf=()=>SH.plat(), tutorial=()=>window.SMQ_TUTORIAL;
const save=()=>SMQ_STORE.set('smq3-studio',root);
function state(){return journey.by[pf()]||(journey.by[pf()]=C.createPlatform());}
function ensurePlatform(){if(pf())return;$('.wrap').inert=false;$('[data-lam="1.31"]').click();$('[data-mat="si"]').click();$('#btn-start').click();}
const nav=document.createElement('nav');nav.id='journeyNav';nav.hidden=true;nav.setAttribute('aria-label','Learning journey');
nav.innerHTML='<button class="btn" id="journeySteps">Journey</button><b id="journeyChapter"></b><button class="btn" id="journeyAdvanced">Advanced / Legacy</button>';
$('#studioNav').after(nav);
const resume=document.createElement('button');resume.id='journeyResume';resume.className='btn';resume.textContent='Learning Journey';$('#studioNav').prepend(resume);
const mission=document.createElement('section');mission.id='journeyMission';mission.className='card';mission.hidden=true;$('#studioTune').insertBefore(mission,$('#pcol'));
const live=document.createElement('section');live.id='journeyLive';live.className='card';live.hidden=true;$('#studioInspect').insertBefore(live,$('#tiles'));
const dialog=document.createElement('dialog');dialog.id='journeyDialog';dialog.innerHTML='<div class="journey-dialog-head"><b id="journeyDialogTitle"></b><button class="btn" id="journeyDialogClose">Close · 돌아가기</button></div><div id="journeyDialogBody"></div>';document.body.append(dialog);
function openDialog(title,html){returnFocus=document.activeElement;$('#journeyDialogTitle').textContent=title;$('#journeyDialogBody').innerHTML=html;if(!dialog.open)dialog.showModal();$('#journeyDialogClose').focus();}
$('#journeyDialogClose').onclick=()=>{dialog.close();refresh();};dialog.addEventListener('close',()=>{returnFocus?.isConnected&&returnFocus.focus({preventScroll:true});refresh();});
function menu(){openDialog('Your Photonics Learning Journey',C.chapters.map((title,ch)=>`<section><h3>Chapter ${ch} — ${esc(title)}</h3>${ch===0?C.steps.map((s,i)=>`<button class="btn journey-step" data-jstep="${i}" ${C.canGo(ctx,i)?'':'disabled'} ${ctx.index===i?'aria-current="step"':''}>Step ${s.n} · ${esc(s.title)} · ${w.completed[s.id]?'COMPLETED':ctx.index===i?'CURRENT':'LOCKED'}</button>`).join(''):`<p>PREVIEW ONLY · ${ch===1?(ctx.unlocked===3?'Curriculum entry unlocked. Missions planned for Checkpoint D.':'Complete Tutorial to unlock the curriculum entry.'):'Not implemented in this milestone.'}</p>${ch===1?`<button class="btn" data-jstep="3" ${C.canGo(ctx,3)?'':'disabled'}>View Chapter 1 Preview</button>`:''}`}</section>`).join(''));}
$('#journeySteps').onclick=menu;
dialog.addEventListener('click',e=>{const b=e.target.closest('[data-jstep]');if(b&&C.canGo(ctx,+b.dataset.jstep)){dialog.close();go(+b.dataset.jstep);}if(e.target.closest('#journeyApply'))apply();if(e.target.closest('#journeyOriginal'))restore();});
function leave(){if(!running)return;sync();running=false;journey.active=false;save();document.body.classList.remove('journey-ready','journey-preview');nav.hidden=mission.hidden=live.hidden=true;$('#pcol').hidden=false;$('#studioNext').textContent='Next';$('#studioSolution').disabled=false;$('#field').removeAttribute('aria-label');$('#journeyPrompt')?.remove();$('#pcol').querySelectorAll('.prm').forEach(e=>e.hidden=false);$('#mzmBenchControls').querySelectorAll('label').forEach(e=>e.hidden=false);}
function enter(){if(loading||SH.busy())return;loading=true;try{ensurePlatform();ST.dismissWelcome();if(window.LABUI.isOpen())window.LABUI.close();ctx=state();ctx.unlocked=C.unlocked(ctx);ctx.index=Math.min(ctx.index,ctx.unlocked);journey.active=true;running=true;document.body.classList.add('journey-ready');go(ctx.index);}finally{loading=false;}}
function go(index){if(!running||SH.busy()||!C.navigate(ctx,index))return;w=ctx.tutorial;ls=C.engineLevels(window.GAME_LEV);C.init(w,ls);
 ST.mountJourney({workspace:w,save,leave,refresh,invalidate});
 const x=step();if(x){w.progress.guide=w.progress.guide||{};w.progress.guide[x.level]={mode:'full',done:{},mem:{},cur:0};SH.go(x.level);SH.applyDesign(w.designs[x.level],true);}
 last=C.fingerprint(w,pf());buildMission();refresh();save();$('#studioTune').scrollTop=0;
}
$('#journeyAdvanced').onclick=()=>{if(SH.busy())return;ST.exitJourney();ST.enter('fundamentals');};resume.onclick=enter;$('#journeyWelcome').onclick=enter;
// Detach the old platform scope before the original setup handler can create default designs.
$('#btn-start').addEventListener('click',()=>{if(running&&!loading){SH.setScope(null);window.LABUI.setScope(null);}},true);
$('#btn-start').addEventListener('click',()=>{if(!loading&&journey.active)enter();});
function buildMission(){const x=step();$('#pcol').after($('#mzmBenchControls'));$('#mzmBenchControls').after(mission);document.body.classList.toggle('journey-preview',!x);
 if(!x){mission.innerHTML='<h2>Tutorial Complete!</h2><p>You are ready to build your first 200G MZM optical link.</p><h3>Chapter 1 — Build a 200G MZM Link</h3><p><b>PREVIEW ONLY</b> · Curriculum entry unlocked.</p><p>The eight engineering missions will be implemented in Checkpoint D.</p><button class="btn" id="journeyRevisit">Revisit Tutorial</button>';$('#journeyRevisit').onclick=()=>go(0);return;}
 mission.innerHTML=`<div class="journey-eyebrow">Observe → Verify → Next</div><div id="journeyLesson">${tutorial()?tutorial().lesson(x):'<p>Navigation checkpoint. Playable Tutorial arrives in Checkpoint C.</p>'}</div><div class="row-btns"><button class="btn" id="journeyLearn">Learn Why</button><button class="btn pri" id="journeyVerify">Verify</button></div><p id="journeyGateReason" role="status"></p>`;
 tutorial()?.bind({step:x,workspace:w,refresh,save,observe,showKnowledge:knowledge});
 $('#journeyLearn').onclick=knowledge;$('#journeyVerify').onclick=verify;
}
function sync(){if(!running||!w)return;const now=C.fingerprint(w,pf());if(last&&last!==now){C.touch(w,pf(),last,pendingEdit&&pendingEdit.id===step()?.id?pendingEdit.id+':'+pendingEdit.key:null,pendingEdit?'Tune':'Dependency');pendingEdit=null;last=now;save();}}
function inputsValid(){return SH.inputValid()&&[...document.querySelectorAll('#mzmBenchControls:not([hidden]) input')].every(e=>e.value!==''&&e.validity.valid);}
function compute(){sync();if(!inputsValid())throw Error('입력값을 확인하세요.');return C.calculate(w,ls);}
function observe(kind){if(!running||!step())return;w.observed=w.observed||{};w.observed[step().id]=w.observed[step().id]||{};w.observed[step().id][kind]=C.fingerprint(w,pf());save();refresh();}
function gate(r){return !!step()&&!!tutorial()&&C.current(w,pf(),step().id)&&C.evaluate(w,pf(),step(),r).ok&&tutorial().ready(step(),w,pf(),r);}
function verify(){if(!running||!step()||!tutorial()||SH.busy())return;SH.testNow();try{const r=compute();w.evidence[step().id]=C.evaluate(w,pf(),step(),r);if(!tutorial().ready(step(),w,pf(),r,false))w.evidence[step().id].ok=false;}catch(e){w.evidence[step().id]={ok:false,reason:e.message};}save();refresh();}
function next(){if(!running||!step()||!tutorial()||SH.busy())return;SH.testNow();let r;try{r=compute();}catch{invalidate();return;}if(!gate(r)||!C.complete(ctx,pf(),r)){refresh();return;}go(ctx.index);}
$('#studioNext').addEventListener('click',e=>{if(running){e.preventDefault();e.stopImmediatePropagation();next();}},true);
$('#studioSolution').addEventListener('click',e=>{if(running){e.preventDefault();e.stopImmediatePropagation();solution();}},true);
$('#studioMoreToggle').addEventListener('click',e=>{if(running){e.preventDefault();e.stopImmediatePropagation();menu();}},true);
function knowledge(){openDialog('Common Knowledge · Optional',tutorial()?tutorial().knowledge(step()):'<p>Laser → Modulator → Fiber → PD → Electrical Output.</p>');}
function solutionData(){const d=C.copy(w.designs),bench={...w.mzmBench};if(step()?.id==='0-1')d['2-5'].P=Math.min(ls['2-5'].ref.P+1,KINDS.els.params(ls['2-5']).find(p=>p.k==='P').max);else if(step()?.id==='0-2'){bench.modulation=1;bench.baud=112;}else d['2-3'].L=ls['2-3'].ref.L;return {designs:d,mzmBench:bench,budget:C.copy(w.budget)};}
function solution(){if(!step())return;const ex=solutionData(),r=C.calculate({...w,...ex},ls);openDialog('Solution Preview · '+step().title,`<p>Preview는 현재 설계, 완료 기록, Verify 결과를 바꾸지 않습니다.</p><pre>${esc(JSON.stringify(step().id==='0-1'?{laserPower:ex.designs['2-5'].P}:step().id==='0-2'?{modulation:'PAM4',baud:112,rawGbps:224}:{length:ex.designs['2-3'].L},null,2))}</pre><p>Example calculation: ${r.bench.eye.rawGbps} Gb/s raw. Laser model output ${r.laser.rx.toFixed(2)} dBm.</p><p>Explicit Apply는 예제 값을 실제 설계에 넣고 Original을 보존합니다. Restore Original은 처음 보호한 설계로 돌아갑니다. 두 동작 모두 다시 직접 Tune하고 Verify해야 합니다.</p><button class="btn" id="journeyApply">Explicit Apply</button><button class="btn" id="journeyOriginal" ${w.protectedOriginal?'':'disabled'}>Restore Original</button>`);
 // Read-only preview has no stored side effects. The controls tutorial records the view in memory only.
 tutorial()?.previewOpened(step(),w,C.fingerprint(w,pf()));
}
function replaceDesign(ex,label){const before=C.fingerprint(w,pf());C.snapshot(w,label);Object.assign(w,ex);if(!C.touch(w,pf(),before,null,'Restore')){w.revision++;w.finished=null;}last=C.fingerprint(w,pf());dialog.close();go(ctx.index);}
function apply(){w.protectedOriginal=w.protectedOriginal||C.snapshot(w,'Protected Original');replaceDesign(solutionData(),'Before Explicit Apply');}
function restore(){if(!w.protectedOriginal)return;const o=C.copy(w.protectedOriginal);replaceDesign({designs:o.designs,mzmBench:o.mzmBench,budget:o.budget},'Before Restore Original');}
function edited(e){if(!running||!step())return;const key=e.target.dataset.fine||e.target.dataset.k||e.target.dataset.bench;if(!key)return;
 const now=C.fingerprint(w,pf());pendingEdit=null;if(last!==now){C.touch(w,pf(),last,step().id+':'+key);last=now;save();}refresh();}
// Capture the gesture before the original control handler changes the design, including held ± buttons.
for(const event of ['pointerdown','input','change'])$('#studioTune').addEventListener(event,e=>{if(!running||!step())return;const el=e.target.closest('[data-fine],[data-k],[data-bench]'),key=el&&(el.dataset.fine||el.dataset.k||el.dataset.bench);pendingEdit=step().keys.includes(key)?{id:step().id,key}:null;},true);
$('#studioTune').addEventListener('input',edited);$('#studioTune').addEventListener('change',edited);
function invalidate(){if(!running)return;$('#studioNext').disabled=true;$('#studioStatus').textContent='STALE';live.textContent='STALE · 현재 입력 계산 중';}
function refresh(){if(!running||!w||rendering)return;rendering=true;try{
 sync();nav.hidden=mission.hidden=live.hidden=false;$('#studioWelcome').hidden=true;$('.wrap').inert=false;
 let prompt=$('#journeyPrompt');if(!prompt){prompt=document.createElement('p');prompt.id='journeyPrompt';$('#pcol').before(prompt);}const x=step();prompt.hidden=!x;if(x)prompt.textContent=tutorial()?.content[x.id].action||x.title;$('#journeyChapter').textContent=x?`Chapter 0 — Tutorial · Step ${x.n} of 3`:'Chapter 1 — PREVIEW';
 $('#studioTitle').textContent=x?x.title:'Tutorial Complete!';$('#studioGoalLine').textContent='Your Photonics Learning Journey';$('#studioNext').textContent=x?.id==='0-3'?'Finish Tutorial':'Next';$('#studioNext').disabled=true;$('#studioSolution').disabled=!x;
 document.body.classList.remove('studio-lab');$('#pcol').hidden=!x;$('#studioMetrics').textContent='';
 ['#lab-insp','.lab-head','#lab-out','#lab-lib','#studioLabMetrics','#tiles','#mission'].forEach(q=>{$(q).hidden=true;});
 ['#spec','#xpanel','#delta','#coach','#cmpcard','#fab','#mzmBench','#mzmBenchControls'].forEach(q=>{$(q).hidden=true;});
 // Keep only this step's controls visible. Advanced retains the full original set.
 const c=window.GAME_CTX();if(c&&x){for(const p of c.params){const row=$('#p-'+p.k)?.closest('.prm');if(!row)continue;row.hidden=!x.keys.includes(p.k);row.classList.toggle('studio-target',x.keys.includes(p.k));if(!row.querySelector('.fine-value')){const n=document.createElement('input');Object.assign(n,{type:'number',className:'fine-value',min:p.min,max:p.max,step:p.step,value:c.d[p.k]});n.dataset.fine=p.k;n.setAttribute('aria-label',p.label+' 정확한 값');row.append(n);}}
 if(x.id==='0-2'||x.id==='0-3'){$('#mzmBenchControls').hidden=false;$('#mzmBenchControls').querySelectorAll('[data-bench]').forEach(e=>e.closest('label').hidden=!x.keys.includes(e.dataset.bench));}}
 if(!x){$('#studioStatus').textContent='PREVIEW';live.innerHTML='<b>Tutorial saved ✓</b><p>Chapter 1 entry unlocked · missions are not playable yet.</p>';return;}
 let r;try{r=compute();}catch(e){$('#studioStatus').textContent='입력 확인';live.textContent='STALE · '+e.message;$('#journeyGateReason').textContent='빈 값과 범위를 벗어난 값은 완료할 수 없습니다.';return;}
 const ready=gate(r);$('#studioNext').disabled=!ready;$('#studioStatus').textContent=C.current(w,pf(),x.id)?'PASS':w.evidence[x.id]?'STALE / VERIFY':'VERIFY';$('#studioStatus').dataset.state=ready?'pass':'pending';
 live.innerHTML=tutorial()?tutorial().inspect(x,r,w):`<b>Current model</b><p>${r.bench.eye.rawGbps} Gb/s raw · Laser ${r.laser.rx.toFixed(2)} dBm</p>`;
 $('#journeyGateReason').textContent=ready?'현재 설계 확인 ✓ Next로 진행하세요.':tutorial()?tutorial().reason(x,w,pf(),r):'Playable Tutorial is pending Checkpoint C.';
 tutorial()?.update({step:x,workspace:w,result:r,platform:pf(),observe,refresh,save});
 }finally{rendering=false;}}
// Preserve all original control visibility on leaving the learning workspace.
$('#journeyAdvanced').addEventListener('click',()=>{$('#pcol').querySelectorAll('.prm').forEach(e=>e.hidden=false);$('#mzmBenchControls').querySelectorAll('label').forEach(e=>e.hidden=false);});
window.addEventListener('pagehide',()=>{if(running)save();});
window.SMQ_JOURNEY={enter,go,verify,next,refresh,state:()=>ctx,workspace:()=>w,step,isActive:()=>running,calculate:()=>compute(),ensurePlatform,observe};
const initial=pf()&&journey.by[pf()];
if(initial){$('#journeyWelcome').textContent='Continue Learning';$('#journeyWelcomeCourse').textContent=initial.index===3?'Chapter 1 — PREVIEW':`Chapter 0 — Tutorial · Step ${initial.index+1} of 3`;$('#journeyWelcomeMission').textContent=C.steps[initial.index]?.title||'Tutorial Complete!';}
if(journey.active&&pf())enter();else if(!SH.ui().studioWelcomed||!journey.offered)ST.welcome();
})();
