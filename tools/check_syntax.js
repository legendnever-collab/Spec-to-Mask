// CI: syntax of every JavaScript source and of the assembled single-file script (node --check, no execution)
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process'), os = require('os');
const root = path.join(__dirname, '..'), files = [];
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.js$/.test(e.name)) files.push(p); });
['src', 'test', 'tools'].forEach((d) => walk(path.join(root, d)));
let bad = 0;
for (const f of files) { try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); } catch (e) { bad++; console.log('SYNTAX', path.relative(root, f), String(e.stderr).split('\n').slice(0, 4).join(' ')); } }
const html = fs.readFileSync(path.join(root, 'dist/index.html'), 'utf8'), m = html.match(/<script>([\s\S]*)<\/script>/);
if (!m) { bad++; console.log('dist/index.html: no inline script'); }
else { const tmp = path.join(os.tmpdir(), 'smq_dist_check.js'); fs.writeFileSync(tmp, m[1]); try { execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' }); } catch (e) { bad++; console.log('SYNTAX dist/index.html script', String(e.stderr).split('\n').slice(0, 4).join(' ')); } }
if (/<script[^>]+src=/i.test(html)) { bad++; console.log('dist/index.html loads an external script'); }
console.log(bad ? `syntax check FAILED (${bad})` : `syntax OK: ${files.length} files + dist script, no external scripts`); process.exit(bad ? 1 : 0);
