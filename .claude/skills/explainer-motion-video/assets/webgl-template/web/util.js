// Shared math, easing, palette and deterministic randomness.

export const W = 1080;
export const H = 1920;
export const FPS = 30;

export const PAL = {
  bg: "#FFF7EC",
  ink: "#15203B",
  inkSoft: "#5B6680",
  blue: "#2F6BFF",
  yellow: "#FFC531",
  coral: "#FF5E57",
  mint: "#1FCF9B",
  violet: "#7B61FF",
  white: "#FFFFFF",
};
export const CONFETTI = [PAL.blue, PAL.yellow, PAL.coral, PAL.mint, PAL.violet];

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;

export const ease = {
  linear: (t) => t,
  out: (t) => 1 - Math.pow(1 - t, 3),
  outQuint: (t) => 1 - Math.pow(1 - t, 5),
  in: (t) => t * t * t,
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  // playful overshoot for pops and bounces
  outBack: (t, s = 1.9) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
  // damped spring settle, ~2 wobbles
  spring: (t) => 1 - Math.exp(-6 * t) * Math.cos(12 * t),
};

// 0→1 between frames a and b, eased.
export const prog = (f, a, b, e = ease.out) => e(clamp((f - a) / Math.max(1e-6, b - a)));

// Deterministic hash → [0,1). Same inputs always give the same value across renders.
export function rnd(i, salt = 0) {
  let t = (i * 374761393 + salt * 668265263) | 0;
  t = Math.imul(t ^ (t >>> 13), 1274126177);
  t = (t ^ (t >>> 16)) >>> 0;
  return t / 4294967296;
}

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export const fonts = {
  sans: "'Noto Sans SC Variable', sans-serif",
  fun: "'ZCOOL KuaiLe', 'Noto Sans SC Variable', sans-serif",
  mono: "'JetBrains Mono Variable', monospace",
};
