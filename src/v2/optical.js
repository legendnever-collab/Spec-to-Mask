// P3.2 scalar composition. The existing Bench owns all MZM optical transfer / IL.
const SMQ_V2_OPTICAL = (() => {
  const signature='optical-ledger/1;planes-A-F;settled-equal-probability;constant-loss';
  const defaults=()=>({source:{cwPowerDbm:10},passive:{txInputLossDb:1,txOutputLossDb:1,channelLossDb:3,rxInputLossDb:1,provenance:'Educational constant-loss inputs; not measured'}});
  function dbmToMw(v){if(!Number.isFinite(v))throw Error('dBm은 유한한 값이어야 합니다.');const x=10**(v/10);if(!Number.isFinite(x)||x<=0)throw Error('Power 변환 범위를 벗어났습니다.');return x;}
  function mwToDbm(v){if(!Number.isFinite(v)||v<0)throw Error('mW는 유한한 Nonnegative Power여야 합니다.');return v===0?null:10*Math.log10(v);}
  const power=mW=>({mW,dBm:mwToDbm(mW)});
  function settled(levels,dataValid=true,reason=null){
    if(!Array.isArray(levels)||!levels.length||levels.some(v=>!Number.isFinite(v)||v<0))throw Error('Settled Level Power가 올바르지 않습니다.');
    const diagnosticOuter=power(Math.max(...levels)-Math.min(...levels));
    return {levels_mW:[...levels],averageSettled:power(levels.reduce((a,b)=>a+b,0)/levels.length),omaOuter:dataValid?diagnosticOuter:null,diagnosticOuter,status:dataValid?'MODEL':'NOT VERIFIED',reason};
  }
  function evaluate(tx,source,passive,identity,revision=0){
    if(!SMQ_V2_SCHEMA.opticalPair({source,passive})||!source)throw Error('Optical Source / Loss Input을 확인하세요.');
    const e=tx.bench.eye,planes={},terms=[],cw=dbmToMw(source.cwPowerDbm),factor=v=>10**(-v/10);
    const cwPlane=(id,location,mW)=>({id,location,basis:'CW Optical Power',cw:power(mW),averageSettled:null,omaOuter:null,levels_mW:null,status:'MODEL',reason:null});
    const loss=(owner,from,to,dB)=>{terms.push({owner,from,to,dB,unit:'dB',appliedOnce:true,provenance:passive.provenance});return factor(dB);};
    planes.A=cwPlane('A','CW Laser Output',cw);
    const pin=cw*loss('txInputLossDb','A','B',passive.txInputLossDb);planes.B=cwPlane('B','MZM Optical Input',pin);
    terms.push({owner:'MZM_BENCH.transfer','from':'B',to:'C',dB:tx.bench.il,unit:'dB',includedInTransfer:true,appliedOnce:true,provenance:'Existing MZM Bench through / eye.ideal; no extra IL subtraction'});
    const domain=e.biasDomainValid&&e.ideal.length>0&&e.ideal.every(v=>Number.isFinite(v)&&v>=0&&v<=tx.bench.through+1e-9);
    const reason=!domain?'PN / Optical Power Domain을 벗어났습니다.':!e.monotonic?'Non-monotonic Levels: OMA는 N/A이며 Level Range는 Diagnostic입니다.':null;
    let levels=domain?e.ideal.map(v=>pin*v):null;
    const output=(id,location)=>({id,location,basis:'Equal-probability Settled Symbol Levels',cw:null,...(levels?settled(levels,e.monotonic,reason):{levels_mW:null,averageSettled:null,omaOuter:null,diagnosticOuter:null,status:'NOT VERIFIED',reason})});
    planes.C=output('C','MZM Main Output');
    for(const [id,location,owner,from]of [['D','Tx Output Coupling 뒤','txOutputLossDb','C'],['E','Channel 뒤','channelLossDb','D'],['F','Rx Input Coupling 뒤 / PD Input','rxInputLossDb','E']]){const a=loss(owner,from,id,passive[owner]);if(levels)levels=levels.map(v=>v*a);planes[id]=output(id,location);}
    return {signature,identity,revision,txInputKey:JSON.stringify(SMQ_V2_MZM.canonical({platform:tx.platform,inputs:tx.inputs,signature:tx.modelSignature})),planes,terms,
      rawGap:{value:domain&&e.monotonic?e.opening:null,unit:'P/Pin',basis:'Minimum Adjacent Raw Vertical Gap; not settled OMA'},
      dynamicAverage:null,dynamicOMA:null,receiverSensitivity:null,linkMargin:null,engineering:'NOT EVALUATED',externalVerified:false,
      assumptions:['Constant-loss / Linear-power Ledger','Equal-probability Settled Levels; no Dynamic Average / OMA','Source / Passive inputs are educational assumptions, not measured','No RIN / TPA / Self-heating / Feedback / Dispersion / Rx Noise / FFE / BER / FEC','P2.2 MMI conservation / symmetry and PN / Raw Eye limitations remain']};
  }
  return {signature,defaults,dbmToMw,mwToDbm,power,settled,evaluate};
})();
