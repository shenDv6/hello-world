// Voice-over driven timeline: every scene boundary and visual beat is derived from vo.json,
// so picture, music cues and the sync check all read the same numbers.
import { FPS } from "./util.js";

const LEAD = 0.5; // picture leads the voice so each scene is already moving when it speaks

export async function loadTimeline() {
  const vo = await (await fetch("./vo.json")).json();
  const lines = vo.lines.map((l, i) => ({
    ...l,
    i,
    f0: Math.round(l.start * FPS),
    f1: Math.round((l.start + l.dur) * FPS),
  }));
  const total = Math.ceil(vo.total * FPS);
  const ids = [...new Set(lines.map((l) => l.scene))].sort((a, b) => a - b);
  const scenes = ids.map((id, k) => {
    const own = lines.filter((l) => l.scene === id);
    const from = id === ids[0] ? 0 : Math.round((own[0].start - LEAD) * FPS);
    return { id, from, lines: own };
  });
  scenes.forEach((s, k) => (s.to = k + 1 < scenes.length ? scenes[k + 1].from : total));

  // Global frame at which `text` starts being spoken within a line (even pacing per character).
  const word = (line, text) => {
    const idx = line.text.indexOf(text);
    if (idx < 0) throw new Error(`"${text}" not in "${line.text}"`);
    return Math.round(line.f0 + (idx / line.text.length) * (line.f1 - line.f0));
  };
  const scene = (id) => scenes.find((s) => s.id === id);
  const L = (id, k) => scene(id).lines[k];

  // Key beats shared by picture and sound. Everything that "lands" is listed here.
  const B = {
    q: word(L(1, 0), "什么"), // question mark forms
    card1: word(L(1, 1), "一张卡"),
    card2: word(L(1, 1), "一根网线"),
    card3: word(L(1, 1), "流量"),
    drop: L(2, 1).f0 - 2, // "AI!" — the drop
    wujiang: word(L(3, 0), "吴江"),
    center: word(L(3, 0), "长三角"),
    num: L(3, 1).f0,
    numLand: word(L(3, 1), "次"),
    hexStart: word(L(4, 0), "苏州电信"),
    hexEnd: word(L(4, 0), "二十三家") + 8,
    lines: L(4, 1).f0,
    cloud: word(L(5, 0), "天翼"),
    agent: word(L(5, 0), "星辰"),
    type0: word(L(5, 1), "帮我"),
    type1: L(5, 1).f1,
    steps: L(5, 2).f0,
    stepWords: ["拆任务", "找工具", "出结果"].map((w) => word(L(5, 2), w)),
    stepsEnd: L(5, 2).f1,
    skills: L(5, 3).f0,
    skillWords: ["标书", "报表", "合同", "代码"].map((w) => word(L(5, 3), w)),
    rings: word(L(6, 0), "四层"),
    badge: word(L(6, 0), "国内首批"),
    compare: L(6, 1).f0,
    bars: word(L(6, 1), "只要"),
    save: word(L(6, 1), "又快又省"),
    users: L(7, 0).f0,
    million: word(L(7, 0), "一百万"),
    oldWord: word(L(8, 0), "卖流量"),
    newWord: word(L(8, 0), "卖智能"),
    title: word(L(8, 1), "苏州电信"),
    everyday: word(L(8, 1), "走进"),
  };

  return { vo, lines, total, scenes, scene, L, word, B };
}
