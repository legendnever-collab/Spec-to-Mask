#!/bin/sh
# assemble the single-file artifact from modular sources
set -e
cd "$(dirname "$0")/.."
python3 tools/build_data.py
OUT=${1:-dist/index.html}
# SMQ_RELEASE=1 stamps the commit and its date (tools/release.sh); a normal build is a 'dev' build so dist/ does not churn.
# SMQ_OFFLINE=1 drops the Google Fonts links: no external request at all (system fonts from the CSS fallbacks).
VER=$(node -p "require('./package.json').version")
if [ "${SMQ_RELEASE:-0}" = 1 ]; then
  BUILD_JS="const SMQ_BUILD = { version: '$VER', channel: 'release', commit: '$(git rev-parse HEAD)', date: '$(git log -1 --format=%cI)', offline: ${SMQ_OFFLINE:-1} === 1 };"
else
  BUILD_JS="const SMQ_BUILD = { version: '$VER', channel: 'dev', commit: null, date: null, offline: ${SMQ_OFFLINE:-1} === 1 };"
fi
{
  python3 - <<'PYHEAD'
from pathlib import Path
head = Path('src/head.html').read_text(encoding='utf-8')
style = '<style>\n' + Path('src/studio.css').read_text(encoding='utf-8') + '\n' + Path('src/v2/workbench.css').read_text(encoding='utf-8') + '\n' + Path('src/v2/font.css').read_text(encoding='utf-8') + '\n' + Path('src/v2/mzm.css').read_text(encoding='utf-8') + '\n' + Path('src/v2/foundations.css').read_text(encoding='utf-8') + '\n</style>\n'
print(head.replace('</head>', style + '</head>', 1))
PYHEAD
  echo '<script>'
  echo "$BUILD_JS"
  echo 'const KINDS = {};'
  for f in src/util.js src/palette.js src/ui_util.js src/v2/schema.js src/persist.js src/engine_mmi.js src/data/tables.js src/platforms.js src/kinds/wg.js src/kinds/dc.js src/kinds/mmi.js src/kinds/ssc.js src/kinds/cwdm.js src/kinds/to.js src/kinds/pn.js src/kinds/mzm.js src/bench/mzm.js src/kinds/mrr.js src/kinds/pd.js src/kinds/els.js src/kinds/xcvr.js src/kinds/wdm.js src/kinds/spiral.js src/kinds/ttd.js src/kinds/chirp.js src/kinds/fpsa.js src/kinds/lidar.js src/lab/engine.js src/data/pspec.js src/levels.js src/shell.js src/guide.js src/lab/ui.js src/learn.js src/bench/mzm_ui.js src/studio.js src/v2/core.js src/v2/mzm.js src/v2/mzm_ui.js src/v2/visual.js src/v2/foundations.js src/v2/foundations_ui.js src/v2/learning.js src/v2/ui.js; do
    sed "/^if (typeof module !== 'undefined')/d" "$f"; echo
  done
  echo '</script>'
  echo '</body></html>'
} > "$OUT"
CHK=$(mktemp --suffix=.js)
sed -n '/<script>/,/<\/script>/p' "$OUT" | sed '1d;$d' > "$CHK"
node --check "$CHK"; rm -f "$CHK" && echo "BUILD OK $(wc -c < "$OUT") bytes -> $OUT"
