// Canonical delivery must be the current source build; only immutable build provenance may differ.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert');
const version=require('../package.json').version,canonical=path.join(__dirname,'../dist',`spec-to-mask-v${version}.html`),dev=path.join(__dirname,'../dist/index.html');
const a=fs.readFileSync(process.argv[2]||dev,'utf8'),b=fs.readFileSync(canonical,'utf8');
const normalize=s=>s.replace(/^const SMQ_BUILD = .*;$/m,'const SMQ_BUILD = <provenance>;');
assert(normalize(a)===normalize(b),'Canonical HTML differs from current source build beyond provenance');
assert(b.startsWith('<!DOCTYPE html>')&&/<html lang="ko">/.test(b)&&/<meta charset="UTF-8">/.test(b),'HTML5 / Korean UTF-8 document');
assert(b.includes(`version: '${version}'`),'Canonical version matches package');
assert(!/<script[^>]+src=|fonts\.googleapis\.com|fonts\.gstatic\.com/i.test(b),'No external runtime dependency');
console.log('RC source parity PASS',version,crypto.createHash('sha256').update(b).digest('hex'));
