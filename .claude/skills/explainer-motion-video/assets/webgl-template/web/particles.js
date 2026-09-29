// CPU-side particle choreography: each particle morphs between named formations on the
// timeline's beats; the GPU draws them instanced. Everything is a pure function of the frame.
import { CONFETTI, FPS, H, W, clamp, ease, fonts, hexToRgb, lerp, rnd } from "./util.js";
import { RINGS, SHIELD, pathPoint } from "./layout.js";
import { STRIDE } from "./gl.js";

export const N = 4200;
const COLORS = CONFETTI.map(hexToRgb);
const WEIGHTS = [0.34, 0.2, 0.18, 0.16, 0.12];

const P = Array.from({ length: N }, (_, i) => {
  let r = rnd(i, 1), c = 0;
  while (c < WEIGHTS.length - 1 && r > WEIGHTS[c]) r -= WEIGHTS[c++];
  return {
    col: COLORS[c],
    size: 3.2 + rnd(i, 2) * 5.5,
    shape: rnd(i, 3) < 0.26 ? 1 : 0,
    a: rnd(i, 4),
    b: rnd(i, 5),
    c: rnd(i, 6),
    d: rnd(i, 7),
  };
});

// ---- text-shaped formations, sampled from glyphs rendered offscreen ----
const textCache = {};
function sampleText(key, text, font, cx, cy, step = 7) {
  if (textCache[key]) return textCache[key];
  const cv = new OffscreenCanvas(W, H);
  const ctx = cv.getContext("2d");
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, cx, cy);
  const img = ctx.getImageData(0, 0, W, H).data;
  const pts = [];
  for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) if (img[(y * W + x) * 4 + 3] > 140) pts.push([x, y]);
  return (textCache[key] = pts);
}
const onText = (pts, i, jitter = 3) => {
  const p = pts[(i * 7919) % pts.length];
  return [p[0] + (P[i].a - 0.5) * jitter, p[1] + (P[i].b - 0.5) * jitter];
};

// Each formation returns [x, y, scale, alpha] for particle i at frame f.
const F = {
  float: (i, f) => {
    const p = P[i];
    const y = (((p.b * (H + 200) - f * (0.6 + p.c * 1.4)) % (H + 200)) + H + 200) % (H + 200) - 100;
    return [p.a * W + Math.sin(f * 0.02 + i) * 26, y, 0.8, 0.5];
  },
  floatSoft: (i, f) => {
    const q = F.float(i, f);
    return [q[0], q[1], 0.65, 0.28];
  },
  question: (i, f) => {
    const [x, y] = onText(sampleText("q", "?", `900 820px ${fonts.fun}`, 540, 820), i, 6);
    return [x + Math.sin(f * 0.08 + i) * 2, y + Math.sin(f * 0.1) * 12, 0.9, 1];
  },
  swirl: (i, f) => {
    const p = P[i];
    const r = 120 + p.a * 360;
    const ang = p.b * Math.PI * 2 + f * (0.04 + (1 - p.a) * 0.05);
    return [540 + Math.cos(ang) * r, 820 + Math.sin(ang) * r * 0.9, 0.85, 0.95];
  },
  ai: (i, f) => {
    const [x, y] = onText(sampleText("ai", "AI", `900 640px ${fonts.sans}`, 540, 780, 6), i, 4);
    const k = 1 + Math.sin(f * 0.12) * 0.012;
    return [540 + (x - 540) * k, 780 + (y - 780) * k, 1, 1];
  },
  bars: (i, f) => {
    const cols = 21, c = i % cols, k = Math.floor(i / cols);
    const x = 130 + (c * (W - 260)) / (cols - 1);
    const h = 170 + 300 * (0.5 + 0.5 * Math.sin(f * 0.16 + c * 0.62)) * (0.6 + 0.4 * Math.sin(c * 1.7));
    const y = 1310 - (k % 60) * 10;
    const on = 1310 - y <= h;
    return [x + (P[i].a - 0.5) * 14, on ? y : 1310 - h, on ? 1.05 : 0, on ? 1 : 0];
  },
  hexflow: (i, f) => {
    const p = P[i];
    const u = (p.a + f * (0.0025 + p.c * 0.002)) % 1;
    const [x, y] = pathPoint(u);
    return [x + (p.b - 0.5) * 26, y + (p.d - 0.5) * 26, 0.75, 0.9];
  },
  fountain: (i, f) => {
    const p = P[i];
    const t = (f * (0.011 + p.c * 0.006) + p.a) % 1;
    const vx = (p.b - 0.5) * 900;
    const vy = 1500 + p.d * 700;
    return [540 + vx * t, 1360 - vy * t + 2200 * t * t, 0.9, Math.min(1, (1 - t) * 3)];
  },
  orbit: (i, f) => {
    const p = P[i];
    const ring = i % RINGS.length;
    const dir = ring % 2 ? -1 : 1;
    const ang = p.a * Math.PI * 2 + f * 0.014 * dir * (1 + ring * 0.15);
    const r = RINGS[ring] + (p.b - 0.5) * 18;
    return [SHIELD.x + Math.cos(ang) * r, SHIELD.y + Math.sin(ang) * r, 0.7, 0.85];
  },
  million: (i, f) => {
    const [x, y] = onText(sampleText("m", "100万", `900 330px ${fonts.sans}`, 540, 1060, 6), i, 4);
    return [x, y + Math.sin(f * 0.1 + x * 0.01) * 4, 0.95, 1];
  },
  rain: (i, f) => {
    const p = P[i];
    const y = ((p.b * (H + 300) + f * (4 + p.c * 6)) % (H + 300)) - 150;
    return [p.a * W + Math.sin(f * 0.05 + i) * 40, y, 1.05, 1];
  },
};

