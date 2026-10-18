const fs=require('fs'),{JSDOM}=require('jsdom');
module.exports=function boot(seed={}){
 const html=fs.readFileSync(process.env.SMQ_HTML||'dist/spec-to-mask-v2.0.0-alpha.2-p2.html','utf8');
 const dom=new JSDOM(html,{runScripts:'outside-only',pretendToBeVisual:true,url:'https://p2.test/?experience=v2'}),w=dom.window,errors=[];
 w.ResizeObserver=class{observe(){}};w.confirm=()=>true;w.scrollTo=()=>{};
 w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:30}):k==='createImageData'?(a,b)=>({data:new Uint8ClampedArray(a*b*4)}):k==='createLinearGradient'||k==='createRadialGradient'?()=>({addColorStop(){}}):t[k]??(()=>{}),set:(t,k,v)=>(t[k]=v,true)});
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
 Object.defineProperty(w.HTMLElement.prototype,'clientWidth',{get(){return 700}});w.URL.createObjectURL=()=> 'blob:qa';w.URL.revokeObjectURL=()=>{};
 Object.entries(seed).forEach(([k,v])=>w.localStorage.setItem(k,typeof v==='string'?v:JSON.stringify(v)));w.addEventListener('error',e=>errors.push(e.message));
 w.eval(html.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/^const (\w+) =/gm,'var $1 ='));
 return {w,$:s=>w.document.querySelector(s),dom,errors};
};
