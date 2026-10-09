#!/bin/sh
# assemble the single-file artifact from modular sources
set -e
cd "$(dirname "$0")/.."
python3 tools/build_data.py
OUT=${1:-dist/index.html}
{
  cat src/head.html
  echo '<script>'
  echo 'const KINDS = {};'
  for f in src/util.js src/ui_util.js src/engine_mmi.js src/data/tables.js src/platforms.js src/kinds/wg.js src/kinds/dc.js src/kinds/mmi.js src/kinds/ssc.js src/kinds/cwdm.js src/kinds/to.js src/kinds/pn.js src/kinds/mzm.js src/kinds/pd.js src/kinds/els.js src/kinds/xcvr.js src/data/pspec.js src/levels.js src/shell.js; do
    sed "/^if (typeof module !== 'undefined')/d" "$f"; echo
  done
  echo '</script>'
} > "$OUT"
CHK=$(mktemp --suffix=.js)
sed -n '/<script>/,/<\/script>/p' "$OUT" | sed '1d;$d' > "$CHK"
node --check "$CHK"; rm -f "$CHK" && echo "BUILD OK $(wc -c < "$OUT") bytes -> $OUT"
