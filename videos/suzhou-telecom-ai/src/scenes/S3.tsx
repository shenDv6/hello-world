import React from "react";
import { AbsoluteFill, random, useCurrentFrame } from "remotion";
import { Brain } from "../brain";
import { fonts } from "../fonts";
import { C, W, X, ease, glowText, prog } from "../theme";
import { atChar } from "../timeline";
import { Count, Label, Rise, SceneProps, SceneWrap, TypeOn } from "./common";

const COLS = 16;
const ROWS = 26;

// S3 — compute: we fly through the brain into a floor of racks lighting up, then the number lands.
export const S3: React.FC<SceneProps> = ({ dur, lines, from }) => {
  const f = useCurrentFrame();
  const [l0, l1, l2] = lines;
  const through = prog(f, 0, 24, ease.in);
  const wave = prog(f, l1.from - 6, l1.from + 70, ease.inOut);
  const floorIn = prog(f, 8, 34, ease.out);
  const textOut = 1 - prog(f, l2.from - 6, l2.from + 4, ease.in);
  const numAt = l2.from + 2;
  const numLand = atChar(l2, "运算");
  const land = f >= numLand ? Math.max(0, 1 - (f - numLand) / 20) : 0;

  return (
    <SceneWrap dur={dur} enter={false}>
      <AbsoluteFill>
        {through < 1 && <Brain frame={from + f} morph={1} scale={1 + through * 3.2} opacity={1 - through} />}

        {/* rack floor */}
        <div
          style={{
            position: "absolute",
            left: 0,
            width: W,
            top: 640,
            height: 640,
            perspective: 900,
            opacity: floorIn,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 40,
              right: 40,
              top: 0,
              bottom: 0,
              transform: `rotateX(58deg) translateY(${(1 - floorIn) * 200 - f * 0.6}px)`,
              transformOrigin: "50% 100%",
              display: "grid",
              gridTemplateColumns: `repeat(${COLS}, 1fr)`,
              gap: "10px 8px",
            }}
          >
            {Array.from({ length: COLS * ROWS }).map((_, k) => {
              const col = k % COLS;
              const row = Math.floor(k / COLS);
              const fromFront = (ROWS - 1 - row) / (ROWS - 1);
              const off = Math.abs(col - (COLS - 1) / 2) / COLS;
              const lit = wave > fromFront * 0.75 + off * 0.25;
              const flick = 0.55 + 0.45 * Math.sin((from + f) * (0.2 + random(`rf${k}`) * 0.5) + k);
              const hot = random(`rh${k}`) > 0.86;
              return (
                <div
                  key={k}
                  style={{
                    height: 18,
                    borderRadius: 2,
                    border: `1px solid ${lit ? C.accent : C.faint}`,
                    background: lit ? (hot ? C.accentSoft : C.accent) : "transparent",
                    opacity: lit ? 0.35 + 0.65 * flick : 0.5,
                    boxShadow: lit && hot ? `0 0 14px ${C.accent}` : undefined,
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* location + name */}
        <div style={{ opacity: textOut }}>
          <Rise at={l0.from} style={{ left: X, top: 330 }}>
            <Label>
              <TypeOn text="31.16°N  120.64°E  ·  TAIHU LAKE" at={l0.from} perChar={1} />
            </Label>
          </Rise>
          <Rise at={atChar(l0, "太湖")} style={{ left: X, top: 380 }}>
            <div style={{ fontFamily: fonts.serif, fontWeight: 700, fontSize: 96, color: C.fg }}>
              太湖之滨<span style={{ color: C.dim }}> · </span>吴江
            </div>
          </Rise>
          <Rise at={atChar(l1, "长三角")} style={{ left: X, top: 560 }}>
            <div style={{ fontFamily: fonts.sans, fontWeight: 700, fontSize: 60, color: C.fg }}>长三角算力调度中心</div>
            <Label style={{ marginTop: 14 }}>中国电信承建 · 东数西算 · 长三角枢纽</Label>
          </Rise>
        </div>

        {/* the number */}
        {f >= numAt - 2 && (
          <div style={{ position: "absolute", left: X, right: X, top: 330 }}>
            <Label style={{ opacity: prog(f, numAt, numAt + 10) }}>EVERY SECOND · 每秒</Label>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 18,
                marginTop: 10,
                opacity: prog(f, numAt, numAt + 6),
                transform: `scale(${1 + land * 0.06})`,
                transformOrigin: "left bottom",
              }}
            >
              <Count
                to={500}
                at={numAt}
                dur={numLand - numAt}
                style={{
                  fontFamily: fonts.sans,
                  fontWeight: 900,
                  fontSize: 260,
                  lineHeight: 1,
                  color: C.fg,
                  textShadow: glowText(C.accent, 24 + land * 50),
                }}
              />
              <span style={{ fontFamily: fonts.sans, fontWeight: 900, fontSize: 92, color: C.accent }}>亿亿次</span>
            </div>
            <Label style={{ marginTop: 20, opacity: prog(f, numLand, numLand + 12), color: C.accentSoft }}>
              总算力 &gt; 5000 PFLOPS
            </Label>
          </div>
        )}
      </AbsoluteFill>
    </SceneWrap>
  );
};
