import React from "react";
import { AbsoluteFill, Easing, interpolate, random, useCurrentFrame } from "remotion";
import { LineWave } from "../brain";
import { fonts } from "../fonts";
import { C, W, X, ease, glowText, prog } from "../theme";
import { atChar } from "../timeline";
import { Label, Rise, SceneProps, SceneWrap, Slam } from "./common";

const DCOLS = 30;
const DROWS = 18;
const DOTS = DCOLS * DROWS;

// S7 — scale: every dot is a crowd of users; the counter races to one million.
export const S7: React.FC<SceneProps> = ({ dur, lines }) => {
  const f = useCurrentFrame();
  const [l0] = lines;
  const start = l0.from;
  const land = atChar(l0, "一百万") + 10;
  const ratio = interpolate(f, [start, land], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.5, 0, 0.2, 1),
  });
  const value = Math.round(ratio * 1_000_000);
  const hit = f >= land ? Math.max(0, 1 - (f - land) / 22) : 0;
  const cell = (W - 2 * X) / DCOLS;

  return (
    <SceneWrap dur={dur}>
      <AbsoluteFill>
        {/* dots fill up from the bottom */}
        {Array.from({ length: DOTS }).map((_, i) => {
          const col = i % DCOLS;
          const row = DROWS - 1 - Math.floor(i / DCOLS);
          const spawn = start + (i / DOTS) * (land - start) - 12 + random(`dp${i}`) * 6;
          const p = prog(f, spawn, spawn + 14, ease.in);
          if (p <= 0) return null;
          const tx = X + col * cell + cell / 2;
          const ty = 880 + row * cell;
          const y = -20 + (ty + 20) * p;
          const s = 7 + random(`dz${i}`) * 5;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: tx - s / 2,
                top: y - s / 2,
                width: s,
                height: s,
                borderRadius: s,
                background: random(`dc${i}`) > 0.9 ? C.accentSoft : C.accent,
                opacity: 0.35 + 0.5 * random(`do${i}`) + hit * 0.3,
                boxShadow: hit > 0 ? `0 0 ${10 * hit}px ${C.accent}` : undefined,
              }}
            />
          );
        })}

        <Rise at={l0.from - 4} style={{ left: X, top: 360 }}>
          <Label style={{ fontSize: 26 }}>星辰超级智能体 · 用户规模</Label>
        </Rise>
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 440,
            textAlign: "center",
            fontFamily: fonts.sans,
            fontWeight: 900,
            fontSize: 172,
            lineHeight: 1,
            color: C.fg,
            fontVariantNumeric: "tabular-nums",
            textShadow: glowText(C.accent, 20 + hit * 60),
            transform: `scale(${1 + hit * 0.08})`,
            opacity: prog(f, l0.from - 4, l0.from + 6),
          }}
        >
          {value.toLocaleString("en-US")}
        </div>
        <Slam at={land - 4} style={{ left: 0, right: 0, top: 660, textAlign: "center" }}>
          <div style={{ fontFamily: fonts.sans, fontWeight: 900, fontSize: 76, color: C.accent, letterSpacing: "0.2em" }}>突破百万</div>
        </Slam>
      </AbsoluteFill>
    </SceneWrap>
  );
};

