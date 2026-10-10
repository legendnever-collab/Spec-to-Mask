// Evidence that every git baseline of the identity checks is readable (run in CI before the engine regression).
//   node tools/check_baselines.js   → one line per baseline (commit:file blob purpose); exit 1 if any is missing.
//   In GitHub Actions the table is also written to the job summary.
const fs = require('fs'), cp = require('child_process'), path = require('path');
const { REQUIRED, blobOf } = require('../test/baseline.js');
const ROOT = path.join(__dirname, '..');
let shallow = '?'; try { shallow = cp.execSync('git rev-parse --is-shallow-repository', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch (e) { /* not a git checkout */ }
let miss = 0; const rows = [];
for (const [c, f, why] of REQUIRED) {
  const b = blobOf(c, f); if (!b) miss++;
  rows.push(`| ${c}:${f} | ${b || '**MISSING**'} | ${why} |`);
  console.log(`${b ? 'BASELINE' : 'BASELINE MISSING'} ${c}:${f} ${b ? 'blob ' + b : ''} — ${why}`);
}
console.log(`shallow repository: ${shallow} · ${REQUIRED.length - miss}/${REQUIRED.length} baselines readable`);
if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Identity baselines (shallow: ${shallow})\n\n| baseline | blob | used by |\n|---|---|---|\n${rows.join('\n')}\n\n`);
}
process.exit(miss ? 1 : 0);
