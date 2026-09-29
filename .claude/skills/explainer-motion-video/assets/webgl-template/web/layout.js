// Geometry shared by the 2D scenes and the particle formations.
import { W, rnd } from "./util.js";

// Jiangsu's 97 national-level 5G factories (2023) as a hex grid; 23 built by Suzhou Telecom.
export const HEX_R = 36;
const COLS = 9, ROWS = 11;
const HW = Math.sqrt(3) * HEX_R;
const OX = (W - (COLS * HW + HW / 2)) / 2 + HW / 2;
const OY = 700;
export const HEXES = Array.from({ length: COLS * ROWS }, (_, k) => {
  const row = Math.floor(k / COLS), col = k % COLS;
  return { k, x: OX + col * HW + (row % 2 ? HW / 2 : 0), y: OY + row * HEX_R * 1.5 };
}).slice(1, 98);

export const LIT = HEXES.map((h) => ({ h, r: rnd(h.k, 77) }))
  .sort((a, b) => a.r - b.r)
  .slice(0, 23)
  .map((o) => o.h)
  .sort((a, b) => a.y - b.y || a.x - b.x);

// A single path visiting every lit factory, used for the "every line connected" particle stream.
export const LIT_PATH = (() => {
  const pts = LIT.map((h) => [h.x, h.y]);
  const segs = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const len = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    segs.push({ a: pts[i - 1], b: pts[i], len, from: total });
    total += len;
  }
  return { segs, total };
})();

export function pathPoint(u) {
  const d = u * LIT_PATH.total;
  const s = LIT_PATH.segs.find((q) => d <= q.from + q.len) || LIT_PATH.segs[LIT_PATH.segs.length - 1];
  const t = (d - s.from) / s.len;
  return [s.a[0] + (s.b[0] - s.a[0]) * t, s.a[1] + (s.b[1] - s.a[1]) * t];
}

export const SHIELD = { x: 540, y: 860 };
export const RINGS = [150, 210, 270, 330];
