import React from "react";
import { AbsoluteFill, random, useCurrentFrame } from "remotion";
import { fonts } from "../fonts";
import { C, W, X, ease, glowText, prog } from "../theme";
import { atChar } from "../timeline";
import { Label, Rise, SceneProps, SceneWrap } from "./common";

// 97 hexes = Jiangsu's national-level 5G factories (2023); 23 of them built by Suzhou Telecom.
const COLS = 9;
const ROWS = 11;
const R = 38;
const HW = Math.sqrt(3) * R;
const GRID_W = COLS * HW + HW / 2;
const OX = (W - GRID_W) / 2 + HW / 2;
const OY = 720;

const CELLS = Array.from({ length: COLS * ROWS }, (_, k) => {
  const row = Math.floor(k / COLS);
  const col = k % COLS;
  return { k, x: OX + col * HW + (row % 2 ? HW / 2 : 0), y: OY + row * R * 1.5 };
}).slice(1, 98); // drop two corner cells → exactly 97

const ORDER = CELLS.map((c) => ({ c, r: random(`hx${c.k}`) }))
  .sort((a, b) => a.r - b.r)
  .slice(0, 23)
  .map((o) => o.c)
  // light them roughly top-to-bottom so the sweep reads as one motion
  .sort((a, b) => a.y - b.y || a.x - b.x);

const hexPath = (cx: number, cy: number, r: number) =>
  Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    return `${i ? "L" : "M"}${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  }).join("") + "Z";

export const S4: React.FC<SceneProps> = ({ dur, lines }) => {
  const f = useCurrentFrame();
  const [l0, l1] = lines;
  const gridIn = prog(f, 0, 20);
  const lightStart = atChar(l0, "苏州电信");
  const lightEnd = atChar(l0, "二十三家") + 6;
  const per = (lightEnd - lightStart) / ORDER.length;
  const litCount = Math.max(0, Math.min(ORDER.length, Math.floor((f - lightStart) / per) + 1));
  const nerve = prog(f, l1.from, l1.from + 40, ease.inOut);
  const countLand = lightStart + per * ORDER.length;
  const land = f >= countLand ? Math.max(0, 1 - (f - countLand) / 18) : 0;

  return (
    <SceneWrap dur={dur}>
      <AbsoluteFill>
        <svg width={W} height={1920} style={{ position: "absolute", inset: 0 }}>
          <defs>
            <filter id="hglow" filterUnits="userSpaceOnUse" x={0} y={0} width={W} height={1920}>
              <feGaussianBlur stdDeviation="6" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {CELLS.map((c, i) => {
            const p = prog(f, i * 0.25, i * 0.25 + 14);
            return (
              <path
                key={c.k}
                d={hexPath(c.x, c.y, (R - 4) * (0.6 + 0.4 * p))}
                fill="none"
                stroke={C.faint}
                strokeWidth={2}
                opacity={gridIn * p}
              />
            );
          })}
          {/* nerves between lit factories */}
          {ORDER.slice(1).map((c, i) => {
            const a = ORDER[i];
            const len = Math.hypot(c.x - a.x, c.y - a.y);
            const drawn = Math.max(0, Math.min(1, nerve * ORDER.length - i));
            const pulse = ((f * 6 + i * 40) % (len + 200)) - 100;
            return (
              <g key={i} opacity={drawn > 0 ? 1 : 0}>
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={a.x + (c.x - a.x) * drawn}
                  y2={a.y + (c.y - a.y) * drawn}
                  stroke={C.accent}
                  strokeWidth={2}
                  strokeOpacity={0.55}
                />
                {drawn >= 1 && pulse > 0 && pulse < len && (
                  <circle
                    cx={a.x + ((c.x - a.x) * pulse) / len}
                    cy={a.y + ((c.y - a.y) * pulse) / len}
                    r={5}
                    fill={C.accentSoft}
                    filter="url(#hglow)"
                  />
                )}
              </g>
            );
          })}
          {ORDER.map((c, i) => {
            if (i >= litCount) return null;
            const t0 = lightStart + i * per;
            const p = prog(f, t0, t0 + 8, ease.out);
            const flash = Math.max(0, 1 - (f - t0) / 12);
            return (
              <path
                key={`l${c.k}`}
                d={hexPath(c.x, c.y, (R - 4) * (0.7 + 0.3 * p))}
                fill={C.accent}
                fillOpacity={0.35 + flash * 0.5}
                stroke={C.accentSoft}
                strokeWidth={2.5}
                filter="url(#hglow)"
              />
            );
          })}
        </svg>

        <Rise at={l0.from} style={{ left: X, top: 330 }}>
          <Label>2023 · 工信部国家级 5G 工厂 · 江苏</Label>
        </Rise>
        <div style={{ position: "absolute", left: X, top: 380, display: "flex", alignItems: "baseline", gap: 20 }}>
          <span
            style={{
              fontFamily: fonts.sans,
              fontWeight: 900,
              fontSize: 220,
              lineHeight: 1,
              color: litCount > 0 ? C.fg : C.faint,
              fontVariantNumeric: "tabular-nums",
              textShadow: litCount > 0 ? glowText(C.accent, 20 + land * 50) : undefined,
              transform: `scale(${1 + land * 0.06})`,
              transformOrigin: "left bottom",
              display: "inline-block",
            }}
          >
            {String(litCount).padStart(2, "0")}
          </span>
          <span style={{ fontFamily: fonts.mono, fontSize: 64, color: C.dim, opacity: prog(f, l0.from, l0.from + 12) }}>/ 97</span>
        </div>
        <Rise at={lightStart} style={{ left: X, top: 620 }}>
          <div style={{ fontFamily: fonts.sans, fontWeight: 700, fontSize: 40, color: C.accentSoft }}>苏州电信承建</div>
        </Rise>
        <Rise at={atChar(l1, "神经")} style={{ left: 0, right: 0, top: 1346, textAlign: "center" }}>
          <Label style={{ color: C.fg, fontSize: 24 }}>EVERY LINE · CONNECTED</Label>
        </Rise>
      </AbsoluteFill>
    </SceneWrap>
  );
};
