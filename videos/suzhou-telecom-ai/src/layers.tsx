import React from "react";
import { AbsoluteFill, interpolate, random, useCurrentFrame } from "remotion";
import { fonts } from "./fonts";
import { C, FPS, H, W, X, mixColor, prog } from "./theme";
import { BURST, scenes, TOTAL, voLines } from "./timeline";

const { sans, mono } = fonts;

// 1 = copper "old world", 0 = blue network. Flips once, when the line bursts into a brain.
export const useWarmth = () => {
  const f = useCurrentFrame();
  return 1 - prog(f, BURST, BURST + 36);
};

export const Background: React.FC = () => {
  const f = useCurrentFrame();
  const w = useWarmth();
  const bg = mixColor(C.bg, C.oldBg, w);
  const pulse = 0.85 + 0.15 * Math.sin(f / 40);
  return (
    <AbsoluteFill style={{ background: bg }}>
      <AbsoluteFill
        style={{
          opacity: (1 - w) * pulse,
          background: `radial-gradient(ellipse 80% 50% at 50% 46%, ${C.glow}, transparent 70%)`,
        }}
      />
      <AbsoluteFill
        style={{
          opacity: w * 0.6,
          background: `radial-gradient(ellipse 70% 30% at 50% 47%, #2a1c12, transparent 70%)`,
        }}
      />
    </AbsoluteFill>
  );
};

export const Dust: React.FC = () => {
  const f = useCurrentFrame();
  const w = useWarmth();
  const color = mixColor("#bcdcff", "#e0b48c", w);
  return (
    <AbsoluteFill>
      {Array.from({ length: 150 }).map((_, i) => {
        const s = 1 + random(`ds${i}`) * 2.6;
        const speed = 0.15 + s * 0.12;
        const x = (random(`dx${i}`) * W + Math.sin(f / 90 + i) * 12) % W;
        const y = (((random(`dy${i}`) * (H + 200) - f * speed) % (H + 200)) + H + 200) % (H + 200) - 100;
        const o = (0.12 + random(`do${i}`) * 0.45) * (0.7 + 0.3 * Math.sin(f / 23 + i * 1.7));
        return (
          <div
            key={i}
            style={{ position: "absolute", left: x, top: y, width: s, height: s, borderRadius: s, background: color, opacity: o }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

export const Grain: React.FC = () => {
  const f = useCurrentFrame();
  const n = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='240' height='240' filter='url(%23n)'/%3E%3C/svg%3E")`;
  return (
    <AbsoluteFill
      style={{
        backgroundImage: n,
        backgroundPosition: `${(f * 37) % 240}px ${(f * 53) % 240}px`,
        opacity: 0.07,
        mixBlendMode: "overlay",
        pointerEvents: "none",
      }}
    />
  );
};

export const Vignette: React.FC = () => (
  <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.55) 100%)" }} />
);

const CHAPTERS: Record<number, [string, string, string]> = {
  3: ["01", "算力", "COMPUTE"],
  4: ["02", "连接", "CONNECT"],
  5: ["03", "智能体", "AGENT"],
  6: ["04", "安全", "SECURE"],
  7: ["05", "规模", "SCALE"],
};
const hudScenes = scenes.filter((s) => CHAPTERS[s.id]);

export const Hud: React.FC = () => {
  const f = useCurrentFrame();
  if (!hudScenes.length) return null;
  const first = hudScenes[0];
  const last = hudScenes[hudScenes.length - 1];
  const vis = prog(f, first.from, first.from + 20) * (1 - prog(f, last.from + last.dur - 12, last.from + last.dur, undefined));
  if (vis <= 0) return null;
  const cur = hudScenes.find((s) => f >= s.from && f < s.from + s.dur) ?? (f < first.from ? first : last);
  const [n, zh, en] = CHAPTERS[cur.id];
  const local = f - cur.from;
  const labelIn = prog(local, 4, 20);
  return (
    <AbsoluteFill style={{ opacity: vis }}>
      <div style={{ position: "absolute", left: X, right: X, top: 140, display: "flex", gap: 12 }}>
        {hudScenes.map((s, i) => {
          const p = f >= s.from + s.dur ? 1 : f < s.from ? 0 : (f - s.from) / s.dur;
          return (
            <div key={i} style={{ flex: 1, height: 3, background: C.faint, position: "relative" }}>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  transformOrigin: "left",
                  transform: `scaleX(${p})`,
                  background: C.accent,
                  boxShadow: s === cur ? `0 0 14px ${C.accent}` : undefined,
                }}
              />
            </div>
          );
        })}
      </div>
      <div
        style={{
          position: "absolute",
          left: X,
          top: 176,
          display: "flex",
          alignItems: "baseline",
          gap: 16,
          opacity: labelIn,
          transform: `translateY(${(1 - labelIn) * 10}px)`,
        }}
      >
        <span style={{ fontFamily: mono, color: C.accent, fontSize: 28, fontWeight: 700 }}>{n}</span>
        <span style={{ fontFamily: sans, color: C.fg, fontSize: 32, fontWeight: 700 }}>{zh}</span>
        <span style={{ fontFamily: mono, color: C.dim, fontSize: 20, letterSpacing: "0.24em" }}>{en}</span>
      </div>
      <div style={{ position: "absolute", right: X, top: 176, textAlign: "right" }}>
        <div style={{ fontFamily: mono, color: C.fg, fontSize: 22, letterSpacing: "0.22em" }}>SUZHOU TELECOM</div>
        <div style={{ fontFamily: sans, color: C.dim, fontSize: 20, marginTop: 6 }}>AI 转型 · 2026</div>
      </div>
    </AbsoluteFill>
  );
};

export const Subtitles: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const line = voLines.find((l) => t >= l.start - 0.05 && t <= l.start + l.dur + 0.2);
  if (!line) return null;
  const a = Math.round((line.start - 0.05) * FPS);
  const b = Math.round((line.start + line.dur + 0.2) * FPS);
  const o = interpolate(f, [a, a + 4, b - 5, b], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        left: 50,
        right: 50,
        top: 1398,
        textAlign: "center",
        textWrap: "balance",
        fontFamily: sans,
        fontWeight: 500,
        fontSize: line.text.length > 20 ? 40 : 44,
        lineHeight: 1.4,
        color: C.fg,
        opacity: o,
        textShadow: "0 2px 12px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.9)",
      }}
    >
      {line.text.replace(/[，。：、]$/, "")}
    </div>
  );
};

export const totalFrames = TOTAL;
