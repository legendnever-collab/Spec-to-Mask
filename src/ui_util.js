// ===== shared drawing helpers (browser) =====
const DPR = (typeof window !== 'undefined') ? Math.min(2, window.devicePixelRatio || 1) : 1;
// Larger type on wide canvases (v1.1 readability): each ctx.font size is scaled once where it is set, so layouts that
// measure text (measureText, pills) follow automatically. Phone-width canvases (< 520 CSS px) keep their layout sizes —
// their labels already fill the width. Reading ctx.font back returns the scaled value.
const CANVAS_TEXT_K = 1.15;
if (typeof CanvasRenderingContext2D !== 'undefined') {
  const fd = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'font');
  if (fd && fd.set && !CanvasRenderingContext2D.prototype.__smqFont) {
    Object.defineProperty(CanvasRenderingContext2D.prototype, 'font', { configurable: true, get: fd.get,
      set(v) { const k = this.canvas && this.canvas.width / DPR >= 520 ? CANVAS_TEXT_K : 1; fd.set.call(this, k === 1 ? v : String(v).replace(/(\d+(?:\.\d+)?)px/, (m, n) => `${(+n * k).toFixed(2)}px`)); } });
    CanvasRenderingContext2D.prototype.__smqFont = true;
  }
}
const f2 = (v, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : '—');
const fmtT = (v) => String(+(+v).toFixed(3));
const FIELD_LUT = (() => {
  const STOPS = [[0, '#0b1220'], [0.16, '#1f1844'], [0.36, '#5d1d6b'], [0.56, '#b83a5e'], [0.76, '#ec7f3b'], [0.9, '#f6c35a'], [1, '#fff6da']];
  const h = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
  const out = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = i / 255; let j = 0; while (j < STOPS.length - 2 && t > STOPS[j + 1][0]) j++;
    const [t0, c0] = STOPS[j], [t1, c1] = STOPS[j + 1], a = (t - t0) / (t1 - t0), A = h(c0), B = h(c1);
    for (let k = 0; k < 3; k++) out[i * 3 + k] = A[k] + (B[k] - A[k]) * a;
  }
  return out;
})();
function cvPill(ctx, txt, X, Y, align, color) {
  ctx.font = `${10.5 * DPR}px "IBM Plex Mono", monospace`; ctx.textBaseline = 'middle';
  const w = ctx.measureText(txt).width + 8 * DPR, h = 15 * DPR, bx = align === 'left' ? X : align === 'center' ? X - w / 2 : X - w;
  ctx.fillStyle = 'rgba(11,18,32,0.8)'; ctx.fillRect(bx, Y - h / 2, w, h);
  ctx.fillStyle = color || 'rgba(231,236,243,0.95)'; ctx.textAlign = 'left'; ctx.fillText(txt, bx + 4 * DPR, Y + 0.5);
}
// generic SVG line chart; series: [{pts:[[x,y]], color, width, dash}], bands: [[x0,x1]], hlines: [{y,label}]
function svgChart(o) {
  const W = 640, H = o.H || 230, ml = 54, mr = 12, mt = 12, mb = 34;
  const X = (x) => ml + (x - o.x0) / (o.x1 - o.x0) * (W - ml - mr);
  const Y = (y) => mt + (o.y1 - clamp(y, o.y0, o.y1)) / (o.y1 - o.y0) * (H - mt - mb);
  const T = (x, y, t, a, sz) => `<text x="${x}" y="${y}" text-anchor="${a || 'middle'}" font-size="${sz || 13}" font-family="var(--mono)" fill="var(--fg-3)">${t}</text>`;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${o.aria || 'chart'}">`;
  (o.bands || []).forEach(([a, b, fill]) => { s += `<rect x="${X(a)}" y="${mt}" width="${Math.max(1, X(b) - X(a))}" height="${H - mt - mb}" fill="${fill || 'rgba(242,176,74,0.08)'}"/>`; });
  (o.yticks || []).forEach((v) => { s += `<line x1="${ml}" x2="${W - mr}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)"/>` + T(ml - 6, Y(v) + 4, v, 'end'); });
  (o.xticks || []).forEach((v) => { s += T(X(v), H - mb + 20, o.xfmt ? o.xfmt(v) : v); });
  (o.vlines || []).forEach(({ x, color }) => { s += `<line x1="${X(x)}" x2="${X(x)}" y1="${mt}" y2="${H - mb}" stroke="${color || 'rgba(242,176,74,.45)'}" stroke-dasharray="3 3"/>`; });
  (o.hlines || []).forEach(({ y, label, color }) => { s += `<line x1="${ml}" x2="${W - mr}" y1="${Y(y)}" y2="${Y(y)}" stroke="${color || 'var(--fg-3)'}" stroke-dasharray="2 4"/>` + (label ? T(W - mr, Y(y) - 5, label, 'end', 12.5) : ''); });
  if (o.ylab) s += T(ml - 48, mt + 2, o.ylab, 'start', 12.5);
  if (o.xlab) s += T(W - mr, H - 3, o.xlab, 'end', 12.5);
  (o.series || []).forEach((sr) => {
    const d = sr.pts.map((p, i) => `${i ? 'L' : 'M'}${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join('');
    s += `<path d="${d}" fill="none" stroke="${sr.color}" stroke-width="${sr.width || 2}" ${sr.dash ? `stroke-dasharray="${sr.dash}"` : ''}/>`;
  });
  (o.marks || []).forEach(({ x, y, color }) => { s += `<circle cx="${X(x)}" cy="${Y(y)}" r="4" fill="${color || 'var(--fg)'}"/>`; });
  if (o.extra) s += o.extra(X, Y, T);   // free-form annotations in data coordinates (brackets, labels)
  return s + '</svg>';
}
const legendHTML = (items) => items.map(([c, t]) => `<span><i style="background:${c}"></i>${t}</span>`).join('');
// accessible modal: focus moves in, Tab stays inside, Esc / backdrop closes, the page behind is inert, focus returns on close
function smqModal(back, opt) {
  opt = opt || {};
  const box = back.querySelector('[role="dialog"]'); let last = null;
  const bg = ['#gamewrap', '.top', 'footer', '#save-warn'];
  function open(focusSel) {
    last = document.activeElement; back.hidden = false; document.body.style.overflow = 'hidden';
    bg.forEach((s) => { const e = document.querySelector(s); if (e) { e.setAttribute('aria-hidden', 'true'); e.inert = true; } });
    const f = (focusSel && back.querySelector(focusSel)) || back.querySelector('[data-close]'); if (f && f.focus) f.focus();
  }
  function close() {
    if (back.hidden) return; back.hidden = true; document.body.style.overflow = '';
    bg.forEach((s) => { const e = document.querySelector(s); if (e) { e.removeAttribute('aria-hidden'); e.inert = false; } });
    if (opt.onClose) opt.onClose();
    if (last && last !== document.body && document.contains(last) && last.focus) last.focus();
  }
  back.addEventListener('click', (e) => { if (e.target === back || e.target.closest('[data-close]')) close(); });
  back.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab') return;
    const f = [...box.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])')].filter((x) => x.offsetParent !== null || x === document.activeElement);
    if (!f.length) return; const first = f[0], lastF = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastF.focus(); } else if (!e.shiftKey && document.activeElement === lastF) { e.preventDefault(); first.focus(); }
  });
  return { open, close, isOpen: () => !back.hidden };
}
// copy text: Clipboard API when allowed, otherwise select a visible textarea so Ctrl/⌘+C works (company browsers often block the API)
function smqCopy(text, ta) {
  const sel = () => { if (ta) { ta.hidden = false; ta.value = text; ta.focus(); ta.select(); } };
  try { if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(() => { sel(); return true; }, () => { sel(); return false; }); } catch (e) { /* no clipboard */ }
  sel(); return Promise.resolve(false);
}
// download text: the hosted viewer's downloads capability, else a blob link; returns { ok, how }
async function smqDownload(name, text, mime) {
  const cap = typeof window !== 'undefined' && window.claude && typeof window.claude.use === 'function' ? await window.claude.use('downloads').catch(() => null) : null;
  if (cap) { try { await cap.save({ filename: name, data: text }); return { ok: true, how: 'viewer' }; } catch (e) { return { ok: false, how: e && e.code === 'declined' ? 'declined' : 'blocked' }; } }
  try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: mime || 'application/json' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); return { ok: true, how: 'blob' }; } catch (e) { return { ok: false, how: 'blocked' }; }
}
// model-confidence vocabulary shared by every panel (v1.0 §7.7). Shape + text, never colour alone; PASS/FAIL keep their own badges.
const CONF = {
  an: ['◆', 'Analytical', '해석식·정의(근사 없이 계산되는 관계)'],
  semi: ['◇', 'Physics-informed Surrogate', '물리 모델·사전계산 테이블로 계산한 근사값'],
  exp: ['●', 'Experimental Reference', '문헌 측정값 — 조건(소자·공정)이 게임 소자와 다를 수 있음'],
  asm: ['△', 'Unverified Assumption', '대표값으로 둔 가정 — 검증하지 않음'],
  nv: ['○', 'NOT VERIFIED', '이 프로그램이 검사하지 않은 항목 (PASS가 아님)']
};
const CONF_SHORT = { an: 'Analytical', semi: 'Surrogate', exp: 'Experimental', asm: 'Assumption', nv: 'NOT VERIFIED' };
const confBadge = (k, short) => { const c = CONF[k] || CONF.asm; return `<button type="button" class="conf conf-${k}" data-conf="${k}" title="${c[1]} — ${c[2]} (누르면 학습 가이드의 모델 한계)" aria-label="모델 근거: ${c[1]}"><span aria-hidden="true">${c[0]}</span> ${short ? CONF_SHORT[k] || c[1] : c[1]}</button>`; };
const confLegend = (keys) => `<div class="conf-legend" role="note" aria-label="모델 신뢰도 범례">${(keys || Object.keys(CONF)).map((k) => `<span><b aria-hidden="true">${CONF[k][0]}</b> ${CONF[k][1]}</span>`).join('')}<span class="conf-hint">PASS/FAIL은 그 모델의 조건을 만족했는지이지, 제조 가능성 검증이 아닙니다.</span></div>`;
// scroll behaviour that honours prefers-reduced-motion
const smqMotion = () => { try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'; } catch (e) { return 'auto'; } };
// ---- paired yield comparison on one simulated wafer (same seed = the same die-by-die process variation for both designs) ----
// Only the dies where the two verdicts differ carry information: aOnly (A passes, B fails) and bOnly. Exact two-sided sign
// (McNemar exact) test on those k = aOnly + bOnly dies. The dies of one wafer are spatially correlated, so p is optimistic —
// it describes evidence strength on this wafer and process model, not a proof that one design is better.
function pairedSign(aOnly, bOnly) {
  const k = aOnly + bOnly; if (!k) return { k: 0, p: 1, dir: 0 };
  let s = 0, c = 1; const m = Math.min(aOnly, bOnly);
  for (let i = 0; i <= m; i++) { s += c; c = c * (k - i) / (i + 1); }
  return { k, p: Math.min(1, 2 * s / Math.pow(2, k)), dir: bOnly > aOnly ? 1 : bOnly < aOnly ? -1 : 0 };
}
const fmtP = (p) => (p >= 0.995 ? '= 1.00' : p >= 0.01 ? '= ' + p.toFixed(2) : p >= 0.001 ? '= ' + p.toFixed(3) : '&lt; 0.001');   // with its relation sign
// one sentence for the paired result; A / B are the display names of the two designs
function pairedText(A, B, aOnly, bOnly, short) {
  const t = pairedSign(aOnly, bOnly), lead = short ? '쌍 비교:' : '같은 시드는 두 설계에 같은 공정 변동을 주는 공정한 쌍 비교이고, 차이는 판정이 갈린 다이에서만 나옵니다.';
  if (!t.k) return `${lead} 이 웨이퍼에서는 두 설계의 판정이 모든 다이에서 같아 수율 차이가 드러나지 않습니다.`;
  const pre = `${lead} 갈린 다이 ${t.k}개(${A}만 양품 ${aOnly} · ${B}만 양품 ${bOnly}), 정확 부호 검정 p ${fmtP(t.p)}`;
  if (t.p >= 0.05) return `${pre} — 방향이 뚜렷하지 않아 이 표본으로 수율 차이를 결론 내릴 수 없습니다.`;
  return `${pre} — 이 웨이퍼·이 공정 모델에서는 ${t.dir > 0 ? B : A} 쪽이 공정 변동에 더 견고하다는 근거입니다.${short ? ' 한 웨이퍼의 공간 상관된 다이라 p는 낙관적입니다(우열의 증명 아님).' : ' 한 웨이퍼의 다이는 공간 상관이 있어 p는 낙관적이므로, 다른 시드에서도 같은 방향인지 확인하세요 (설계 우열의 증명은 아닙니다).'}`;
}
