// P2.2 diagnostics: result identity belongs to the caller. No legacy kernel changes.
const SMQ_V2_SCIENCE = (() => {
 const names=['TE0','TE1','TE2','TE3','TM0','TM1','TM2'];
 function mode(p,width,name){const tb=P22_FIELDS[p],sample=Object.values(tb.fields).find(s=>Math.abs(s.width-width)<1e-8);if(!sample)return {supported:false,reason:'Unsupported Width · 정확한 Field Sample을 선택하세요.'};const field=sample.modes[name];return {supported:!!field,reason:field?'':'Cutoff / Not Guided',sample,field,provenance:tb};}
 function modeOptions(p,width){const r=SMQ_V2_FOUNDATIONS.mode(p,width),n=WGP[p].nox;return names.map(name=>{const j=Number(name.slice(2)),neff=r[name.startsWith('TE')?'te':'tm'][j],a=mode(p,width,name),guided=neff>n+.003;if(a.sample&&guided!==a.supported)return {name,neff,guided,...a,supported:false,reason:'NOT VERIFIED · Cutoff 부근 Table / Field Solver 판정이 다릅니다.'};return {name,neff,guided,...a};});}
 function color(v,signed){if(signed){const t=Math.min(1,Math.abs(v)),a=v<0?[40,102,214]:[220,65,45];return `rgb(${a.map(c=>Math.round(245+(c-245)*t)).join(',')})`;}const t=Math.sqrt(Math.max(0,Math.min(1,v)));return `rgb(${Math.round(18+230*t)},${Math.round(22+175*t)},${Math.round(50+30*t)})`;}
 // SVG numeric cells keep the data visible offline and avoid any image-generation path.
 function heat(values,nx,ny,x,y,W,H,signed=false){return values.map((v,i)=>`<rect x="${(x+i%nx*W/nx).toFixed(2)}" y="${(y+Math.floor(i/nx)*H/ny).toFixed(2)}" width="${(W/nx+.05).toFixed(2)}" height="${(H/ny+.05).toFixed(2)}" fill="${color(v,signed)}"/>`).join('');}
 return {names,mode,modeOptions,color,heat};
})();
