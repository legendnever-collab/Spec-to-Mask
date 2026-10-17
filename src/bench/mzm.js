// Single-lane observation model. Reuses the legacy loaded CPW without changing its scores.
// Phasors: exp(+jwt); forward propagation exp(-gamma*z). Lengths below are SI.
const MZM_BENCH = (() => {
  const version = 'mzm-bench/2', c0 = 2.998e8, one = [1, 0];
  const fields = [
    {k:'source', label:'Source resistance', unit:'Ω', min:10, max:100, step:1, value:50},
    {k:'vpp', label:'Open-circuit drive', unit:'Vpp', min:.1, max:5, step:.1, value:2.5},
    {k:'ng', label:'Optical group index', unit:'', min:1.5, max:5, step:.01, value:3.9},
    {k:'bias', label:'Differential phase bias', unit:'π rad', min:0, max:2, step:.01, value:.5},
    {k:'probe', label:'Probe frequency', unit:'GHz', min:1, max:120, step:1, value:56},
    {k:'pnMode', label:'PN source', options:['Fixed card / reference','Live workspace PN geometry'], min:0, max:1, step:1, value:0},
    {k:'reverseBias', label:'PN reverse bias · live mode', unit:'V', min:0, max:3, step:.05, value:1.5},
    {k:'baud', label:'Symbol rate', unit:'GBd', min:10, max:112, step:1, value:112},
    {k:'driver', label:'Driver −3 dB bandwidth', unit:'GHz', min:5, max:100, step:1, value:70},
    {k:'modulation', label:'Modulation', options:['NRZ','PAM4'], min:0, max:1, step:1, value:1},
    {k:'seed', label:'Symbol pattern seed', unit:'', min:1, max:65535, step:1, value:1234}
  ];
  const defaults = () => Object.fromEntries(fields.map(f=>[f.k,f.value]));
  function valid(v) { return !!v && fields.every(f=>typeof v[f.k]==='number' && Number.isFinite(v[f.k]) && v[f.k]>=f.min && v[f.k]<=f.max && (f.step!==1 || Number.isInteger(v[f.k]))); }
  // Additive beta.1 migration only; malformed saved values are not silently accepted.
  function migrate(v) { const next={...defaults(),...v};return valid(next)?next:defaults(); }
  function pnAt(l,geometry,vb) {
    const d={...geometry,vb},x=KINDS.pn._x,r=x.analyse(l,d),a=x.optical(l,d,Math.max(0,vb-.01)),b=x.optical(l,d,Math.min(3,vb+.01)),o=x.optical(l,d,vb);
    const slope=Math.abs(b.dn-a.dn)/(Math.min(3,vb+.01)-Math.max(0,vb-.01));
    return {VpiL:l.pf.lam*1e-4/(2*slope),loss:o.alpha+.15,Cp:r.Cp,Rp:r.Rp,fRC:r.fRC,dn:o.dn,alpha:o.alpha,Wd:r.p.Wd};
  }
  // Raw periodic-pattern eye: no FFE, noise, CDR, BER or standards compliance model.
  function dynamicEye(cfg,Hf,vpi,through) {
    const nsym=256,sps=16,n=nsym*sps,levels=cfg.modulation?4:2,rng=mulberry(cfg.seed),symbols=[];
    for(let s=0;s<nsym;s++)symbols.push(Math.floor(rng()*levels));
    const re=new Float64Array(n),im=new Float64Array(n),x=k=>2*k/(levels-1)-1;
    for(let i=0;i<n;i++)re[i]=x(symbols[Math.floor(i/sps)]);
    fftInPlace(re,im,false);
    for(let k=0;k<n;k++) {const f=(k<=n/2?k:k-n)*cfg.baud/nsym,h=Hf(Math.abs(f)),hr=h[0],hi=k>n/2?-h[1]:k===n/2?0:h[1],a=re[k],b=im[k];re[k]=a*hr-b*hi;im[k]=a*hi+b*hr;}
    fftInPlace(re,im,true);
    const volts=Array.from(re),power=v=>through*(1+Math.cos(Math.PI*(cfg.bias+v/vpi)))/2,wave=volts.map(power);
    const ideal=Array.from({length:levels},(_,k)=>power(x(k)*Hf(0)[0]));
    const ascending=ideal.every((v,i)=>!i||v>ideal[i-1]+1e-12),descending=ideal.every((v,i)=>!i||v<ideal[i-1]-1e-12),monotonic=ascending||descending;
    const at=i=>wave[(i%n+n)%n];let best={opening:-Infinity,phase:0,delayUI:0,groups:[]};
    if(monotonic)for(let delay=-8;delay<=8;delay++)for(let ph=0;ph<sps;ph++) {
      const groups=Array.from({length:levels},()=>[]);
      for(let s=0;s<nsym;s++)groups[symbols[s]].push(at((s+delay)*sps+ph));
      if(descending)groups.reverse();
      const bounds=groups.map(g=>({min:Math.min(...g),max:Math.max(...g),mean:g.reduce((a,b)=>a+b,0)/g.length}));
      const opening=Math.min(...bounds.slice(1).map((g,i)=>g.min-bounds[i].max));
      if(opening>best.opening)best={opening,phase:ph,delayUI:delay,groups:bounds};
    }
    if(!monotonic)best={opening:null,phase:8,delayUI:0,groups:[]};
    const traces=[];for(let s=16;s<80;s++){const row=[];for(let k=-sps/2;k<=sps*1.5;k++)row.push(at((s+best.delayUI)*sps+best.phase+k));traces.push(row);}
    return {model:'mzm-eye/1',modulation:cfg.modulation?'PAM4':'NRZ',baud:cfg.baud,rawGbps:cfg.baud*(cfg.modulation?2:1),nsym,sps,seed:cfg.seed,...best,monotonic,ideal,traces,
      voltageMin:Math.min(...volts),voltageMax:Math.max(...volts),powerMin:Math.min(...wave),powerMax:Math.max(...wave),
      method:'256-symbol periodic pattern, 16 samples/UI; best raw vertical gap over 16 phases and ±8 UI delay; no equalizer/noise/CDR',
      frequencyLimitGHz:240};
  }
  const db = v => 20*Math.log10(Math.max(cx.abs(v),1e-12));
  const reflection = (z, ref) => cx.div(cx.sub(z,[ref,0]),cx.add(z,[ref,0]));
  // Mean of exp(a*z) along the electrode; analytic zero-length / velocity-match limit.
  function meanExp(a, L) {
    const z=cx.sc(a,L);
    return cx.abs(z)<1e-5 ? cx.add(one,cx.add(cx.sc(z,.5),cx.sc(cx.mul(z,z),1/6))) : cx.div(cx.sub(cx.exp(z),one),z);
  }
  function twoPort(gamma, zc, L, ref=50) {
    const p=cx.exp(cx.sc(gamma,L)),m=cx.exp(cx.sc(gamma,-L));
    const A=cx.sc(cx.add(p,m),.5),s=cx.sc(cx.sub(p,m),.5),B=cx.mul(zc,s),C=cx.div(s,zc);
    const den=cx.add(cx.sc(A,2),cx.add(cx.sc(B,1/ref),cx.sc(C,ref)));
    return {s11:cx.div(cx.sub(cx.sc(B,1/ref),cx.sc(C,ref)),den),s21:cx.div([2,0],den)};
  }
  function sample(b, f, cfg) {
    const {w,gam,ZL}=b.line(f),L=b.Lm;
    const ge=cx.mul(cx.div(cx.sub([b.RT,0],ZL),cx.add([b.RT,0],ZL)),cx.exp(cx.sc(gam,-2*L)));
    const zin=cx.mul(ZL,cx.div(cx.add(one,ge),cx.sub(one,ge)));
    const input=cx.sc(cx.div(zin,cx.add(zin,[cfg.source,0])),cfg.vpp);
    const vp=cx.div(input,cx.add(one,ge)),ko=w*cfg.ng/c0;
    const forward=meanExp(cx.add(cx.sc(gam,-1),[0,ko]),L);
    const backward=meanExp(cx.add(gam,[0,ko]),L);
    const eo=cx.div(cx.mul(vp,cx.add(forward,cx.mul(ge,backward))),[1,w*b.Rp*b.Cp]);
    // Series pair normalized to active length: Ctotal=eta*C'*L/2; Rtotal=2*R'/(eta*L).
    const rc=[2*b.Rp/(b.eta*L),-2/(w*b.eta*b.Cp*L)];
    const network=twoPort(gam,ZL,L);
    return {f,eo,zin,input,zc:ZL,alphaDbPerCm:gam[0]*20/Math.LN10/100,nRF:gam[1]*c0/w,
      s11:network.s11,s21:network.s21,loadedReflection:reflection(zin,50),rcReflection:reflection(rc,50)};
  }
  function analyse(l,d,cfg=defaults(),pnContext=null) {
    if(!valid(cfg))throw Error('Invalid MZM bench settings');
    let pnSweep=null,pnInput=null,live=null;
    if(cfg.pnMode) {
      const g=pnContext?.geometry;
      if(!g || !KINDS.pn.params(l).filter(p=>p.k!=='vb').every(p=>Number.isFinite(g[p.k])&&g[p.k]>=p.min&&g[p.k]<=p.max))throw Error('Live PN geometry unavailable or invalid');
      pnInput={source:pnContext.source,geometry:{...g,vb:cfg.reverseBias}};live=pnAt(l,g,cfg.reverseBias);
      const zero=KINDS.pn._x.optical(l,g,0).dn;
      pnSweep=Array.from({length:31},(_,i)=>{const vb=i/10,p=pnAt(l,g,vb);return {vb,...p,deltaN:p.dn-zero};});
    }
    const b=live?KINDS.mzm._x.build({...l,pnRef:live},{...d,useCard:0}):KINDS.mzm._x.build(l,d);
    if(live)b.pn.src='Live PN · '+pnContext.source;
    const dc=sample(b,.001,cfg),samples=[];
    for(let f=1;f<=120;f++) { const s=sample(b,f,cfg);s.eoNormalized=cx.div(s.eo,dc.eo);s.eoDb=db(s.eoNormalized);s.s21Db=db(s.s21);samples.push(s); }
    const probe=samples[cfg.probe-1],vpi=b.VpiL/(b.eta*d.L*.1);
    const il=b.loss*b.eta*d.L+.2*(1-b.eta)*d.L+1,through=Math.pow(10,-il/10);
    const transfer=[];
    for(let i=0;i<=100;i++) { const v=(i/100-.5)*cfg.vpp,phase=Math.PI*(cfg.bias+v/vpi);const main=through*(1+Math.cos(phase))/2;transfer.push({v,main,complement:through-main}); }
    const hf=f=>f===0?[cfg.vpp*d.RT/(cfg.source+d.RT)/2,0]:f>240?[0,0]:cx.mul(cx.sc(sample(b,f,cfg).eo,.5),cx.div(one,[1-(f/cfg.driver)**2,Math.SQRT2*f/cfg.driver]));
    const eye=dynamicEye(cfg,hf,vpi,through);
    eye.reverseBiasMin=cfg.reverseBias-Math.max(Math.abs(eye.voltageMin),Math.abs(eye.voltageMax))/2;
    eye.reverseBiasMax=cfg.reverseBias+Math.max(Math.abs(eye.voltageMin),Math.abs(eye.voltageMax))/2;
    eye.biasDomainValid=!cfg.pnMode||(eye.reverseBiasMin>=0&&eye.reverseBiasMax<=3);
    eye.status=!eye.biasDomainValid?'OUTSIDE PN BIAS DOMAIN':!eye.monotonic?'NON-MONOTONIC LEVELS':eye.opening>0?'OPEN · MODEL ONLY':'CLOSED · MODEL ONLY';
    if(!eye.biasDomainValid){eye.opening=null;eye.traces=[];eye.groups=[];}
    let bandwidth=null;
    // First downward -3 dB crossing in the declared 0.001–120 GHz observation range.
    let prev={f:.001,eoDb:0};
    for(const s of samples){if(s.eoDb<=-3){bandwidth=prev.f+(s.f-prev.f)*(-3-prev.eoDb)/(s.eoDb-prev.eoDb);break;}prev=s;}
    return {version,settings:{...cfg},pn:{...b.pn},pnInput,pnSweep,eye,design:{...d},samples,probe,transfer,vpi,il,through,bandwidth,
      dcElectrodeVpp:cx.abs(dc.input),dcEffectiveVpp:cx.abs(dc.eo),
      confidence:'Educational model',referenceChecked:false,
      conventions:{phasor:'exp(+jwt)',referenceOhm:50,referencePlanes:'electrode input / output ends',
        electricalS:'two-port, both reference impedances 50 ohm; independent of actual RT',
        loadedReflection:'input reflection at 50 ohm reference with actual RT',
        rc:'lumped series junction pair for total active length; not electrode S11',
        eo:'mean junction voltage in optical frame / its 0.001 GHz value; not electrical S21',
        transfer:'static equal-arm linear phase model; electrode differential voltage, fixed optical loss',
        pnBias:'live geometry: C/R from existing depletion model; local optical slope from ±0.01 V finite difference (one-sided at 0/3 V); loss at bias. Fixed card mode has no bias dependence',
        eye:'source waveform → 2nd-order Butterworth driver → loaded CPW / junction RC → cosine optical transfer. Linearized PN at bias, constant loss, no large-signal carrier dynamics. Model truncated above 240 GHz; equal series junctions see ±Vdiff/2. Positive gap is not a compliance pass',
        source:'open-circuit Vpp; source resistance separate from 50 ohm S-parameter reference'}};
  }
  return {version,fields,defaults,migrate,valid,analyse,twoPort,meanExp,sample,db,pnAt,dynamicEye};
})();
