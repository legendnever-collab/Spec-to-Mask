#!/bin/sh
# Exact-version offline executable, tracked-source archive and optional Python GDS handoff.
set -e
cd "$(dirname "$0")/.."
VER=$(node -p "require('./package.json').version")
MM=$(echo "$VER" | cut -d. -f1-2)
OUT=release
mkdir -p "$OUT"
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then echo 'WARNING: source has uncommitted changes; do not call this a frozen release' >&2; fi
SMQ_RELEASE=1 SMQ_OFFLINE=1 sh tools/build.sh "$OUT/spec-to-mask-v$VER.html"
# Ship the exact acceptance-tested bytes after checking them against a fresh source build.
if [ -f "dist/spec-to-mask-v$VER.html" ]; then
  node tools/check_rc.js "$OUT/spec-to-mask-v$VER.html"
  cp "dist/spec-to-mask-v$VER.html" "$OUT/spec-to-mask-v$VER.html"
fi
if grep -Eq 'fonts.googleapis.com|<script[^>]+src=' "$OUT/spec-to-mask-v$VER.html"; then echo 'external runtime dependency in offline release' >&2; exit 1; fi
git archive --format=zip --prefix="spec-to-mask-v$VER/" -o "$OUT/spec-to-mask-v$VER-source.zip" HEAD
for d in RELEASE_NOTES VERIFICATION_REPORT USER_GUIDE MODEL_LIMITATIONS; do cp "docs/release/$d-v$MM.md" "$OUT/"; done
python3 - "$OUT" "$VER" "$MM" <<'PY'
import sys,zipfile,pathlib,subprocess
out,ver,mm=pathlib.Path(sys.argv[1]),sys.argv[2],sys.argv[3]
tracked=subprocess.check_output(['git','ls-files'],text=True).splitlines()
files=[f'spec-to-mask-v{ver}.html']+[f'{d}-v{mm}.md' for d in ['RELEASE_NOTES','VERIFICATION_REPORT','USER_GUIDE','MODEL_LIMITATIONS']]
extra=[p for p in tracked if p.startswith('tools/smq2gds/') or p in ['README.md','docs/HANDOFF_v1.1.0.md','docs/circuit_schema.md','docs/gds_export.md','docs/design_lab.md','docs/TRACKS_V110.md','docs/MIGRATION_V110.md','tools/export_circuit.js']]
with zipfile.ZipFile(out/f'spec-to-mask-v{ver}-HANDOFF.zip','w',zipfile.ZIP_DEFLATED) as z:
 for p in files:z.write(out/p,p)
 for p in extra:z.write(p,p)
print('Handoff files:',len(files)+len(extra))
PY
( cd "$OUT" && sha256sum spec-to-mask-v"$VER"* *.md > SHA256SUMS.txt )
cat "$OUT/SHA256SUMS.txt"
