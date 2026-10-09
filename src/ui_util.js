// ===== shared drawing helpers (browser) =====
const DPR = (typeof window !== 'undefined') ? Math.min(2, window.devicePixelRatio || 1) : 1;
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
  const W = 640, H = o.H || 230, ml = 46, mr = 12, mt = 12, mb = 30;
  const X = (x) => ml + (x - o.x0) / (o.x1 - o.x0) * (W - ml - mr);
  const Y = (y) => mt + (o.y1 - clamp(y, o.y0, o.y1)) / (o.y1 - o.y0) * (H - mt - mb);
  const T = (x, y, t, a, sz) => `<text x="${x}" y="${y}" text-anchor="${a || 'middle'}" font-size="${sz || 11}" font-family="var(--mono)" fill="var(--fg-3)">${t}</text>`;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${o.aria || 'chart'}">`;
  (o.bands || []).forEach(([a, b, fill]) => { s += `<rect x="${X(a)}" y="${mt}" width="${Math.max(1, X(b) - X(a))}" height="${H - mt - mb}" fill="${fill || 'rgba(242,176,74,0.08)'}"/>`; });
  (o.yticks || []).forEach((v) => { s += `<line x1="${ml}" x2="${W - mr}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)"/>` + T(ml - 6, Y(v) + 4, v, 'end'); });
  (o.xticks || []).forEach((v) => { s += T(X(v), H - mb + 18, o.xfmt ? o.xfmt(v) : v); });
  (o.vlines || []).forEach(({ x, color }) => { s += `<line x1="${X(x)}" x2="${X(x)}" y1="${mt}" y2="${H - mb}" stroke="${color || 'rgba(242,176,74,.45)'}" stroke-dasharray="3 3"/>`; });
  (o.hlines || []).forEach(({ y, label, color }) => { s += `<line x1="${ml}" x2="${W - mr}" y1="${Y(y)}" y2="${Y(y)}" stroke="${color || 'var(--fg-3)'}" stroke-dasharray="2 4"/>` + (label ? T(W - mr, Y(y) - 5, label, 'end', 10.5) : ''); });
  if (o.ylab) s += T(ml - 40, mt + 2, o.ylab, 'start', 10.5);
  if (o.xlab) s += T(W - mr, H - 3, o.xlab, 'end', 10.5);
  (o.series || []).forEach((sr) => {
    const d = sr.pts.map((p, i) => `${i ? 'L' : 'M'}${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join('');
    s += `<path d="${d}" fill="none" stroke="${sr.color}" stroke-width="${sr.width || 2}" ${sr.dash ? `stroke-dasharray="${sr.dash}"` : ''}/>`;
  });
  (o.marks || []).forEach(({ x, y, color }) => { s += `<circle cx="${X(x)}" cy="${Y(y)}" r="4" fill="${color || 'var(--fg)'}"/>`; });
  return s + '</svg>';
}
const legendHTML = (items) => items.map(([c, t]) => `<span><i style="background:${c}"></i>${t}</span>`).join('');
