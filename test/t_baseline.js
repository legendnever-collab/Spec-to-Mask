// Regression for the release review finding "identity checks skipped silently without git history".
//   1) every required baseline is readable in this checkout (CI uses fetch-depth: 0)
//   2) with the history hidden (GIT_DIR → an empty directory), test:upgrade and test:dr8 FAIL (exit 1, BASELINE MISSING)
//   3) SMQ_ALLOW_NO_BASELINE=1 makes it a loud NOT RUN, never a silent pass
//   4) with history, every identity block reports its full count       node test/t_baseline.js
const cp = require('child_process'), path = require('path'), fs = require('fs'), os = require('os');
const { REQUIRED, blobOf } = require('./baseline.js');
let fail = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fail++; console.log('  FAIL', m); } else console.log('  ok', m); };
const run = (t, env) => { const r = cp.spawnSync(process.execPath, [path.join(__dirname, t)], { env: { ...process.env, ...env }, encoding: 'utf8' }); return { code: r.status, out: (r.stdout || '') + (r.stderr || '') }; };
for (const [c, f] of REQUIRED) ok(!!blobOf(c, f), `baseline ${c}:${f} readable`);
const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'nogit-'));
for (const [t, c, k] of [['t_upgrade.js', '5637cd9', 12], ['t_dr8.js', 'fa9f16a', 12]]) {
  const a = run(t, { GIT_DIR: empty, SMQ_ALLOW_NO_BASELINE: '' });
  ok(a.code === 1 && /BASELINE MISSING/.test(a.out), `${t} without history: exit ${a.code}, "BASELINE MISSING" (not a silent skip)`);
  const b = run(t, { GIT_DIR: empty, SMQ_ALLOW_NO_BASELINE: '1' });
  ok(b.code === 0 && /IDENTITY NOT RUN/.test(b.out) && /NOT RUN\)/.test(b.out), `${t} with SMQ_ALLOW_NO_BASELINE=1: passes only with "IDENTITY NOT RUN" printed`);
  const g = run(t, { SMQ_ALLOW_NO_BASELINE: '' });
  ok(g.code === 0 && new RegExp(`IDENTITY \\S+ [^\\n]*: ${k}/${k} checks run against ${c}`).test(g.out), `${t} with history: ${k}/${k} identity checks run against ${c}`);
}
fs.rmSync(empty, { recursive: true, force: true });
console.log(`${n - fail}/${n} checks passed`); process.exit(fail ? 1 : 0);
