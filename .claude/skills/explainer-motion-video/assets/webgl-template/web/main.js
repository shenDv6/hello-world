// Page entry: loads fonts + timeline, then exposes deterministic frame and audio renderers
// for the exporter (tools/export.mjs) to drive.
import { createRenderer } from "./gl.js";
import { N, buildKeys, computeParticles } from "./particles.js";
import { SCENES, hud, subtitles } from "./scenes.js";
import { loadTimeline } from "./timeline.js";
import { FPS, H, PAL, W, clamp, ease, hexToRgb, lerp, prog, rnd } from "./util.js";
import { renderAudio } from "./audio.js";

const pastel = (hex, k = 0.55) => hexToRgb(hex).map((v) => lerp(v, 1, k));
// Background blob palettes per scene; the page colour shifts with each chapter.
const MOODS = {
  1: [PAL.yellow, PAL.coral, PAL.yellow, PAL.mint, PAL.coral, PAL.yellow],
  2: [PAL.blue, PAL.violet, PAL.yellow, PAL.blue, PAL.coral, PAL.mint],
  3: [PAL.blue, PAL.mint, PAL.blue, PAL.violet, PAL.yellow, PAL.blue],
  4: [PAL.mint, PAL.yellow, PAL.mint, PAL.blue, PAL.mint, PAL.coral],
  5: [PAL.violet, PAL.blue, PAL.coral, PAL.violet, PAL.yellow, PAL.blue],
  6: [PAL.mint, PAL.blue, PAL.mint, PAL.yellow, PAL.blue, PAL.violet],
  7: [PAL.coral, PAL.yellow, PAL.violet, PAL.coral, PAL.yellow, PAL.mint],
  8: [PAL.yellow, PAL.blue, PAL.coral, PAL.mint, PAL.violet, PAL.yellow],
};

let T, keys, R, ui, out, octx;

async function init() {
  const texts = [
    "说起电信，你第一个想到的是…SIM卡一张卡宽带一根网线30G每月流量今天，苏州电信要来点不一样的！×AI",
    "太湖·吴江长三角算力调度中心中国电信承建东数西算枢纽每秒0123456789亿亿次总算力>5000PFLOPS",
    "2023工信部国家级5G工厂江苏/97苏州电信承建每一条产线都在线",
    "星辰超级智能体在线天翼AI云电脑预装TeleAgent8核CPU16GB内存120GB存储帮我整理本周数据，生成周报拆任务成5个子找工具调用表格分析图表生成出结果本周周报.docx已",
    "50,000+项技能一句话标书报表合同代码PPT翻译纪要调研海报预算文案审计",
    "四层防护感知推理执行记忆国内首批通过中国信通院安全测试同样的活算力消耗对比主流产品100%50%–80%又快省下20%",
    "用户1,000,000突破！从卖流量到智能苏州让AI走进你的每一天数据来源：科技日报、新浪人民政府等公开报道·01020304058算力连接安全规模",
  ];
  T = await loadTimeline();
  const all = texts.join("") + T.lines.map((l) => l.text).join("");
  const fams = ["'Noto Sans SC Variable'", "'ZCOOL KuaiLe'", "'JetBrains Mono Variable'"];
  await Promise.all(fams.flatMap((fam) => ["500", "700", "900"].map((w) => document.fonts.load(`${w} 40px ${fam}`, all))));
  await document.fonts.load(`900 820px 'ZCOOL KuaiLe'`, "?");
  await document.fonts.load(`900 640px 'Noto Sans SC Variable'`, "AI100万");

  keys = buildKeys(T);
  const glc = document.getElementById("gl");
  R = createRenderer(glc, N);
  ui = document.getElementById("ui");
  ui.width = W;
  ui.height = H;
  out = document.getElementById("out");
  out.width = W;
  out.height = H;
  octx = out.getContext("2d");
  return { total: T.total, fps: FPS, floatOk: R.floatOk, B: T.B, scenes: T.scenes.map((s) => ({ id: s.id, from: s.from, to: s.to })) };
}

function blobsFor(f) {
  const cur = T.scenes.find((s) => f >= s.from && f < s.to) || T.scenes[T.scenes.length - 1];
  const prev = T.scenes[Math.max(0, T.scenes.indexOf(cur) - 1)];
  const k = ease.inOut(clamp((f - cur.from) / 24));
  const t = f / FPS;
  return MOODS[cur.id].map((c, i) => {
    const a = pastel(MOODS[prev.id][i]);
    const b = pastel(c);
    return {
      x: 0.15 + 0.7 * rnd(i, 11) + Math.sin(t * 0.35 + i * 1.7) * 0.12,
      y: 0.1 + 0.8 * rnd(i, 12) + Math.cos(t * 0.3 + i * 2.1) * 0.08,
      r: 0.22 + 0.14 * rnd(i, 13),
      s: 0.75,
      c: a.map((v, j) => lerp(v, b[j], k)),
    };
  });
}

function renderFrame(f) {
  const B = T.B;
  const flash = Math.max(0, 1 - (f - B.drop) / 10) * (f >= B.drop ? 0.55 : 0) + Math.max(0, 1 - (f - B.million - 10) / 10) * (f >= B.million + 10 ? 0.35 : 0);
  const data = computeParticles(keys, f);
  R.render({
    time: f / FPS,
    base: hexToRgb(PAL.bg),
    blobs: blobsFor(f),
    grid: 1,
    data,
    count: N,
    glow: 0.85 + (f >= B.drop && f < B.drop + 20 ? 0.8 * (1 - (f - B.drop) / 20) : 0),
    flash,
  });

  const ctx = ui.getContext("2d");
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, H);
  // camera shake on the two big hits
  const shake = (hit, amp) => (f >= hit && f < hit + 10 ? amp * (1 - (f - hit) / 10) : 0);
  const amp = shake(B.drop, 16) + shake(B.million + 10, 10);
  if (amp) ctx.translate((rnd(f, 21) - 0.5) * amp * 2, (rnd(f, 22) - 0.5) * amp * 2);
  const S = T.scenes.find((s) => f >= s.from && f < s.to);
  if (S) SCENES[S.id](ctx, f, T, S);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  hud(ctx, f, T);
  subtitles(ctx, f, T);

  octx.drawImage(document.getElementById("gl"), 0, 0);
  octx.drawImage(ui, 0, 0);
}

// Streams frames [a, b) to the exporter over a WebSocket as JPEG, waiting for an ack per frame.
async function stream(url, a, b, quality = 0.95) {
  const ws = new WebSocket(url);
  ws.binaryType = "arraybuffer";
  await new Promise((r) => (ws.onopen = r));
  let ack;
  ws.onmessage = () => ack && ack();
  for (let f = a; f < b; f++) {
    renderFrame(f);
    const blob = await new Promise((r) => out.toBlob(r, "image/jpeg", quality));
    const got = new Promise((r) => (ack = r));
    ws.send(await blob.arrayBuffer());
    await got;
  }
  ws.close();
}

async function still(f) {
  renderFrame(f);
  return out.toDataURL("image/png");
}

async function audio(url) {
  const wav = await renderAudio(T);
  const ws = new WebSocket(url);
  ws.binaryType = "arraybuffer";
  await new Promise((r) => (ws.onopen = r));
  const done = new Promise((r) => (ws.onmessage = r));
  ws.send(wav);
  await done;
  ws.close();
}

window.__video = { init, renderFrame, stream, still, audio };