// Confetti explosion starting at frame f0: every particle leaves from where formation `from`
// had it, flying away from (cx, cy) with a random spread, slowed by drag and pulled by gravity.
const burst = (from, cx, cy, f0) => (i, f) => {
  const p = P[i];
  const [ox, oy] = from(i, f0);
  const t = Math.max(0, f - f0) / FPS;
  const out = Math.atan2(oy - cy, ox - cx);
  const ang = out + (p.a - 0.5) * 2.2;
  const sp = 700 + p.b * 1700;
  const travel = (sp * (1 - Math.exp(-t * 2.2))) / 2.2;
  return [ox + Math.cos(ang) * travel, oy + Math.sin(ang) * travel + 600 * t * t, 1.1, clamp(1.5 - t * 0.6)];
};

// Keyframes: at frame `at`, morph towards formation `to` over `dur` frames with per-particle stagger.
export function buildKeys(T) {
  const { B, scene } = T;
  const k = (at, to, dur = 30, stagger = 14, e = ease.inOut) => ({ at, to, dur, stagger, e });
  return [
    k(0, F.float, 1, 0),
    k(B.q - 8, F.question, 32, 16, ease.outQuint),
    k(scene(2).from, F.swirl, 30, 18),
    k(B.drop, burst(F.swirl, 540, 820, B.drop), 1, 0),
    k(B.drop + 12, F.ai, 26, 12, ease.outQuint),
    k(scene(3).from, F.bars, 34, 18, ease.outQuint),
    k(scene(4).from, F.hexflow, 34, 16),
    k(scene(5).from, F.floatSoft, 30, 16),
    k(B.skills, F.fountain, 20, 16, ease.out),
    k(scene(6).from, F.orbit, 34, 16, ease.outQuint),
    k(B.compare, F.floatSoft, 26, 12),
    k(scene(7).from, F.floatSoft, 20, 10),
    k(B.users + 6, F.million, 44, 24, ease.outQuint),
    k(B.million + 10, burst(F.million, 540, 1060, B.million + 10), 1, 0),
    k(B.million + 34, F.rain, 30, 20, ease.out),
    k(scene(8).from, F.floatSoft, 30, 14),
    k(B.title, F.rain, 10, 30, ease.out),
  ];
}

const buf = new Float32Array(N * STRIDE);

export function computeParticles(keys, f) {
  let ki = 0;
  while (ki + 1 < keys.length && keys[ki + 1].at <= f) ki++;
  const cur = keys[ki];
  const prev = keys[Math.max(0, ki - 1)];
  for (let i = 0; i < N; i++) {
    const p = P[i];
    const t = clamp((f - cur.at - p.c * cur.stagger) / cur.dur);
    const b = cur.to(i, f);
    let x = b[0], y = b[1], s = b[2], a = b[3];
    if (t < 1 && ki > 0) {
      const q = prev.to(i, f);
      const e = cur.e(t);
      x = lerp(q[0], x, e);
      y = lerp(q[1], y, e);
      s = lerp(q[2], s, e);
      a = lerp(q[3], a, e);
    }
    const o = i * STRIDE;
    buf[o] = x;
    buf[o + 1] = y;
    buf[o + 2] = p.size * s;
    buf[o + 3] = p.d * 6.28 + f * (p.shape ? 0.08 + p.a * 0.1 : 0);
    buf[o + 4] = p.col[0];
    buf[o + 5] = p.col[1];
    buf[o + 6] = p.col[2];
    buf[o + 7] = a;
    buf[o + 8] = p.shape;
  }
  return buf;
}
