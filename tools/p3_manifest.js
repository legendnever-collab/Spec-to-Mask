// Deterministic P3.1 build receipt. Source commit is frozen before the artifact commit.
const fs=require('fs'),cp=require('child_process'),crypto=require('crypto'),path=require('path');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const version=require('../package.json').version,root=path.resolve(__dirname,'..');process.chdir(root);
const canonical=`dist/spec-to-mask-v${version}.html`,out='artifacts/v2-p32';
cp.execFileSync(process.execPath,['tools/check_rc.js'],{stdio:'inherit'});
const files=cp.execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(p=>/^(src\/|test\/|tools\/|\.github\/workflows\/|package(?:-lock)?\.json$)/.test(p)).sort();
const sourceCommit=process.env.SMQ_SOURCE_COMMIT||cp.execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const source={schema:'smq-source-manifest/1',sourceCommit,algorithm:'SHA256',files:Object.fromEntries(files.map(p=>[p,hash(fs.readFileSync(p))]))};
fs.mkdirSync(out,{recursive:true});const manifest=JSON.stringify(source,null,2)+'\n';fs.writeFileSync(out+'/source-manifest.json',manifest);
const htmlHash=hash(fs.readFileSync(canonical));if(htmlHash!==hash(fs.readFileSync('dist/index.html')))throw Error('Canonical/index bytes differ');
const verification={schema:'smq-p32-build/1',version,sourceCommit,sourceManifestSHA256:hash(manifest),canonical,htmlSHA256:htmlHash,bytes:fs.statSync(canonical).size,canonicalIndexIdentical:true,modelContract:'p3-lane-contract/1',scope:'P3.1 Stable Rendering + P3.2 Scalar Optical Power / OMA only',externalVerified:false,BER:null,FEC:null,net200G:null,receiverSensitivity:null,opticalLedger:'MODEL: constant-loss / linear-power A-F',endToEndLinkClosure:null};
fs.writeFileSync(out+'/verification.json',JSON.stringify(verification,null,2)+'\n');
fs.writeFileSync(out+'/SHA256SUMS',[[htmlHash,canonical],[htmlHash,'dist/index.html'],[hash(manifest),out+'/source-manifest.json'],[hash(fs.readFileSync(out+'/verification.json')),out+'/verification.json']].map(x=>x.join('  ')).join('\n')+'\n');
console.log('P3.2 source/build receipt',JSON.stringify(verification));
