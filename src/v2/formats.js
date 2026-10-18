// Generic normalized PAM illustration. Not the engineering MZM/BER/FEC solver.
const SMQ_V2_FORMATS = (() => {
 const names=['NRZ / PAM2','PAM4','PAM8'],defaults=()=>({mode:'baud',baud:56,raw:112,bandwidth:45,noise:.01}),signature='conceptual-pam-rc/1';
 function ensure(s){s.formats??={};return s.formats[s.platform]??={...defaults(),revision:0,introduced:false,observed:false,lastOutcome:'none',completion:null};}
 const inputs=a=>({mode:a.mode,baud:a.baud,raw:a.raw,bandwidth:a.bandwidth,noise:a.noise}),identity=(a,p)=>JSON.stringify({platform:p,revision:a.revision,...inputs(a),signature});
 function edit(a,k,v){const b={...inputs(a),[k]:v};if(!SMQ_V2_SCHEMA.formatInputs(b)||JSON.stringify(b)===JSON.stringify(inputs(a)))return false;Object.assign(a,b);a.revision++;return true;}
 function evaluate(a,p){if(!SMQ_V2_SCHEMA.formatWorkspace(a))throw Error('Modulation Format Input을 확인하세요.');let seed=524287;const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;},bits=Array.from({length:2304},()=>rng()>.5?1:0),data=[1,2,3].map((k,index)=>{const levels=2**k,baud=a.mode==='baud'?a.baud:a.raw/k,raw=baud*k,sps=24,dt=1/(baud*sps),alpha=1-Math.exp(-2*Math.PI*a.bandwidth*dt),symbols=Array.from({length:256},(_,i)=>bits.slice(i*k,i*k+k).reduce((x,b)=>2*x+b,0)),wave=[];let y=symbols[0]/(levels-1);for(let j=0;j<symbols.length*sps;j++){const target=symbols[Math.floor(j/sps)]/(levels-1);y+=alpha*(target-y);wave.push({time:j*1000/(baud*sps),ideal:target,filtered:y+a.noise*(rng()*2-1)});}return {name:names[index],bits:k,levels,baud,raw,levelGap:1/(levels-1),nyquist:baud/2,sps,wave};});return {identity:identity(a,p),inputs:inputs(a),data,timeWindow:8000/Math.min(...data.map(z=>z.baud)),conceptual:true,BER:null,FEC:null,externalVerified:false,signature};}
 function finish(a,skip){SMQ_V2_CORE.finish(a,skip?'skipped':a.observed?'observed':'unobserved');a.introduced=true;}
 return {names,defaults,ensure,inputs,identity,edit,evaluate,finish,signature};
})();
