import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Brain, LineWave } from "../brain";
import { fonts } from "../fonts";
import { C, X, ease, glowText, prog } from "../theme";
import { atChar } from "../timeline";
import { Rise, SceneProps, SceneWrap, Slam } from "./common";

const LINE_Y = 900;

// S1 — the old world: one copper line and what it used to sell.
export const S1: React.FC<SceneProps> = ({ dur, lines, from }) => {
  const f = useCurrentFrame();
  const [l0, l1] = lines;
  const draw = prog(f, 6, 48, ease.inOut);
  const tags = [
    { t: "SIM 卡", at: atChar(l1, "一张卡") },
    { t: "宽带 100M", at: atChar(l1, "一根网线") },
    { t: "流量 30G / 月", at: atChar(l1, "一个月") },
  ];
  const tremble = prog(f, dur - 24, dur, ease.in) * 7;
  const fadeTags = 1 - prog(f, dur - 14, dur, ease.in);
  return (
    <SceneWrap dur={dur} enter={false} exit={false}>
      <AbsoluteFill>
        <LineWave frame={from + f} draw={draw} vibrate={tremble} lineY={LINE_Y} />
        <Rise at={atChar(l0, "三十年")} style={{ left: X, top: 470 }}>
          <div style={{ fontFamily: fonts.mono, color: C.copper, fontSize: 26, letterSpacing: "0.3em", opacity: fadeTags }}>
            30 YEARS
          </div>
        </Rise>
        <Rise at={atChar(l0, "一根线")} style={{ left: X, top: 560 }}>
          <div style={{ fontFamily: fonts.serif, fontWeight: 700, color: "#f1e2d3", fontSize: 150, letterSpacing: "0.04em", opacity: fadeTags }}>
            一根线
          </div>
        </Rise>
        <div style={{ position: "absolute", left: X, top: LINE_Y + 60, display: "flex", gap: 22, opacity: fadeTags }}>
          {tags.map((tg, i) => {
            const p = prog(f, tg.at, tg.at + 12);
            return (
              <div
                key={i}
                style={{
                  opacity: p,
                  transform: `translateY(${(1 - p) * 18}px)`,
                  border: `2px solid ${C.copperDim}`,
                  borderRadius: 8,
                  padding: "12px 22px",
                  fontFamily: fonts.mono,
                  fontSize: 30,
                  color: "#e9cfb6",
                }}
              >
                {tg.t}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </SceneWrap>
  );
};

// S2 — the line trembles harder, bursts into points and assembles into a brain; colour flips to blue.
export const S2: React.FC<SceneProps> = ({ dur, lines, from }) => {
  const f = useCurrentFrame();
  const [l0] = lines;
  const burst = atChar(l0, "正在");
  // tremble builds, then a beat of stillness right before the burst
  const tremble = f < burst - 8 ? 7 + prog(f, 0, burst - 8) * 12 : 0;
  const morph = prog(f, burst, burst + 42, ease.inOut);
  const flash = f >= burst ? Math.max(0, 1 - (f - burst) / 16) : 0;
  const lineOn = 1 - prog(f, burst, burst + 5);
  return (
    <SceneWrap dur={dur} enter={false}>
      <AbsoluteFill>
        {lineOn > 0 && <LineWave frame={from + f} vibrate={tremble} lineY={LINE_Y} opacity={lineOn} />}
        {f >= burst && <Brain frame={from + f} morph={morph} lineY={LINE_Y} />}
        <AbsoluteFill
          style={{ background: `radial-gradient(circle at 50% 47%, ${C.accent}, transparent 38%)`, opacity: flash * 0.35 }}
        />
        <Rise at={atChar(l0, "但在苏州")} style={{ left: X, top: 420 }}>
          <div style={{ fontFamily: fonts.mono, color: C.dim, fontSize: 24, letterSpacing: "0.3em" }}>SUZHOU · 2026</div>
        </Rise>
        <Slam at={atChar(l0, "一颗大脑")} style={{ left: 0, right: 0, top: 1210, textAlign: "center" }}>
          <div
            style={{
              fontFamily: fonts.sans,
              fontWeight: 900,
              color: C.fg,
              fontSize: 132,
              letterSpacing: "0.08em",
              textShadow: glowText(C.accent, 30),
            }}
          >
            一颗大脑
          </div>
        </Slam>
      </AbsoluteFill>
    </SceneWrap>
  );
};
