// Presentation-only legacy color adapter. Physics and scientific colormap lookup tables are untouched.
const SMQ_PALETTE = (() => {
 const roles={'#0b1220':'canvas','#0d131c':'bg','#131b26':'panel','#192330':'panel-2','#e7ecf3':'fg','#9eabbd':'fg-2','#8a98ad':'fg-3','#253244':'line','#334459':'line-2','#f2b04a':'amber','#f6c35a':'series-c','#64c9df':'cyan','#5dd193':'pass','#ff6b6b':'fail','#ff8d9c':'rose','#b48cff':'series-d','#fff6da':'fg','#2a1a02':'amber-ink'};
 let values={};
 function refresh(){if(typeof document==='undefined')return;const c=getComputedStyle(document.documentElement);values=Object.fromEntries(Object.values(roles).map(k=>[k,c.getPropertyValue('--'+k).trim()]));}
 function color(v){if(typeof v!=='string')return v;const k=roles[v.toLowerCase()];if(k)return values[k]||v;const m=v.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/i);if(!m)return v;const h='#'+[m[1],m[2],m[3]].map(x=>(+x).toString(16).padStart(2,'0')).join(''),r=roles[h],hex=r&&values[r];if(!hex||!/^#[a-f\d]{6}$/i.test(hex))return v;return `rgba(${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)},${m[4]||1})`;}
 if(typeof CanvasRenderingContext2D!=='undefined')for(const key of ['fillStyle','strokeStyle','shadowColor']){const d=Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype,key);if(d?.set)Object.defineProperty(CanvasRenderingContext2D.prototype,key,{configurable:true,get:d.get,set(v){d.set.call(this,color(v));}});}
 if(typeof window!=='undefined')window.SMQ_PALETTE={refresh};
 return {refresh,color};
})();
function smqColor(v){return typeof SMQ_PALETTE==='undefined'?v:SMQ_PALETTE.color(v);}
