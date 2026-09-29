import React from "react";
import { Audio, Sequence, staticFile, AbsoluteFill, Easing, interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { fonts, preloadFonts } from "./fonts";

const { sans, mono } = fonts;
preloadFonts(["切分TOKENIZE慢放1000倍t=0123456789.s每一块，对应一个编号用一个字，形容秋天。"]);

const C = { bg: "#070b12", glow: "#0f2a33", fg: "#e6f4f3", dim: "rgba(230,244,243,0.45)", faint: "rgba(230,244,243,0.18)", accent: "#5ee6e0" };
const ease = { out: Easing.bezier(0.16, 1, 0.3, 1) };
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const X = 72;

const Stars: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      {Array.from({ length: 140 }).map((_, i) => {
        const x = random(`x${i}`) * 1080, y = random(`y${i}`) * 1920;
        const s = 1 + random(`s${i}`) * 2.5, o = 0.15 + random(`o${i}`) * 0.5;
        return <div key={i} style={{ position: "absolute", left: x, top: y - f * (0.2 + s * 0.15), width: s, height: s, borderRadius: s, background: C.fg, opacity: o }} />;
      })}
    </AbsoluteFill>
  );
};

const Grain: React.FC = () => {
  const f = useCurrentFrame();
  const n = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='240' height='240' filter='url(%23n)'/%3E%3C/svg%3E")`;
  return <AbsoluteFill style={{ backgroundImage: n, backgroundPosition: `${(f * 37) % 240}px ${(f * 53) % 240}px`, opacity: 0.06, mixBlendMode: "overlay" }} />;
};

const Hud: React.FC<{ n: string; zh: string; en: string; t: number; seg: number; segs: number; segP: number }> = ({ n, zh, en, t, seg, segs, segP }) => (
  <>
    <div style={{ position: "absolute", left: X, right: X, top: 150, display: "flex", gap: 10 }}>
      {Array.from({ length: segs }).map((_, i) => (
        <div key={i} style={{ flex: 1, height: 3, background: C.faint, position: "relative" }}>
          <div style={{ position: "absolute", inset: 0, transformOrigin: "left", transform: `scaleX(${i < seg ? 1 : i === seg ? segP : 0})`, background: C.accent, boxShadow: i === seg ? `0 0 12px ${C.accent}` : undefined }} />
        </div>
      ))}
    </div>
    <div style={{ position: "absolute", left: X, top: 190, display: "flex", alignItems: "baseline", gap: 14 }}>
      <span style={{ fontFamily: mono, color: C.accent, fontSize: 26, fontWeight: 700 }}>{n}</span>
      <span style={{ fontFamily: sans, color: C.fg, fontSize: 30, fontWeight: 700 }}>{zh}</span>
      <span style={{ fontFamily: mono, color: C.dim, fontSize: 18, letterSpacing: "0.22em" }}>{en}</span>
    </div>
    <div style={{ position: "absolute", right: X, top: 188, textAlign: "right" }}>
      <div style={{ fontFamily: mono, color: C.fg, fontSize: 28, fontVariantNumeric: "tabular-nums" }}><span style={{ color: C.dim }}>t = </span>{t.toFixed(4)} <span style={{ color: C.dim }}>s</span></div>
      <div style={{ fontFamily: sans, color: C.dim, fontSize: 18, marginTop: 4 }}>慢放 1000 倍</div>
    </div>
  </>
);

const tokens = [["用", 44587], ["一个", 48044], ["字", 19112], ["，", 3009], ["形容", 92408], ["秋天", 86743], ["。", 1811]] as const;

export const Demo: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleP = interpolate(f, [6, 18], [0, 1], { ...clamp, easing: ease.out });
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 70% 45% at 45% 55%, ${C.glow}, transparent 70%)` }} />
      <Stars />
      <Hud n="01" zh="切分" en="TOKENIZE" t={0.0034 + f / fps / 1000 * 0.3} seg={0} segs={7} segP={interpolate(f, [0, 120], [0, 1], clamp)} />
      <div style={{ position: "absolute", left: X, top: 360, fontFamily: sans, fontWeight: 700, fontSize: 64, color: C.fg, opacity: titleP, transform: `translateY(${(1 - titleP) * 24}px)`, filter: `blur(${(1 - titleP) * 8}px)` }}>每一块，对应一个编号</div>
      <div style={{ position: "absolute", left: X + 20, top: 560, display: "flex", flexDirection: "column", gap: 34 }}>
        {tokens.map(([w, id], i) => {
          const p = spring({ frame: f - 20 - i * 4, fps, config: { damping: 200 } });
          const roll = interpolate(f, [30 + i * 4, 60 + i * 4], [0, 1], { ...clamp, easing: ease.out });
          const shown = roll < 1 ? Math.floor(random(`r${i}-${Math.floor(f / 2)}`) * 99999) : id;
          const focus = w === "秋天";
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 90, opacity: p, transform: `translateX(${(1 - p) * -40}px)` }}>
              <div style={{ width: 150, height: 72, borderRadius: 10, border: `2px solid ${focus ? C.accent : C.faint}`, color: C.fg, fontFamily: sans, fontSize: 40, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: focus ? `0 0 30px ${C.accent}44` : undefined }}>{w}</div>
              <div style={{ fontFamily: mono, fontSize: 40, color: roll < 1 ? C.dim : focus ? C.accent : C.fg, fontVariantNumeric: "tabular-nums", opacity: interpolate(f, [28 + i * 4, 34 + i * 4], [0, 1], clamp) }}>{String(shown).padStart(5, "0")}</div>
            </div>
          );
        })}
      </div>
      <Audio src={staticFile("audio/bgm.wav")} volume={0.35} />
      <Sequence from={17}><Audio src={staticFile("audio/tick.wav")} volume={0.6} /></Sequence>
      <Grain />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.45) 100%)" }} />
    </AbsoluteFill>
  );
};
