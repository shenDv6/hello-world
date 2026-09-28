import React from "react";
import { AbsoluteFill, random, useCurrentFrame } from "remotion";
import { Brain } from "../brain";
import { fonts } from "../fonts";
import { C, W, X, ease, glowText, lerp, prog } from "../theme";
import { atChar } from "../timeline";
import { Count, Label, SceneProps, SceneWrap, Slam, TypeOn } from "./common";

const WIN = { left: 70, top: 320, width: W - 140, height: 930 };

const STEPS = [
  ["读取  本周销售数据.xlsx", "调用 · 表格分析"],
  ["清洗汇总  1,284 条记录", "调用 · 数据清洗"],
  ["生成  4 张趋势图", "调用 · 图表生成"],
  ["撰写  结论与建议", "调用 · 文案写作"],
  ["输出  本周周报.docx", "调用 · 文档排版"],
];

const SKILLS = ["标书", "报表", "合同", "代码", "PPT", "纪要", "文案", "翻译", "调研", "海报", "预算", "审计",
  "排班", "招聘", "周报", "方案", "运维", "客服", "质检", "对账", "巡检", "脚本", "邮件", "选题"];

const Chip: React.FC<{ children: React.ReactNode; p: number; accent?: boolean }> = ({ children, p, accent }) => (
  <div
    style={{
      opacity: p,
      transform: `translateY(${(1 - p) * 16}px)`,
      padding: "10px 20px",
      borderRadius: 10,
      border: `2px solid ${accent ? C.accent : C.faint}`,
      fontFamily: fonts.mono,
      fontSize: 26,
      color: accent ? C.accentSoft : C.fg,
      background: accent ? "rgba(58,168,255,0.12)" : "transparent",
    }}
  >
    {children}
  </div>
);

