import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { fonts } from "../fonts";
import { C, ease, glowText, prog } from "../theme";
import type { Line } from "../timeline";

export type SceneProps = { dur: number; lines: Line[]; from: number };

// Every scene enters and leaves on the same Z vector (pushing forward), so cuts read as one
// continuous camera move: exit accelerates towards camera, entry arrives already moving.
export const SceneWrap: React.FC<{ dur: number; children: React.ReactNode; enter?: boolean; exit?: boolean }> = ({
  dur,
  children,
  enter = true,
  exit = true,
}) => {
  const f = useCurrentFrame();
  const inP = enter ? prog(f, 0, 14, ease.out) : 1;
  const outP = exit ? prog(f, dur - 10, dur, ease.in) : 0;
  const scale = (0.9 + 0.1 * inP) * (1 + 0.22 * outP);
  const blur = (1 - inP) * 14 + outP * 18;
  return (
    <AbsoluteFill style={{ opacity: inP * (1 - outP), transform: `scale(${scale})`, filter: blur > 0.2 ? `blur(${blur}px)` : undefined }}>
      {children}
    </AbsoluteFill>
  );
};

// Headline that rises in with a blur clear.
export const Rise: React.FC<{
  at: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
  dist?: number;
  dur?: number;
}> = ({ at, children, style, dist = 30, dur = 14 }) => {
  const f = useCurrentFrame();
  const p = prog(f, at, at + dur);
  return (
    <div
      style={{
        position: "absolute",
        opacity: p,
        transform: `translateY(${(1 - p) * dist}px)`,
        filter: p < 1 ? `blur(${(1 - p) * 10}px)` : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// Heavy word that slams down from oversize with a flash of glow.
export const Slam: React.FC<{ at: number; children: React.ReactNode; style?: React.CSSProperties; color?: string }> = ({
  at,
  children,
  style,
  color = C.accent,
}) => {
  const f = useCurrentFrame();
  const p = prog(f, at, at + 9, ease.in);
  const settle = prog(f, at + 9, at + 30, ease.out);
  const flash = f >= at + 9 ? Math.max(0, 1 - (f - at - 9) / 18) : 0;
  const scale = f < at + 9 ? 1.9 - 0.9 * p : 1 + 0.035 * (1 - settle);
  return (
    <div
      style={{
        position: "absolute",
        opacity: Math.min(1, p * 1.6),
        transform: `scale(${scale})`,
        textShadow: glowText(color, 20 + flash * 40),
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const Label: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ fontFamily: fonts.mono, fontSize: 22, letterSpacing: "0.18em", color: C.dim, ...style }}>{children}</div>
);

// Characters appear one by one (typing), with a blinking caret while typing.
export const TypeOn: React.FC<{ text: string; at: number; perChar?: number; caret?: boolean; style?: React.CSSProperties }> = ({
  text,
  at,
  perChar = 3,
  caret = true,
  style,
}) => {
  const f = useCurrentFrame();
  const n = Math.max(0, Math.min(text.length, Math.floor((f - at) / perChar)));
  const typing = f >= at && n < text.length + 8;
  return (
    <span style={style}>
      {text.slice(0, n)}
      {caret && typing && f % 30 < 18 ? <span style={{ color: C.accent }}>▍</span> : null}
    </span>
  );
};

// Number that rolls up to its target.
export const Count: React.FC<{ to: number; at: number; dur: number; format?: (v: number) => string; style?: React.CSSProperties }> = ({
  to,
  at,
  dur,
  format = (v) => Math.round(v).toLocaleString("en-US"),
  style,
}) => {
  const f = useCurrentFrame();
  const v = to * prog(f, at, at + dur, ease.out);
  return <span style={{ fontVariantNumeric: "tabular-nums", ...style }}>{format(v)}</span>;
};
