import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { fonts } from "../fonts";
import { C, W, X, ease, glowText, prog } from "../theme";
import { atChar } from "../timeline";
import { Label, Rise, SceneProps, SceneWrap, Slam } from "./common";

const CX = 540;
const CY = 800;
const LAYERS: [string, number][] = [
  ["感知", 130],
  ["推理", 195],
  ["执行", 260],
  ["记忆", 325],
];

export const S6: React.FC<SceneProps> = ({ dur, lines, from }) => {
  const f = useCurrentFrame();
  const [l0, l1, l2] = lines;
  const shieldIn = prog(f, 0, 18);
  const ringsOut = prog(f, l2.from - 6, l2.from + 10, ease.in);
  const barsAt = atChar(l2, "只要");
  const saveAt = atChar(l2, "五到八成");

  return (
    <SceneWrap dur={dur}>
      <AbsoluteFill>
        <Rise at={atChar(l0, "四层")} style={{ left: X, top: 330 }}>
          <div style={{ fontFamily: fonts.sans, fontWeight: 900, fontSize: 88, color: C.fg, opacity: 1 - ringsOut }}>
            四层<span style={{ color: C.accent }}>防护</span>
          </div>
        </Rise>

        {ringsOut < 1 && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: 1 - ringsOut,
              transform: `scale(${1 - 0.25 * ringsOut})`,
              transformOrigin: `${CX}px ${CY}px`,
            }}
          >
            <svg width={W} height={1920} style={{ position: "absolute", inset: 0 }}>
              <defs>
                <filter id="sglow" filterUnits="userSpaceOnUse" x={0} y={0} width={W} height={1920}>
                  <feGaussianBlur stdDeviation="5" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                {/* the shield is drawn around a translated origin, so its filter region is local */}
                <filter id="sglowLocal" filterUnits="userSpaceOnUse" x={-150} y={-150} width={300} height={300}>
                  <feGaussianBlur stdDeviation="5" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              {LAYERS.map(([w, r], i) => {
                const at = atChar(l0, w);
                const p = prog(f, at, at + 16, ease.out);
                const circ = 2 * Math.PI * r;
                const rot = (from + f) * (i % 2 ? -0.4 : 0.3);
                return (
                  <g key={w} transform={`rotate(${rot} ${CX} ${CY})`} opacity={p > 0 ? 1 : 0}>
                    <circle cx={CX} cy={CY} r={r} fill="none" stroke={C.faint} strokeWidth={2} />
                    <circle
                      cx={CX}
                      cy={CY}
                      r={r}
                      fill="none"
                      stroke={C.accent}
                      strokeWidth={4}
                      strokeDasharray={`${circ * 0.72 * p} ${circ}`}
                      strokeLinecap="round"
                      filter="url(#sglow)"
                    />
                  </g>
                );
              })}
              {/* shield core */}
              <g opacity={shieldIn} transform={`translate(${CX} ${CY}) scale(${0.8 + 0.2 * shieldIn})`} filter="url(#sglowLocal)">
                <path d="M0,-62 L50,-40 L50,8 C50,40 26,60 0,72 C-26,60 -50,40 -50,8 L-50,-40 Z" fill="rgba(58,168,255,0.18)" stroke={C.accentSoft} strokeWidth={4} />
                <circle cx={0} cy={-2} r={12} fill={C.accentSoft} />
                <rect x={-5} y={4} width={10} height={24} rx={4} fill={C.accentSoft} />
              </g>
            </svg>
            {LAYERS.map(([w, r]) => {
              const at = atChar(l0, w);
              const p = prog(f, at, at + 10);
              return (
                <div
                  key={w}
                  style={{
                    position: "absolute",
                    left: CX + r * 0.707 + 10,
                    top: CY - r * 0.707 - 30,
                    opacity: p,
                    transform: `translateX(${(1 - p) * 20}px)`,
                    fontFamily: fonts.sans,
                    fontWeight: 700,
                    fontSize: 34,
                    color: C.fg,
                    textShadow: "0 2px 10px rgba(0,0,0,0.8)",
                  }}
                >
                  {w}
                </div>
              );
            })}
            <Slam at={atChar(l1, "国内首批")} style={{ left: 0, right: 0, top: 1170, textAlign: "center" }} color={C.accent}>
              <div
                style={{
                  display: "inline-block",
                  padding: "20px 40px",
                  border: `4px solid ${C.accent}`,
                  outline: `2px solid ${C.accent}55`,
                  outlineOffset: 8,
                  borderRadius: 10,
                  transform: "rotate(-3deg)",
                  background: "rgba(58,168,255,0.1)",
                }}
              >
                <div style={{ fontFamily: fonts.sans, fontWeight: 900, fontSize: 68, color: C.fg, letterSpacing: "0.1em" }}>国内首批</div>
                <div style={{ fontFamily: fonts.sans, fontWeight: 500, fontSize: 32, color: C.accentSoft, marginTop: 6 }}>
                  通过中国信通院安全测试的智能体
                </div>
              </div>
            </Slam>
          </div>
        )}

        {/* efficiency */}
        {f >= l2.from + 6 && (
          <div style={{ position: "absolute", left: X, right: X, top: 360 }}>
            <Rise at={l2.from + 8}>
              <Label>TOKEN 消耗 · 同样的任务</Label>
            </Rise>
            {[
              { name: "主流产品", lo: 1, hi: 1, color: C.faint, text: "100%" },
              { name: "星辰超级智能体", lo: 0.5, hi: 0.8, color: C.accent, text: "50% – 80%" },
            ].map((b, i) => {
              const p = prog(f, barsAt + i * 8, barsAt + i * 8 + 22, ease.out);
              return (
                <div key={b.name} style={{ position: "absolute", left: 0, right: 0, top: 70 + i * 170, opacity: prog(f, l2.from + 10 + i * 6, l2.from + 20 + i * 6) }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontFamily: fonts.sans, fontSize: 36, color: C.fg }}>
                    <span style={{ fontWeight: 700 }}>{b.name}</span>
                    <span style={{ fontFamily: fonts.mono, color: i ? C.accentSoft : C.dim, opacity: p }}>{b.text}</span>
                  </div>
                  <div style={{ position: "relative", marginTop: 18, height: 44, borderRadius: 6, background: C.ghost }}>
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: `${b.lo * 100 * p}%`,
                        background: b.color,
                        borderRadius: 6,
                        boxShadow: i ? `0 0 24px ${C.accent}88` : undefined,
                      }}
                    />
                    {b.hi > b.lo && (
                      <div
                        style={{
                          position: "absolute",
                          left: `${b.lo * 100 * p}%`,
                          top: 0,
                          bottom: 0,
                          width: `${(b.hi - b.lo) * 100 * p}%`,
                          background: `repeating-linear-gradient(135deg, ${C.accent}88 0 8px, transparent 8px 16px)`,
                        }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
            <Slam at={saveAt} style={{ left: 0, top: 440 }}>
              <div style={{ fontFamily: fonts.sans, fontWeight: 900, fontSize: 150, color: C.fg, textShadow: glowText(C.accent, 26) }}>
                省 <span style={{ color: C.accent }}>20–50</span>%
              </div>
            </Slam>
          </div>
        )}
      </AbsoluteFill>
    </SceneWrap>
  );
};
