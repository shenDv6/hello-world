// The eight scenes' 2D layer (text, stickers, UI). Particles and backgrounds live in WebGL.
import { FPS, PAL, W, clamp, ease, fonts, prog } from "./util.js";
import { box, check, group, hexPath, marker, measure, pill, pop, popOut, shadow, sparkle, star, text } from "./draw.js";
import { HEXES, HEX_R, LIT, RINGS, SHIELD } from "./layout.js";

const X = 80;
const CX = W / 2;

// ---------------------------------------------------------------- S1: what did telecom sell?
function s1(ctx, f, T, S) {
  const [l0, l1] = S.lines;
  const end = S.to;
  const h1 = pop(f, l0.f0 - 6) * popOut(f, end);
  group(ctx, X, 330, { s: h1, a: h1 }, () => text(ctx, "说起电信，", 0, 0, { size: 46, weight: 700, color: PAL.inkSoft, align: "left" }));
  const h2 = pop(f, T.word(l0, "你第一个")) * popOut(f, end);
  group(ctx, X, 430, { s: h2, a: h2 }, () => {
    const w1 = measure(ctx, "你第一个", 76, 900);
    const w2 = measure(ctx, "想到", 76, 900);
    marker(ctx, w1 - 6, 14, w2 + 12, 34, PAL.yellow, prog(f, T.word(l0, "想到"), T.word(l0, "想到") + 10));
    text(ctx, "你第一个想到的是…", 0, 0, { size: 76, weight: 900, align: "left" });
  });
  const cards = [
    { at: T.B.card1, x: 250, y: 640, r: -0.13, fill: PAL.blue, big: "SIM 卡", sub: "一张卡" },
    { at: T.B.card2, x: 840, y: 830, r: 0.11, fill: PAL.mint, big: "宽带", sub: "一根网线" },
    { at: T.B.card3, x: 270, y: 1170, r: 0.07, fill: PAL.coral, big: "30G", sub: "每月流量" },
  ];
  cards.forEach((c, i) => {
    const p = pop(f, c.at, 18) * popOut(f, end - i * 2);
    const wob = f >= c.at ? Math.sin((f - c.at) * 0.25) * Math.exp(-(f - c.at) * 0.08) * 0.12 : 0;
    group(ctx, c.x, c.y, { s: p, r: c.r + wob }, () => {
      box(ctx, 0, 0, 310, 180, 32, c.fill, { sh: true });
      ctx.beginPath();
      ctx.arc(110, -52, 12, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.fill();
      text(ctx, c.big, 0, -16, { size: 64, weight: 900, color: "#fff" });
      text(ctx, c.sub, 0, 50, { size: 30, weight: 500, color: "rgba(255,255,255,0.9)" });
    });
  });
}

// ---------------------------------------------------------------- S2: something different — AI!
function s2(ctx, f, T, S) {
  const [l0] = S.lines;
  const drop = T.B.drop;
  const h = pop(f, l0.f0 - 4) * popOut(f, drop + 2, 6);
  group(ctx, X, 360, { s: h, a: h }, () => {
    text(ctx, "今天，", 0, -80, { size: 46, weight: 700, color: PAL.inkSoft, align: "left" });
    const w = measure(ctx, "苏州电信", 60, 900) + 60; // pill() centres on x, so offset by half its width
    pill(ctx, "苏州电信", w / 2, 0, { size: 60, weight: 900, fill: PAL.blue, color: "#fff", sh: true });
    text(ctx, "要来点", w + 20, 0, { size: 60, weight: 900, align: "left" });
    text(ctx, "不一样的！", 0, 110, { size: 88, weight: 900, color: PAL.coral, align: "left" });
  });
  const tag = pop(f, drop + 14, 18) * popOut(f, S.to);
  group(ctx, CX, 1240, { s: tag, r: -0.04 }, () => pill(ctx, "苏州电信 × AI", 0, 0, { size: 56, weight: 900, fill: PAL.ink, color: "#fff", padX: 44 }));
  [
    [210, 520, PAL.yellow, 34],
    [880, 560, PAL.coral, 26],
    [180, 1040, PAL.mint, 28],
    [900, 1060, PAL.violet, 36],
  ].forEach(([x, y, c, r], i) => {
    const p = pop(f, drop + 16 + i * 3, 14) * popOut(f, S.to);
    star(ctx, x, y, r * p, c, f * 0.03 + i);
  });
}

// ---------------------------------------------------------------- S3: compute
function s3(ctx, f, T, S) {
  const B = T.B;
  const away = prog(f, B.num - 8, B.num + 4, ease.in);
  const loc = pop(f, B.wujiang - 4) * (1 - away);
  group(ctx, X + 170, 340, { s: loc, a: loc }, () => {
    box(ctx, 0, 0, 340, 90, 45, "#fff", { sh: true });
    ctx.beginPath();
    ctx.arc(-120, 0, 24, 0, Math.PI * 2);
    ctx.fillStyle = PAL.coral;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-120, 0, 9, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
    text(ctx, "太湖 · 吴江", 24, 2, { size: 40, weight: 900 });
  });
  const nm = pop(f, B.center - 4) * (1 - away);
  group(ctx, X, 480, { s: nm, a: nm }, () => {
    const w = measure(ctx, "长三角算力调度中心", 70, 900);
    marker(ctx, -8, 18, w + 16, 34, "#BFE0FF", prog(f, B.center, B.center + 14));
    text(ctx, "长三角算力调度中心", 0, 0, { size: 70, weight: 900, align: "left" });
    text(ctx, "中国电信承建 · 东数西算长三角枢纽", 0, 80, { size: 32, weight: 500, color: PAL.inkSoft, align: "left" });
  });

  if (f >= B.num - 2) {
    const n = pop(f, B.num, 12);
    const land = B.numLand;
    const v = Math.round(500 * prog(f, B.num, land, ease.out));
    const bounce = f >= land ? 1 + 0.12 * Math.exp(-(f - land) * 0.2) * Math.cos((f - land) * 0.6) : 1;
    group(ctx, CX, 430, { s: pop(f, B.num - 2, 12) }, () => pill(ctx, "每秒", 0, 0, { size: 38, weight: 900, fill: PAL.yellow }));
    group(ctx, CX, 640, { s: n * bounce }, () => {
      const wn = measure(ctx, "500", 280, 900);
      const wu = measure(ctx, "亿亿次", 96, 900);
      const x0 = -(wn + wu + 20) / 2;
      text(ctx, String(v), x0 + wn, 0, { size: 280, weight: 900, color: PAL.blue, align: "right" });
      text(ctx, "亿亿次", x0 + wn + 20, 60, { size: 96, weight: 900, color: PAL.coral, align: "left" });
    });
    sparkle(ctx, f, land, CX, 640, 330);
    const sub = prog(f, land, land + 12);
    group(ctx, CX, 800, { a: sub }, () => text(ctx, "总算力 > 5000 PFLOPS", 0, 0, { size: 32, weight: 600, color: PAL.inkSoft, fam: fonts.mono }));
  }
}

// ---------------------------------------------------------------- S4: 5G factories
function s4(ctx, f, T, S) {
  const B = T.B;
  const per = (B.hexEnd - B.hexStart) / LIT.length;
  const lit = clamp(Math.floor((f - B.hexStart) / per) + 1, 0, LIT.length);
  const lbl = pop(f, S.from + 6);
  group(ctx, CX, 330, { s: lbl }, () => pill(ctx, "2023 · 工信部国家级 5G 工厂 · 江苏", 0, 0, { size: 30, weight: 700 }));
  const landed = B.hexEnd;
  const bounce = f >= landed ? 1 + 0.1 * Math.exp(-(f - landed) * 0.2) * Math.cos((f - landed) * 0.6) : 1;
  group(ctx, CX, 490, { s: pop(f, S.from + 10) * bounce }, () => {
    const wn = measure(ctx, "23", 200, 900);
    text(ctx, String(lit).padStart(2, "0"), 0, 0, { size: 200, weight: 900, color: lit ? PAL.blue : "rgba(21,32,59,0.15)", align: "right" });
    text(ctx, "/ 97", 20, 40, { size: 72, weight: 800, color: PAL.inkSoft, align: "left" });
    void wn;
  });
  sparkle(ctx, f, landed, CX, 490, 240);
  group(ctx, CX, 615, { s: pop(f, B.hexStart) }, () => pill(ctx, "苏州电信承建", 0, 0, { size: 32, weight: 900, fill: PAL.coral, color: "#fff" }));

  HEXES.forEach((h, i) => {
    const p = pop(f, S.from + 4 + i * 0.3, 12);
    if (p <= 0) return;
    hexPath(ctx, h.x, h.y, (HEX_R - 4) * p);
    ctx.strokeStyle = "rgba(21,32,59,0.16)";
    ctx.lineWidth = 3;
    ctx.stroke();
  });
  const colors = [PAL.blue, PAL.mint, PAL.yellow, PAL.coral, PAL.violet];
  LIT.forEach((h, i) => {
    const at = B.hexStart + i * per;
    if (f < at) return;
    const p = pop(f, at, 12);
    hexPath(ctx, h.x, h.y, (HEX_R - 3) * p);
    ctx.fillStyle = colors[i % colors.length];
    shadow(ctx, true, 18, 6, 0.18);
    ctx.fill();
    shadow(ctx, false);
    const ring = (f - at) / 16;
    if (ring < 1) {
      hexPath(ctx, h.x, h.y, HEX_R + ring * 40);
      ctx.strokeStyle = colors[i % colors.length];
      ctx.globalAlpha = 1 - ring;
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.beginPath();
    ctx.arc(h.x, h.y, 7 * p, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
  });
  group(ctx, CX, 1335, { s: pop(f, B.lines + 4) }, () => pill(ctx, "每一条产线 · 都在线", 0, 0, { size: 34, weight: 900, fill: PAL.mint, color: "#fff" }));
}

// ---------------------------------------------------------------- S5: the agent
const ORB = (ctx, x, y, r, f) => {
  const g = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
  g.addColorStop(0, PAL.blue);
  g.addColorStop(1, PAL.violet);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = g;
  shadow(ctx, true, r * 0.8, r * 0.2, 0.25);
  ctx.fill();
  shadow(ctx, false);
  star(ctx, x, y, r * 0.5, "#fff", f * 0.02);
  star(ctx, x + r * 0.45, y - r * 0.45, r * 0.16, PAL.yellow, -f * 0.04);
};

function s5(ctx, f, T, S) {
  const B = T.B;
  const [l0, l1] = S.lines;
  const cardOut = prog(f, B.skills - 6, B.skills + 4, ease.in);
  const cardIn = pop(f, S.from + 2, 18);
  const chat = prog(f, l1.f0 - 10, l1.f0 + 6, ease.inOut); // intro → chat layout
  const top = 320, bottom = 1330, left = 70, right = 1010;

  group(ctx, CX, (top + bottom) / 2, { s: cardIn * (1 - 0.15 * cardOut), a: 1 - cardOut }, () => {
    ctx.translate(-CX, -(top + bottom) / 2);
    box(ctx, CX, (top + bottom) / 2, right - left, bottom - top, 44, "#fff", { sh: true });
    // header bar
    ctx.save();
    ctx.globalAlpha *= chat;
    ORB(ctx, left + 80, top + 72, 36, f);
    text(ctx, "星辰超级智能体", left + 136, top + 58, { size: 38, weight: 900, align: "left" });
    ctx.beginPath();
    ctx.arc(left + 146, top + 104, 8, 0, Math.PI * 2);
    ctx.fillStyle = PAL.mint;
    ctx.fill();
    text(ctx, "在线 · 天翼 AI 云电脑", left + 164, top + 104, { size: 24, weight: 500, color: PAL.inkSoft, align: "left" });
    ctx.fillStyle = "rgba(21,32,59,0.08)";
    ctx.fillRect(left + 30, top + 146, right - left - 60, 3);
    ctx.restore();

    // intro: a teaser sticker first, then big orb, name, specs
    ctx.save();
    ctx.globalAlpha *= 1 - chat;
    const teaser = pop(f, l0.f0 - 6, 16) * popOut(f, B.cloud - 4, 8);
    group(ctx, CX, 700, { s: teaser, r: -0.06 }, () => {
      box(ctx, 0, 0, 620, 180, 44, PAL.coral, { sh: true });
      text(ctx, "最好玩的来了！", 0, 4, { size: 70, weight: 900, color: "#fff" });
    });
    sparkle(ctx, f, l0.f0 + 4, CX, 700, 380);
    const ob = pop(f, B.agent - 30, 20);
    if (ob > 0) ORB(ctx, CX, 640, 120 * ob, f);
    const cl = pop(f, B.cloud - 4);
    group(ctx, CX, 420, { s: cl }, () => pill(ctx, "天翼 AI 云电脑", 0, 0, { size: 40, weight: 900, fill: PAL.blue, color: "#fff" }));
    const nm = pop(f, B.agent);
    group(ctx, CX, 840, { s: nm }, () => {
      text(ctx, "星辰超级智能体", 0, 0, { size: 72, weight: 900 });
      text(ctx, "预装 · TeleAgent", 0, 70, { size: 30, weight: 600, color: PAL.inkSoft, fam: fonts.mono });
    });
    ["8 核 CPU", "16 GB 内存", "120 GB 存储"].forEach((s, i) => {
      const p = pop(f, B.cloud + 6 + i * 5, 14);
      group(ctx, CX + (i - 1) * 270, 1040, { s: p }, () => pill(ctx, s, 0, 0, { size: 30, weight: 700, fill: "#EEF3FF", sh: false }));
    });
    ctx.restore();

    // chat: greeting, then the one sentence typed into the input bar and sent as a bubble
    if (chat > 0) {
      const gp = pop(f, l1.f0 - 2, 14);
      group(ctx, left + 40 + 230, 555, { s: gp }, () => {
        box(ctx, 0, 0, 460, 90, 30, "#EEF3FF");
        text(ctx, "嗨！今天想让我做点什么？", 0, 2, { size: 32, weight: 600 });
      });
      const msg = "帮我整理本周数据，生成周报";
      const n = clamp(Math.floor(((f - B.type0) / Math.max(1, B.type1 - B.type0)) * msg.length) + 1, 0, msg.length);
      const sent = f >= B.type1;
      // input bar
      const ib = prog(f, l1.f0, l1.f0 + 10);
      group(ctx, CX, bottom - 80, { a: ib }, () => {
        box(ctx, 0, 0, right - left - 60, 92, 46, "#F5F7FC", { stroke: f >= B.type0 && !sent ? PAL.blue : "rgba(21,32,59,0.12)", lw: 3 });
        const typing = f >= B.type0 && !sent;
        const s = typing ? msg.slice(0, n) : "说一句话，交给智能体…";
        text(ctx, s, -(right - left - 60) / 2 + 36, 2, { size: 34, weight: typing ? 600 : 500, color: typing ? PAL.ink : "#9AA3B5", align: "left" });
        if (typing && f % 20 < 12) {
          const cw = measure(ctx, s, 34, 600);
          ctx.fillStyle = PAL.blue;
          ctx.fillRect(-(right - left - 60) / 2 + 40 + cw, -22, 4, 44);
        }
        ctx.beginPath();
        ctx.arc((right - left - 60) / 2 - 48, 0, 30, 0, Math.PI * 2);
        ctx.fillStyle = typing || (sent && f < B.type1 + 8) ? PAL.blue : "#C9CFDB";
        ctx.fill();
        text(ctx, "↑", (right - left - 60) / 2 - 48, 0, { size: 34, weight: 900, color: "#fff" });
      });
      if (sent) {
        const w = measure(ctx, msg, 38, 600) + 64;
        const bp = pop(f, B.type1, 12);
        group(ctx, right - 40 - w / 2, 680, { s: bp }, () => {
          box(ctx, 0, 0, w, 96, 30, PAL.blue, { sh: true });
          text(ctx, msg, 0, 2, { size: 38, weight: 600, color: "#fff" });
        });
      }
      // agent reply: three steps that tick on the words
      const steps = [
        ["拆任务", "拆成 5 个子任务"],
        ["找工具", "调用 表格分析 · 图表生成"],
        ["出结果", "本周周报.docx 已生成"],
      ];
      const rp = pop(f, B.stepWords[0] - 8, 14);
      if (rp > 0) {
        group(ctx, left + 40 + 380, 930, { s: rp }, () => {
          box(ctx, 0, 0, 760, 380, 36, "#EEF3FF");
          steps.forEach(([a, b], i) => {
            const at = B.stepWords[i];
            const y = -110 + i * 110;
            const rowA = prog(f, at - 6, at + 4);
            ctx.save();
            ctx.globalAlpha *= 0.25 + 0.75 * rowA;
            check(ctx, -310, y, 30, prog(f, at, at + 12, ease.linear), [PAL.mint, PAL.blue, PAL.coral][i]);
            if (f < at) {
              ctx.beginPath();
              ctx.arc(-310, y, 30, 0, Math.PI * 2);
              ctx.strokeStyle = "rgba(21,32,59,0.2)";
              ctx.lineWidth = 4;
              ctx.stroke();
            }
            text(ctx, a, -258, y - 16, { size: 40, weight: 900, align: "left" });
            text(ctx, b, -258, y + 26, { size: 26, weight: 500, color: PAL.inkSoft, align: "left" });
            ctx.restore();
          });
        });
      }
    }
  });

  // skills
  if (f >= B.skills - 2) {
    const base = B.skills;
    const cnt = Math.round(50000 * prog(f, base, B.skillWords[0] + 8, ease.out));
    const cp = pop(f, base, 14);
    group(ctx, CX, 560, { s: cp }, () => {
      const s = cnt.toLocaleString("en-US");
      text(ctx, s, -10, 0, { size: 190, weight: 900, color: PAL.ink, align: "center" });
      const w = measure(ctx, s, 190, 900);
      text(ctx, "+", w / 2 + 6, -10, { size: 150, weight: 900, color: PAL.coral, align: "left" });
    });
    group(ctx, CX, 720, { s: pop(f, base + 6) }, () => pill(ctx, "项技能 · 一句话调用", 0, 0, { size: 36, weight: 900, fill: PAL.yellow }));
    const main = ["标书", "报表", "合同", "代码"];
    const cols = [PAL.blue, PAL.mint, PAL.coral, PAL.violet];
    main.forEach((w, i) => {
      const p = pop(f, B.skillWords[i] - 2, 14);
      group(ctx, CX + (i % 2 ? 180 : -180), 900 + Math.floor(i / 2) * 150, { s: p, r: (i % 2 ? 1 : -1) * 0.05 }, () =>
        pill(ctx, w, 0, 0, { size: 60, weight: 900, fill: cols[i], color: "#fff", padX: 50 }),
      );
    });
    const extra = ["PPT", "翻译", "纪要", "调研", "海报", "预算", "文案", "审计"];
    // side columns, clear of the counter above and the four main chips in the middle
    const spots = [[-420, 830], [420, 830], [-440, 980], [440, 980], [-420, 1130], [420, 1130], [-290, 1250], [290, 1250]];
    extra.forEach((w, i) => {
      const p = pop(f, base + 10 + i * 4, 12);
      group(ctx, CX + spots[i][0], spots[i][1], { s: p * 0.9, r: Math.sin(i) * 0.12 }, () =>
        pill(ctx, w, 0, 0, { size: 30, weight: 700, fill: "#fff" }),
      );
    });
  }
}

// ---------------------------------------------------------------- S6: security and savings
function s6(ctx, f, T, S) {
  const B = T.B;
  const away = prog(f, B.compare - 4, B.compare + 6, ease.in);
  const t1 = pop(f, B.rings - 4) * (1 - away);
  group(ctx, X, 360, { s: t1, a: t1 }, () => {
    const w = measure(ctx, "四层防护", 90, 900);
    marker(ctx, -8, 20, w + 16, 40, "#B6F0DC", prog(f, B.rings, B.rings + 12));
    text(ctx, "四层防护", 0, 0, { size: 90, weight: 900, align: "left" });
  });
  const sh = pop(f, S.from + 4, 20) * (1 - away);
  group(ctx, SHIELD.x, SHIELD.y, { s: sh }, () => {
    ctx.beginPath();
    ctx.moveTo(0, -130);
    ctx.lineTo(105, -85);
    ctx.lineTo(105, 15);
    ctx.bezierCurveTo(105, 85, 55, 125, 0, 150);
    ctx.bezierCurveTo(-55, 125, -105, 85, -105, 15);
    ctx.lineTo(-105, -85);
    ctx.closePath();
    const g = ctx.createLinearGradient(-105, -130, 105, 150);
    g.addColorStop(0, PAL.blue);
    g.addColorStop(1, PAL.violet);
    ctx.fillStyle = g;
    shadow(ctx, true, 40, 16, 0.25);
    ctx.fill();
    shadow(ctx, false);
    check(ctx, 0, 5, 50, prog(f, S.from + 14, S.from + 30, ease.linear), "rgba(255,255,255,0.22)");
  });
  const labels = ["感知", "推理", "执行", "记忆"];
  const cols = [PAL.mint, PAL.yellow, PAL.coral, PAL.blue];
  labels.forEach((l, i) => {
    const ang = [-2.4, -0.75, 0.75, 2.4][i];
    const r = RINGS[3] + 10;
    const p = pop(f, S.from + 14 + i * 6, 14) * (1 - away);
    group(ctx, SHIELD.x + Math.cos(ang) * r, SHIELD.y + Math.sin(ang) * r, { s: p }, () =>
      pill(ctx, l, 0, 0, { size: 38, weight: 900, fill: cols[i], color: i === 1 ? PAL.ink : "#fff" }),
    );
  });
  const bd = pop(f, B.badge - 2, 18) * (1 - away);
  group(ctx, CX, 1280, { s: bd, r: -0.05 }, () => {
    box(ctx, 0, 0, 620, 150, 30, PAL.yellow, { sh: true });
    text(ctx, "国内首批", 0, -26, { size: 56, weight: 900 });
    text(ctx, "通过中国信通院安全测试", 0, 38, { size: 30, weight: 700, color: PAL.ink });
  });

  if (f >= B.compare) {
    const tt = pop(f, B.compare + 4);
    group(ctx, X, 360, { s: tt, a: tt }, () => {
      text(ctx, "同样的活", 0, 0, { size: 80, weight: 900, align: "left" });
      text(ctx, "算力消耗对比", 0, 76, { size: 34, weight: 600, color: PAL.inkSoft, align: "left" });
    });
    const rows = [
      { name: "主流产品", lo: 1, hi: 1, fill: "#C9CFDB", tag: "100%" },
      { name: "星辰超级智能体", lo: 0.5, hi: 0.8, fill: PAL.blue, tag: "50%–80%" },
    ];
    rows.forEach((r, i) => {
      const y = 620 + i * 190;
      const a = prog(f, B.compare + 8 + i * 6, B.compare + 18 + i * 6);
      const g = prog(f, B.compare + 12 + i * 8, B.compare + 40 + i * 8, ease.outQuint);
      group(ctx, 0, 0, { a }, () => {
        text(ctx, r.name, X, y - 50, { size: 38, weight: 900, align: "left" });
        text(ctx, r.tag, W - X, y - 50, { size: 34, weight: 700, color: i ? PAL.blue : PAL.inkSoft, align: "right", fam: fonts.mono });
        const bw = W - 2 * X;
        box(ctx, CX, y + 20, bw, 56, 28, "rgba(21,32,59,0.07)");
        ctx.beginPath();
        ctx.roundRect(X, y - 8, bw * r.lo * g, 56, 28);
        ctx.fillStyle = r.fill;
        ctx.fill();
        if (r.hi > r.lo) {
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(X + bw * r.lo * g - 28, y - 8, bw * (r.hi - r.lo) * g + 28, 56, 28);
          ctx.clip();
          ctx.globalAlpha *= 0.45;
          for (let k = -2; k < 40; k++) {
            ctx.fillStyle = PAL.blue;
            ctx.fillRect(X + bw * r.lo * g - 28 + k * 22, y - 20, 9, 90);
          }
          ctx.restore();
        }
      });
    });
    const sv = pop(f, B.save - 2, 18);
    group(ctx, CX, 1150, { s: sv, r: -0.06 }, () => {
      box(ctx, 0, 0, 640, 190, 40, PAL.coral, { sh: true });
      text(ctx, "又快又省！", 0, -34, { size: 56, weight: 900, color: "#fff" });
      text(ctx, "省下 20%–50%", 0, 44, { size: 48, weight: 900, color: PAL.yellow });
    });
    sparkle(ctx, f, B.save + 10, CX, 1150, 380);
  }
}

// ---------------------------------------------------------------- S7: one million users
function s7(ctx, f, T, S) {
  const B = T.B;
  group(ctx, CX, 350, { s: pop(f, S.from + 6) }, () => pill(ctx, "星辰超级智能体 · 用户", 0, 0, { size: 34, weight: 900 }));
  const land = B.million + 10;
  const v = Math.round(1_000_000 * prog(f, B.users + 4, land, ease.inOut));
  const bounce = f >= land ? 1 + 0.12 * Math.exp(-(f - land) * 0.18) * Math.cos((f - land) * 0.6) : 1;
  group(ctx, CX, 560, { s: pop(f, S.from + 8) * bounce }, () =>
    text(ctx, v.toLocaleString("en-US"), 0, 0, { size: 170, weight: 900, color: f >= land ? PAL.blue : PAL.ink }),
  );
  const tp = pop(f, land, 16);
  group(ctx, 820, 430, { s: tp, r: 0.16 }, () => pill(ctx, "突破！", 0, 0, { size: 52, weight: 900, fill: PAL.coral, color: "#fff", padX: 36 }));
  sparkle(ctx, f, land, CX, 560, 420);
}

// ---------------------------------------------------------------- S8: from selling traffic to selling intelligence
function s8(ctx, f, T, S) {
  const B = T.B;
  const [, l1] = S.lines;
  const out = prog(f, l1.f0 - 8, l1.f0, ease.in);
  const a = pop(f, B.oldWord - 6) * (1 - out);
  group(ctx, X, 600, { s: a, a }, () => {
    text(ctx, "从", 0, 10, { size: 60, weight: 700, color: PAL.inkSoft, align: "left" });
    const w = measure(ctx, "卖流量", 130, 900);
    text(ctx, "卖流量", 80, 0, { size: 130, weight: 900, color: "#9AA3B5", align: "left" });
    const k = prog(f, B.newWord - 8, B.newWord, ease.out);
    ctx.fillStyle = PAL.coral;
    ctx.beginPath();
    ctx.roundRect(70, -8, (w + 20) * k, 18, 9);
    ctx.fill();
  });
  const b = pop(f, B.newWord, 18) * (1 - out);
  group(ctx, X, 830, { s: b, a: b }, () => {
    text(ctx, "到", 0, 20, { size: 60, weight: 700, color: PAL.inkSoft, align: "left" });
    const w = measure(ctx, "卖智能", 170, 900);
    marker(ctx, 76, 44, w + 20, 60, PAL.yellow, prog(f, B.newWord + 6, B.newWord + 18));
    text(ctx, "卖智能", 86, 0, { size: 170, weight: 900, color: PAL.blue, align: "left" });
  });
  sparkle(ctx, f, B.newWord + 8, 560, 830, 360);

  if (f >= B.title - 2) {
    const title = "苏州电信";
    const cw = measure(ctx, title, 170, 900);
    [...title].forEach((ch, i) => {
      const p = pop(f, B.title + i * 3, 16);
      const x = CX - cw / 2 + (cw / 4) * (i + 0.5);
      group(ctx, x, 760, { s: p, r: (i % 2 ? 1 : -1) * 0.04 * (1 - clamp((f - B.title) / 20)) }, () =>
        text(ctx, ch, 0, 0, { size: 170, weight: 900 }),
      );
    });
    const words = [
      ["让", "#fff", PAL.ink],
      ["AI", PAL.blue, "#fff"],
      ["走进", PAL.yellow, PAL.ink],
      ["你的", PAL.mint, "#fff"],
      ["每一天", PAL.coral, "#fff"],
    ];
    let widths = words.map(([w]) => measure(ctx, w, 48, 900) + 48);
    const total = widths.reduce((s, w) => s + w, 0) + 14 * (words.length - 1);
    let x = CX - total / 2;
    words.forEach(([w, fill, color], i) => {
      const p = pop(f, B.everyday - 6 + i * 4, 14);
      const cx = x + widths[i] / 2;
      group(ctx, cx, 960, { s: p, r: (i % 2 ? 1 : -1) * 0.05 }, () => pill(ctx, w, 0, 0, { size: 48, weight: 900, fill, color, padX: 24 }));
      x += widths[i] + 14;
    });
    const src = prog(f, l1.f1 + 10, l1.f1 + 30);
    group(ctx, CX, 1330, { a: src }, () =>
      pill(ctx, "数据来源：科技日报、新浪科技、苏州市人民政府等公开报道", 0, 0, { size: 24, weight: 600, color: PAL.inkSoft, padX: 26 }),
    );
  }
}

export const SCENES = { 1: s1, 2: s2, 3: s3, 4: s4, 5: s5, 6: s6, 7: s7, 8: s8 };

// ---------------------------------------------------------------- HUD + subtitles
const CHAPTERS = { 3: ["01", "算力", PAL.blue], 4: ["02", "连接", PAL.mint], 5: ["03", "智能体", PAL.violet], 6: ["04", "安全", PAL.coral], 7: ["05", "规模", PAL.yellow] };

export function hud(ctx, f, T) {
  const hs = T.scenes.filter((s) => CHAPTERS[s.id]);
  const first = hs[0], last = hs[hs.length - 1];
  const vis = prog(f, first.from, first.from + 14) * (1 - prog(f, last.to - 10, last.to, ease.in));
  if (vis <= 0) return;
  const cur = hs.find((s) => f >= s.from && f < s.to) || (f < first.from ? first : last);
  const [n, zh, col] = CHAPTERS[cur.id];
  group(ctx, 0, 0, { a: vis }, () => {
    // left: brand pill
    box(ctx, 80 + 150, 120, 300, 70, 35, "#fff", { sh: true });
    ctx.beginPath();
    ctx.arc(80 + 40, 120, 12, 0, Math.PI * 2);
    ctx.fillStyle = PAL.blue;
    ctx.fill();
    text(ctx, "苏州电信 · AI", 80 + 64, 121, { size: 30, weight: 900, align: "left" });
    // right: chapter pill with number badge
    const cp = pop(f, cur.from, 14);
    group(ctx, W - 80 - 110, 120, { s: cp }, () => {
      box(ctx, 0, 0, 220, 70, 35, col, { sh: true });
      ctx.beginPath();
      ctx.arc(-72, 0, 24, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
      text(ctx, n, -72, 1, { size: 22, weight: 900, color: col, fam: fonts.mono });
      text(ctx, zh, 20, 1, { size: 32, weight: 900, color: cur.id === 7 ? PAL.ink : "#fff" });
    });
    // progress
    const bw = W - 160;
    box(ctx, W / 2, 192, bw, 10, 5, "rgba(21,32,59,0.08)");
    const p = clamp((f - first.from) / (last.to - first.from));
    const g = ctx.createLinearGradient(80, 0, 80 + bw, 0);
    [PAL.blue, PAL.mint, PAL.violet, PAL.coral, PAL.yellow].forEach((c, i) => g.addColorStop(i / 4, c));
    ctx.beginPath();
    ctx.roundRect(80, 187, bw * p, 10, 5);
    ctx.fillStyle = g;
    ctx.fill();
  });
}

export function subtitles(ctx, f, T) {
  const t = f / FPS;
  const l = T.lines.find((q) => t >= q.start - 0.05 && t <= q.start + q.dur + 0.2);
  if (!l) return;
  const a = Math.round((l.start - 0.05) * FPS), b = Math.round((l.start + l.dur + 0.2) * FPS);
  const o = Math.min(prog(f, a, a + 4, ease.linear), 1 - prog(f, b - 5, b, ease.linear));
  let s = l.text.replace(/[，。；！？—]+$/, "");
  const size = 40;
  // split long lines at the comma nearest the middle
  let rows = [s];
  if (measure(ctx, s, size, 700) > 900) {
    const mid = s.length / 2;
    let best = -1;
    [...s].forEach((ch, i) => {
      if ("，、：；".includes(ch) && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
    });
    const cut = best > 0 ? best + 1 : Math.ceil(mid);
    rows = [s.slice(0, cut), s.slice(cut)];
  }
  const w = Math.max(...rows.map((r) => measure(ctx, r, size, 700))) + 64;
  const h = rows.length * 58 + 26;
  group(ctx, W / 2, 1470, { a: o }, () => {
    box(ctx, 0, 0, w, h, 26, "rgba(21,32,59,0.86)");
    rows.forEach((r, i) => text(ctx, r, 0, (i - (rows.length - 1) / 2) * 58 + 2, { size, weight: 700, color: "#fff" }));
  });
}
