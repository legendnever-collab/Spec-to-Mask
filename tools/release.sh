#!/bin/sh
# Release artifacts → release/ (not committed):
#   spec-to-mask-v<maj.min>.html          offline single HTML (no external request), stamped with version / commit / commit date
#   spec-to-mask-v<maj.min>-source.zip    git archive of the commit (tracked files only)
#   spec-to-mask-v<maj.min>-HANDOFF.zip   HTML + release docs + Python GDS backend (Advanced workflow) + schema / Lab / GDS docs
#   RELEASE_NOTES / VERIFICATION_REPORT / USER_GUIDE / MODEL_LIMITATIONS (from docs/release/)
#   SHA256SUMS.txt
# The HTML needs nothing installed; Python is only for the optional GDS backend.
set -e
cd "$(dirname "$0")/.."
VER=$(node -p "require('./package.json').version")
MM=$(echo "$VER" | cut -d. -f1-2)
OUT=release; rm -rf "$OUT"; mkdir -p "$OUT"
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then echo "WARNING: uncommitted changes — the stamped commit does not describe this build" >&2; fi
SMQ_RELEASE=1 SMQ_OFFLINE=1 sh tools/build.sh "$OUT/spec-to-mask-v$MM.html"
grep -q 'fonts.googleapis.com' "$OUT/spec-to-mask-v$MM.html" && { echo 'release HTML still requests external fonts' >&2; exit 1; }
git archive --format=zip --prefix="spec-to-mask-v$MM/" -o "$OUT/spec-to-mask-v$MM-source.zip" HEAD
for d in RELEASE_NOTES VERIFICATION_REPORT USER_GUIDE MODEL_LIMITATIONS; do cp "docs/release/$d-v$MM.md" "$OUT/"; done
python3 - "$OUT" "$MM" <<'PY'
import sys, zipfile, pathlib, subprocess
out, mm = pathlib.Path(sys.argv[1]), sys.argv[2]
tracked = set(subprocess.check_output(['git', 'ls-files'], text=True).split())
keep = lambda p: p in tracked and not p.endswith(('.pyc',)) and '__pycache__' not in p
files = [f'spec-to-mask-v{mm}.html', f'RELEASE_NOTES-v{mm}.md', f'VERIFICATION_REPORT-v{mm}.md', f'USER_GUIDE-v{mm}.md', f'MODEL_LIMITATIONS-v{mm}.md']
extra = [p for p in sorted(tracked) if keep(p) and (p.startswith('tools/smq2gds/') or p in ('README.md', 'docs/circuit_schema.md', 'docs/gds_export.md', 'docs/design_lab.md', 'docs/mrr_physics.md', 'docs/arch_1p6t_dr8.md', 'docs/wdm8.md', 'tools/export_circuit.js') or p.startswith('docs/pilot/') or (p.startswith('docs/gds/') and p.endswith(('.gds', '.json', '.png'))))]
with zipfile.ZipFile(out / f'spec-to-mask-v{mm}-HANDOFF.zip', 'w', zipfile.ZIP_DEFLATED) as z:
    for f in files: z.write(out / f, f'spec-to-mask-v{mm}-handoff/{f}')
    for p in extra: z.write(p, f'spec-to-mask-v{mm}-handoff/{p}')
print('handoff files:', len(files) + len(extra))
PY
( cd "$OUT" && sha256sum * > SHA256SUMS.txt && cat SHA256SUMS.txt )
