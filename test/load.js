// load game sources into a node VM for engine-level tests
const fs = require('fs'), vm = require('vm');
module.exports = function load(files) {
  const ctx = { console, Math, Map, Set, Float64Array, Float32Array, Uint8ClampedArray, JSON, Date, Number, String, Array, Object, Infinity, NaN, isFinite, parseInt, KINDS: {}, module: undefined, GAME_CARDS: {} };
  ctx.global = ctx; vm.createContext(ctx);
  const base = __dirname + '/../src/';
  for (const f of files || ['util.js', 'ui_util.js', 'engine_mmi.js', 'data/tables.js', 'platforms.js', 'kinds/wg.js', 'kinds/dc.js', 'kinds/mmi.js', 'kinds/ssc.js', 'kinds/cwdm.js', 'kinds/to.js', 'kinds/pn.js', 'kinds/mzm.js', 'kinds/pd.js', 'kinds/els.js', 'kinds/xcvr.js', 'kinds/spiral.js', 'kinds/ttd.js', 'data/pspec.js', 'levels.js']) {
    if (!fs.existsSync(base + f)) continue;
    let code = fs.readFileSync(base + f, 'utf8').replace(/if \(typeof module !== 'undefined'\)[^\n]*\n/g, '');
    code = code.replace(/^const (\w+) =/gm, 'var $1 =').replace(/^function\* /gm, 'function* ');
    vm.runInContext(code, ctx, { filename: f });
  }
  return ctx;
};
