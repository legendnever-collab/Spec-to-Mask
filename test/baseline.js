// Fixed git baselines for the identity checks (test:upgrade, test:mrr, test:dr8, test:wdm).
//   A missing baseline is a FAILURE, not a skip: CI checks out the full history (actions/checkout fetch-depth: 0).
//   Every baseline that is read prints `BASELINE <commit>:<file> blob <id>`, and every identity block prints
//   `IDENTITY <test>: <run>/<expected> checks run against <commit>` — a count that differs from the expected one fails the test.
//   For a copy without history (source ZIP, shallow clone) SMQ_ALLOW_NO_BASELINE=1 turns the failure into a loud
//   "NOT RUN" warning; CI never sets it.
const cp = require('child_process'), path = require('path');
const ROOT = path.join(__dirname, '..');
const REQUIRED = [
  ['5637cd9', 'src/kinds/spiral.js', 'test:upgrade — circular spiral (lay 0) = main before the rectangular spiral'],
  ['f08011b', 'src/data/pspec.json', 'test:mrr — level specs before the microring (Phase A)'],
  ['fa9f16a', 'src/kinds/xcvr.js', 'test:dr8 — MZM path bit-identical to Phase A main'],
  ['fa9f16a', 'src/data/pspec.json', 'test:dr8 — 3A / 3A+ specs before the modulator choice'],
  ['ad7188f', 'src/data/pspec.json', 'test:wdm — level specs before 3W (Phase D main)'],
];
const allow = () => process.env.SMQ_ALLOW_NO_BASELINE === '1';
const sh = (c) => cp.execSync(c, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] }).toString();
function blobOf(commit, file) { try { return sh(`git rev-parse --verify --quiet ${commit}:${file}`).trim() || null; } catch (e) { return null; } }
function need(commit, file) {
  const blob = blobOf(commit, file);
  if (!blob) {
    const msg = `BASELINE MISSING ${commit}:${file} — the identity check needs the git history (CI: actions/checkout fetch-depth: 0; locally: git fetch --unshallow)`;
    if (allow()) { console.log(`  WARN ${msg} — SMQ_ALLOW_NO_BASELINE=1: identity check NOT RUN`); return null; }
    console.error(`  FAIL ${msg}`); process.exit(1);
  }
  console.log(`  BASELINE ${commit}:${file} blob ${blob}`);
  return sh(`git cat-file -p ${blob}`);
}
// counts the identity assertions that actually ran; done() reports and returns false when the count is not the expected one
function identity(test, commit, expected) {
  let n = 0;
  return {
    hit() { n++; },
    done() {
      const tag = n === expected ? 'IDENTITY' : allow() && n === 0 ? 'IDENTITY NOT RUN' : 'IDENTITY INCOMPLETE';
      console.log(`  ${tag} ${test}: ${n}/${expected} checks run against ${commit}`);
      return n === expected || (allow() && n === 0);
    },
  };
}
module.exports = { REQUIRED, need, identity, blobOf };
