import React from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile } from "remotion";
import { preloadFonts } from "./fonts";
import { Background, Dust, Grain, Hud, Subtitles, Vignette } from "./layers";
import { S1, S2 } from "./scenes/S1S2";
import { S3 } from "./scenes/S3";
import { S4 } from "./scenes/S4";
import { S5 } from "./scenes/S5";
import { S6 } from "./scenes/S6";
import { S7, S8 } from "./scenes/S7S8";
import { FPS } from "./theme";
import { atChar, BURST, sceneById, scenes, TOTAL, voLines } from "./timeline";

preloadFonts([
  voLines.map((l) => l.text).join(""),
  "30YEARS一根线SIM卡宽带100M流量30G/月SUZHOU·2026一颗大脑",
  "31.16°N120.64°ETAIHULAKE太湖之滨吴江长三角算力调度中心中国电信承建东数西算枢纽EVERYSECOND每秒0123456789亿亿次总算力>5000PFLOPS",
  "2023工信部国家级5G工厂江苏/97苏州电信承建EVERYLINECONNECTED",
  "天翼AI云电脑8核CPU16GB内存120GB存储星辰超级智能体TeleAgent预装任务拆解5步自动执行读取本周销售数据.xlsx清洗汇总1,284条记录生成4张趋势图撰写结论与建议输出本周周报.docx调用表格分析数据清洗图表生成文案写作文档排版整理本周数据，生成周报说一句话，交给智能体…↑✓▍",
  "标书报表合同代码PPT纪要文案翻译调研海报预算审计排班招聘周报方案运维客服质检对账巡检脚本邮件选题50,000+SKILLS技能",
  "四层防护感知推理执行记忆国内首批通过中国信通院安全测试的智能体TOKEN消耗同样的任务主流产品100%星辰超级智能体50%–80%省20–50%",
  "星辰超级智能体用户规模1,000,000突破百万",
  "从卖流量到卖智能苏州电信从连接，到智能FROMCONNECTIONTOINTELLIGENCE数据来源：科技日报、新浪科技、苏州市人民政府等公开报道",
  "01算力COMPUTE02连接CONNECT03智能体AGENT04安全SECURE05规模SCALESUZHOUTELECOMAI转型·2026",
]);

const SCENES: Record<number, React.FC<{ dur: number; lines: any; from: number }>> = { 1: S1, 2: S2, 3: S3, 4: S4, 5: S5, 6: S6, 7: S7, 8: S8 };

// ---- sound cues (global frames), kept next to the picture timing they follow ----
const s = sceneById;
const at = (id: number, line: number, word: string) => s(id).from + atChar(s(id).lines[line], word);
const SLAM = 9; // frames until a <Slam> lands

type Cue = { file: string; at: number; vol: number };
const cues: Cue[] = [];
const add = (file: string, frame: number, vol: number) => cues.push({ file, at: Math.max(0, Math.round(frame)), vol });

[3, 4, 5, 6, 7, 8].forEach((id) => add("whoosh", s(id).from - 8, 0.55));
add("riser", BURST - 2 * FPS, 0.5);
add("impact", BURST - 2, 1);
add("impact", at(3, 2, "运算") + 2, 0.9);
{
  const l0 = s(4).lines[0];
  const a = atChar(l0, "苏州电信");
  const b = atChar(l0, "二十三家") + 6;
  for (let i = 0; i < 23; i++) add("tick", s(4).from + a + ((b - a) * i) / 23 - 1, 0.5);
  add("hit", s(4).from + b, 0.8);
}
{
  const l3 = s(5).lines[3];
  for (let i = 0; i < 5; i++) add("tick", s(5).from + l3.from + ((l3.to - l3.from) * i) / 5 + 11, 0.7);
  add("hit", s(5).from + s(5).lines[4].from + 2 + SLAM, 0.9);
}
add("impact", at(6, 1, "国内首批") + SLAM, 0.9);
add("hit", at(6, 2, "五到八成") + SLAM, 0.8);
add("riser", at(7, 0, "一百万") + 10 - 2 * FPS, 0.5);
add("impact", at(7, 0, "一百万") + 10, 1);
add("hit", at(8, 0, "卖智能") + SLAM, 0.9);
add("impact", at(8, 1, "苏州电信") + SLAM, 1);
add("chime", at(8, 1, "苏州电信") + SLAM, 0.55);

const firstVo = Math.round(voLines[0].start * FPS);
const lastVoEnd = Math.round((voLines[voLines.length - 1].start + voLines[voLines.length - 1].dur) * FPS);

export const Video: React.FC = () => (
  <AbsoluteFill>
    <Background />
    <Dust />
    {scenes.map((sc) => {
      const Comp = SCENES[sc.id];
      return (
        <Sequence key={sc.id} from={sc.from} durationInFrames={sc.dur} name={`S${sc.id}`}>
          <Comp dur={sc.dur} lines={sc.lines} from={sc.from} />
        </Sequence>
      );
    })}
    <Hud />
    <Subtitles />
    <Grain />
    <Vignette />

    <Audio
      src={staticFile("audio/bgm.wav")}
      volume={(f) =>
        interpolate(f, [0, firstVo - 10, firstVo + 10, lastVoEnd, lastVoEnd + 20, TOTAL - 20, TOTAL], [0.5, 0.5, 0.26, 0.26, 0.55, 0.55, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      }
    />
    {voLines.map((l, i) =>
      l.file ? (
        <Sequence key={`vo${i}`} from={Math.round(l.start * FPS)} name={`VO ${i}`}>
          <Audio src={staticFile(l.file)} volume={1} />
        </Sequence>
      ) : null,
    )}
    {cues.map((c, i) => (
      <Sequence key={`sfx${i}`} from={c.at} name={`${c.file}`}>
        <Audio src={staticFile(`audio/sfx/${c.file}.wav`)} volume={c.vol} />
      </Sequence>
    ))}
  </AbsoluteFill>
);