export const S5: React.FC<SceneProps> = ({ dur, lines, from }) => {
  const f = useCurrentFrame();
  const [l0, l1, l2, l3, l4] = lines;

  // A: the brain arrives inside a computer window
  const winIn = prog(f, atChar(l0, "装进"), atChar(l0, "装进") + 18, ease.out);
  const brainIn = prog(f, 0, 24, ease.out);
  // C: the brain docks as an avatar so the chat can take the stage
  const dock = prog(f, l2.from - 8, l2.from + 16, ease.inOut);
  // E: the window pushes past camera and the skills pour out
  const winOut = prog(f, l4.from - 8, l4.from + 6, ease.in);
  const E0 = l4.from;

  const brainCx = lerp(540, WIN.left + WIN.width - 90, dock);
  const brainCy = lerp(740, WIN.top + 150, dock);
  const brainR = lerp(190, 42, dock);

  const typeAt = atChar(l2, "整理");
  const typeText = "整理本周数据，生成周报";
  const perChar = Math.max(2, Math.floor((l2.to - typeAt) / typeText.length));
  const sent = typeAt + perChar * typeText.length + 4;
  const sendFlash = f >= sent ? Math.max(0, 1 - (f - sent) / 14) : 0;

  const stepAt = (i: number) => Math.round(l3.from + (i * (l3.to - l3.from)) / STEPS.length);

  return (
    <SceneWrap dur={dur}>
      <AbsoluteFill>
        {/* the computer */}
        {winOut < 1 && (
          <div
            style={{
              position: "absolute",
              ...WIN,
              borderRadius: 28,
              border: `2px solid ${C.faint}`,
              background: "rgba(8,18,36,0.78)",
              boxShadow: `0 40px 120px rgba(0,0,0,0.6), 0 0 0 1px rgba(58,168,255,0.08) inset`,
              opacity: winIn * (1 - winOut),
              transform: `scale(${(0.86 + 0.14 * winIn) * (1 + 0.35 * winOut)})`,
              filter: winOut > 0 ? `blur(${winOut * 16}px)` : undefined,
              overflow: "hidden",
            }}
          >
            {/* title bar */}
            <div style={{ height: 76, borderBottom: `2px solid ${C.ghost}`, display: "flex", alignItems: "center", padding: "0 28px", gap: 12 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ width: 14, height: 14, borderRadius: 14, background: C.faint }} />
              ))}
              <div style={{ flex: 1, textAlign: "center", fontFamily: fonts.sans, fontWeight: 700, fontSize: 30, color: C.fg }}>
                天翼 AI 云电脑
              </div>
              <div style={{ width: 66 }} />
            </div>

            {/* B: specs + agent badge */}
            <div style={{ display: "flex", gap: 14, padding: "26px 28px 0" }}>
              <Chip p={prog(f, atChar(l1, "天翼"), atChar(l1, "天翼") + 10)}>8 核 CPU</Chip>
              <Chip p={prog(f, atChar(l1, "天翼") + 5, atChar(l1, "天翼") + 15)}>16 GB 内存</Chip>
              <Chip p={prog(f, atChar(l1, "天翼") + 10, atChar(l1, "天翼") + 20)}>120 GB 存储</Chip>
            </div>
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 640,
                textAlign: "center",
                opacity: prog(f, atChar(l1, "星辰"), atChar(l1, "星辰") + 12) * (1 - dock),
              }}
            >
              <div style={{ fontFamily: fonts.sans, fontWeight: 900, fontSize: 64, color: C.fg, textShadow: glowText(C.accent, 18) }}>
                星辰超级智能体
              </div>
              <Label style={{ marginTop: 12, color: C.accentSoft, fontSize: 26 }}>TeleAgent · 预装</Label>
            </div>

            {/* D: task decomposition */}
            <div style={{ position: "absolute", left: 28, right: 28, top: 230 }}>
              <Label style={{ opacity: prog(f, l3.from - 4, l3.from + 8) }}>任务拆解 · 5 步 · 自动执行</Label>
              {STEPS.map(([t, d], i) => {
                const at = stepAt(i);
                const p = prog(f, at, at + 10);
                const done = f >= at + 12;
                const spin = (f - at) * 18;
                const last = i === STEPS.length - 1;
                return (
                  <div
                    key={i}
                    style={{
                      marginTop: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 22,
                      padding: "14px 22px",
                      borderRadius: 14,
                      background: last && done ? "rgba(58,168,255,0.16)" : "rgba(255,255,255,0.03)",
                      border: `2px solid ${last && done ? C.accent : C.ghost}`,
                      opacity: p,
                      transform: `translateX(${(1 - p) * -30}px)`,
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 36,
                        border: `3px solid ${done ? C.accent : C.faint}`,
                        borderTopColor: C.accent,
                        transform: done ? undefined : `rotate(${spin}deg)`,
                        background: done ? C.accent : "transparent",
                        color: C.bg,
                        fontSize: 24,
                        fontWeight: 900,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: fonts.sans,
                      }}
                    >
                      {done ? "✓" : ""}
                    </div>
                    <div style={{ flex: 1, fontFamily: fonts.sans, fontSize: 32, color: C.fg, whiteSpace: "pre" }}>{t}</div>
                    <div style={{ fontFamily: fonts.mono, fontSize: 20, color: done ? C.accentSoft : C.dim }}>{d}</div>
                  </div>
                );
              })}
            </div>

            {/* C: the one sentence */}
            <div
              style={{
                position: "absolute",
                left: 28,
                right: 28,
                bottom: 28,
                height: 96,
                borderRadius: 48,
                border: `2px solid ${f >= typeAt ? C.accent : C.faint}`,
                display: "flex",
                alignItems: "center",
                padding: "0 18px 0 34px",
                opacity: prog(f, l2.from - 6, l2.from + 8),
                boxShadow: sendFlash > 0 ? `0 0 ${40 * sendFlash}px ${C.accent}` : undefined,
              }}
            >
              <div style={{ flex: 1, fontFamily: fonts.sans, fontSize: 36, color: C.fg }}>
                {f < typeAt ? <span style={{ color: C.dim }}>说一句话，交给智能体…</span> : <TypeOn text={typeText} at={typeAt} perChar={perChar} />}
              </div>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 64,
                  background: f >= sent ? C.accent : C.faint,
                  color: C.bg,
                  fontSize: 34,
                  fontWeight: 900,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transform: `scale(${1 + sendFlash * 0.25})`,
                }}
              >
                ↑
              </div>
            </div>
          </div>
        )}

        {/* the brain itself (outside the window's overflow so it can fly in) */}
        {winOut < 1 && (
          <Brain
            frame={from + f}
            morph={1}
            cx={brainCx}
            cy={brainCy}
            radius={brainR}
            scale={lerp(2.6, 1, brainIn)}
            opacity={brainIn * (1 - winOut) * (f < l1.from ? 1 : lerp(0.55, 1, dock))}
          />
        )}

        {/* E: skills pour out */}
        {f >= E0 - 4 && (
          <AbsoluteFill>
            {SKILLS.map((s, i) => {
              const t = ((f - E0) * 0.011 + random(`sk${i}`)) % 1;
              const ang = i * 2.39996 + random(`sa${i}`) * 0.4;
              const d = 60 + t * 820;
              const x = 540 + Math.cos(ang) * d * 0.85;
              const y = 820 + Math.sin(ang) * d * 0.62;
              // keep the stream clear of the HUD above and the subtitles below
              const band = Math.min(1, Math.max(0, (y - 330) / 60), Math.max(0, (1340 - y) / 60));
              const o = Math.sin(Math.PI * t) * prog(f, E0, E0 + 12) * band;
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: x,
                    top: y,
                    transform: `translate(-50%,-50%) scale(${0.5 + t * 1.6})`,
                    fontFamily: fonts.sans,
                    fontWeight: 700,
                    fontSize: 34,
                    color: C.fg,
                    opacity: o * 0.8,
                    filter: t > 0.75 ? `blur(${(t - 0.75) * 16}px)` : undefined,
                    whiteSpace: "nowrap",
                  }}
                >
                  {s}
                </div>
              );
            })}
            <Slam at={E0 + 2} style={{ left: 0, right: 0, top: 640, textAlign: "center" }}>
              <div style={{ fontFamily: fonts.sans, fontWeight: 900, fontSize: 190, lineHeight: 1, color: C.fg }}>
                <Count to={50000} at={E0 + 2} dur={atChar(l4, "技能") - E0 + 6} />
                <span style={{ color: C.accent }}>+</span>
              </div>
              <Label style={{ marginTop: 18, fontSize: 28, color: C.accentSoft }}>SKILLS · 技能</Label>
            </Slam>
            <div style={{ position: "absolute", left: X, right: X, top: 1050, display: "flex", justifyContent: "center", gap: 18 }}>
              {["标书", "报表", "合同", "代码"].map((w) => (
                <Chip key={w} p={prog(f, atChar(l4, w), atChar(l4, w) + 8)} accent>
                  <span style={{ fontFamily: fonts.sans, fontSize: 36, fontWeight: 700 }}>{w}</span>
                </Chip>
              ))}
            </div>
          </AbsoluteFill>
        )}
      </AbsoluteFill>
    </SceneWrap>
  );
};
