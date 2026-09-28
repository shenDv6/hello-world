import { Easing, interpolate } from "remotion";

export const FPS = 30;
export const W = 1080;
export const H = 1920;
export const X = 80; // left/right margin

export const C = {
  // Act 1: the old world — a copper line on warm black
  oldBg: "#0c0b0a",
  copper: "#c8956a",
  copperDim: "rgba(200,149,106,0.45)",
  // Act 2+: the awakened network
  bg: "#040914",
  glow: "#0c2a4d",
  accent: "#3aa8ff",
  accentSoft: "#9fd2ff",
  fg: "#eaf3ff",
  dim: "rgba(234,243,255,0.52)",
  faint: "rgba(234,243,255,0.16)",
  ghost: "rgba(234,243,255,0.07)",
};

export const ease = {
  out: Easing.bezier(0.16, 1, 0.3, 1),
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  in: Easing.bezier(0.7, 0, 0.84, 0),
  soft: Easing.bezier(0.33, 1, 0.68, 1),
};

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// 0→1 progress between two frames with an easing curve.
export const prog = (f: number, a: number, b: number, e = ease.out) =>
  interpolate(f, [a, b], [0, 1], { ...clamp, easing: e });

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const mixColor = (c1: string, c2: string, t: number) => {
  const p = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const [a, b] = [p(c1), p(c2)];
  return `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], t))).join(",")})`;
};

export const glowText = (color: string, r = 24) => `0 0 ${r}px ${color}88, 0 0 ${r * 2.5}px ${color}44`;
