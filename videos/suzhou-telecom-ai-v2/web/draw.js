// Canvas2D drawing helpers: text, pills, cards, highlighter marks, pops, stars.
import { PAL, clamp, ease, fonts } from "./util.js";

export const font = (weight, size, fam = fonts.sans) => `${weight} ${size}px ${fam}`;

// Scale for a playful pop-in that starts at frame `at` (0 before it, overshoots, settles at 1).
export const pop = (f, at, d = 16) => (f < at ? 0 : ease.outBack(clamp((f - at) / d)));
// 1 → 0 over the last `d` frames before `end` (anticipating shrink).
export const popOut = (f, end, d = 8) => 1 - ease.in(clamp((f - (end - d)) / d));

export function group(ctx, x, y, { s = 1, r = 0, a = 1 } = {}, fn) {
  if (s <= 0.001 || a <= 0.001) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(r);
  ctx.scale(s, s);
  ctx.globalAlpha *= clamp(a);
  fn();
  ctx.restore();
}

export function text(ctx, s, x, y, { size = 40, weight = 700, color = PAL.ink, align = "center", fam = fonts.sans, ls = 0 } = {}) {
  ctx.font = font(weight, size, fam);
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.letterSpacing = `${ls}px`;
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
  ctx.letterSpacing = "0px";
}

export function measure(ctx, s, size, weight = 700, fam = fonts.sans, ls = 0) {
  ctx.font = font(weight, size, fam);
  ctx.letterSpacing = `${ls}px`;
  const w = ctx.measureText(s).width;
  ctx.letterSpacing = "0px";
  return w;
}

export function shadow(ctx, on, blur = 34, y = 14, alpha = 0.16) {
  ctx.shadowColor = on ? `rgba(21,32,59,${alpha})` : "transparent";
  ctx.shadowBlur = on ? blur : 0;
  ctx.shadowOffsetY = on ? y : 0;
}

// Rounded rectangle centred on (x, y).
export function box(ctx, x, y, w, h, r, fill, { stroke, lw = 3, sh = false } = {}) {
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - h / 2, w, h, r);
  if (sh) shadow(ctx, true);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  shadow(ctx, false);
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

// Pill with centred label; returns its width.
export function pill(ctx, label, x, y, { size = 32, weight = 700, fill = PAL.white, color = PAL.ink, padX = 30, h, sh = true, stroke, fam } = {}) {
  const w = measure(ctx, label, size, weight, fam) + padX * 2;
  const hh = h || size * 1.9;
  box(ctx, x, y, w, hh, hh / 2, fill, { sh, stroke });
  text(ctx, label, x, y + size * 0.04, { size, weight, color, fam });
  return w;
}

// Highlighter swipe behind text: grows left→right with p.
export function marker(ctx, x, y, w, h, color, p) {
  if (p <= 0) return;
  ctx.save();
  ctx.globalAlpha *= 0.85;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y - h / 2, w * clamp(p), h, h / 2.4);
  ctx.fill();
  ctx.restore();
}

export function star(ctx, x, y, r, color, rot = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.45 : r;
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

// A little burst of stars around (x, y) right after frame `at`.
export function sparkle(ctx, f, at, x, y, radius = 180, colors = [PAL.yellow, PAL.coral, PAL.mint, PAL.blue]) {
  const t = (f - at) / 22;
  if (t < 0 || t > 1) return;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.3;
    const d = radius * ease.out(t);
    const s = 18 * (1 - t) * (i % 2 ? 0.7 : 1);
    star(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, s, colors[i % colors.length], t * 3);
  }
}

// Animated check mark inside a circle; p 0→1.
export function check(ctx, x, y, r, p, color = PAL.mint) {
  const s = ease.outBack(clamp(p * 1.6));
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  const q = clamp((p - 0.35) / 0.65);
  if (q > 0) {
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = r * 0.28;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    const pts = [
      [-r * 0.45, 0],
      [-r * 0.1, r * 0.35],
      [r * 0.5, -r * 0.35],
    ];
    ctx.moveTo(...pts[0]);
    if (q < 0.4) ctx.lineTo(pts[0][0] + (pts[1][0] - pts[0][0]) * (q / 0.4), pts[0][1] + (pts[1][1] - pts[0][1]) * (q / 0.4));
    else {
      ctx.lineTo(...pts[1]);
      const k = (q - 0.4) / 0.6;
      ctx.lineTo(pts[1][0] + (pts[2][0] - pts[1][0]) * k, pts[1][1] + (pts[2][1] - pts[1][1]) * k);
    }
    ctx.stroke();
  }
  ctx.restore();
}

export function hexPath(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    ctx.lineTo(x + r * Math.cos(a), y + r * Math.sin(a));
  }
  ctx.closePath();
}