// S8 — the thesis, then the line returns — this time blue — under the title.
export const S8: React.FC<SceneProps> = ({ dur, lines, from }) => {
  const f = useCurrentFrame();
  const [l0, l1, l2] = lines;
  const oldAt = atChar(l0, "卖流量");
  const strikeAt = atChar(l0, "到卖智能") - 4;
  const newAt = atChar(l0, "卖智能");
  const thesisOut = prog(f, l1.from - 8, l1.from + 6, ease.in);
  const lineDraw = prog(f, l1.from - 2, l1.from + 34, ease.inOut);
  const titleAt = atChar(l1, "苏州电信");
  const tagAt = atChar(l2, "都开始思考");
  const endFade = prog(f, dur - 18, dur, ease.in);

  return (
    <SceneWrap dur={dur} exit={false}>
      <AbsoluteFill style={{ opacity: 1 - endFade }}>
        {/* thesis */}
        {thesisOut < 1 && (
          <div style={{ position: "absolute", inset: 0, opacity: 1 - thesisOut, transform: `scale(${1 + thesisOut * 0.15})` }}>
            <Rise at={oldAt} style={{ left: X, top: 520 }}>
              <div style={{ position: "relative", fontFamily: fonts.sans, fontWeight: 900, fontSize: 150, color: C.dim }}>
                <span style={{ fontSize: 70, fontWeight: 500 }}>从 </span>卖流量
                <div
                  style={{
                    position: "absolute",
                    left: 120,
                    right: -20,
                    top: "54%",
                    height: 10,
                    background: C.accent,
                    boxShadow: `0 0 20px ${C.accent}`,
                    transformOrigin: "left",
                    transform: `scaleX(${prog(f, strikeAt, strikeAt + 8, ease.out)})`,
                  }}
                />
              </div>
            </Rise>
            <Slam at={newAt} style={{ left: X, top: 800 }}>
              <div style={{ fontFamily: fonts.sans, fontWeight: 900, fontSize: 190, color: C.fg }}>
                <span style={{ fontSize: 70, fontWeight: 500, color: C.dim }}>到 </span>
                <span style={{ textShadow: glowText(C.accent, 30) }}>卖智能</span>
              </div>
            </Slam>
          </div>
        )}

        {/* the line returns; a slow push-in keeps the final hold alive */}
        <div style={{ position: "absolute", inset: 0, transform: `scale(${1 + 0.05 * prog(f, l1.from, dur, ease.soft)})` }}>
        {lineDraw > 0 && <LineWave frame={from + f} draw={lineDraw} color={C.accent} lineY={960} />}
        {lineDraw >= 1 &&
          [0, 1].map((k) => {
            // light pulses travelling along the line: the connection is carrying something now
            const span = W - 2 * X + 400;
            const px = X - 200 + (((f - l1.from) * 11 + k * span * 0.5) % span);
            const edge = Math.min(1, Math.max(0, (px - X) / 80), Math.max(0, (W - X - px) / 80));
            return (
              <div
                key={k}
                style={{
                  position: "absolute",
                  left: px - 90,
                  top: 960 - 3,
                  width: 180,
                  height: 6,
                  borderRadius: 6,
                  opacity: edge,
                  background: `linear-gradient(90deg, transparent, ${C.accentSoft}, #ffffff, ${C.accentSoft}, transparent)`,
                  boxShadow: `0 0 24px 4px ${C.accent}`,
                }}
              />
            );
          })}
        <Slam at={titleAt} style={{ left: 0, right: 0, top: 740, textAlign: "center" }}>
          <div style={{ fontFamily: fonts.sans, fontWeight: 900, fontSize: 150, letterSpacing: "0.12em", color: C.fg }}>苏州电信</div>
        </Slam>
        <Rise at={atChar(l1, "不只")} style={{ left: 0, right: 0, top: 1010, textAlign: "center" }}>
          <div style={{ fontFamily: fonts.serif, fontWeight: 700, fontSize: 60, color: C.fg, letterSpacing: "0.3em" }}>
            从连接<span style={{ color: C.dim }}>，</span>到<span style={{ color: C.accent, textShadow: glowText(C.accent, 18) }}>智能</span>
          </div>
        </Rise>
        <Rise at={tagAt} style={{ left: 0, right: 0, top: 1110, textAlign: "center" }}>
          <Label style={{ fontSize: 22, letterSpacing: "0.4em" }}>FROM CONNECTION TO INTELLIGENCE</Label>
        </Rise>
        </div>
        <Rise at={l2.to + 6} style={{ left: X, right: X, top: 1250, textAlign: "center" }}>
          <div style={{ fontFamily: fonts.sans, fontSize: 20, color: C.dim, lineHeight: 1.6 }}>
            数据来源：科技日报、新浪科技、苏州市人民政府等公开报道
          </div>
        </Rise>
      </AbsoluteFill>
    </SceneWrap>
  );
};
