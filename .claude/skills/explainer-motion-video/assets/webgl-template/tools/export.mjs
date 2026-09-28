#!/usr/bin/env node
// Drives web/index.html in headless Chrome (puppeteer-core), receives frames and the
// soundtrack over a WebSocket, and encodes with ffmpeg (libx264 + AAC).
//
//   node tools/export.mjs --stills 30,400,900     # PNG check frames → out/still_<f>.png
//   node tools/export.mjs --frames 0-300          # partial silent render → out/preview.mp4
//   node tools/export.mjs                         # full: audio + frames + mux → out/final.mp4
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { WebSocketServer } from "ws";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT = path.join(ROOT, "out");
fs.mkdirSync(OUT, { recursive: true });
const HTTP_PORT = 8123, WS_PORT = 8124;
const CHROME = process.env.CHROME || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FFMPEG = process.env.FFMPEG || execFileSync("python3", ["-c", "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"]).toString().trim();

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i < 0 ? null : args[i + 1] ?? true;
};

// ---- static server for the page, fonts and VO files ----
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".woff2": "font/woff2", ".woff": "font/woff", ".wav": "audio/wav" };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { "content-type": MIME[path.extname(p)] || "application/octet-stream" });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(HTTP_PORT, r));
const wss = new WebSocketServer({ port: WS_PORT, maxPayload: 256 * 1024 * 1024 });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  protocolTimeout: 0,
  args: ["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--disable-dev-shm-usage"],
});
const page = await browser.newPage();
page.on("console", (m) => (m.type() === "error" || m.type() === "warn") && console.log("[page]", m.text()));
page.on("pageerror", (e) => console.log("[pageerror]", e.message));
await page.goto(`http://localhost:${HTTP_PORT}/web/index.html`, { waitUntil: "load" });
await page.waitForFunction(() => window.__video);
const info = await page.evaluate(() => window.__video.init());
console.log(`total ${info.total} frames @${info.fps}fps, float targets: ${info.floatOk}`);
fs.writeFileSync(path.join(OUT, "timeline.json"), JSON.stringify(info, null, 1));

const nextConnection = () => new Promise((r) => wss.once("connection", r));

async function stills(list) {
  for (const f of list) {
    const url = await page.evaluate((f) => window.__video.still(f), f);
    fs.writeFileSync(path.join(OUT, `still_${f}.png`), Buffer.from(url.split(",")[1], "base64"));
    console.log("still", f);
  }
}

async function frames(a, b, file) {
  const ff = spawn(FFMPEG, [
    "-v", "error", "-y",
    "-f", "image2pipe", "-framerate", String(info.fps), "-c:v", "mjpeg", "-i", "-",
    "-vf", "scale=in_range=full:out_range=tv:in_color_matrix=bt601:out_color_matrix=bt709",
    "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
    "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
    "-movflags", "+faststart", file,
  ], { stdio: ["pipe", "inherit", "inherit"] });
  const conn = nextConnection();
  const run = page.evaluate((u, a, b) => window.__video.stream(u, a, b), `ws://localhost:${WS_PORT}`, a, b);
  const ws = await conn;
  let n = 0;
  const t0 = Date.now();
  ws.on("message", (data) => {
    const ok = ff.stdin.write(Buffer.from(data));
    const ack = () => ws.send("ok");
    ok ? ack() : ff.stdin.once("drain", ack);
    if (++n % 150 === 0) console.log(`frame ${a + n}/${b}  ${((Date.now() - t0) / n).toFixed(0)} ms/frame`);
  });
  await run;
  ff.stdin.end();
  await new Promise((r) => ff.on("close", r));
  console.log(`encoded ${n} frames → ${path.relative(ROOT, file)}`);
}

async function audio(file) {
  const conn = nextConnection();
  const run = page.evaluate((u) => window.__video.audio(u), `ws://localhost:${WS_PORT}`);
  const ws = await conn;
  await new Promise((r) =>
    ws.once("message", (data) => {
      fs.writeFileSync(file, Buffer.from(data));
      ws.send("ok");
      r();
    }),
  );
  await run;
  const cues = await page.evaluate(() => window.__cues);
  fs.writeFileSync(path.join(OUT, "cues.json"), JSON.stringify(cues, null, 1));
  console.log(`audio → ${path.relative(ROOT, file)} (${cues.length} cues)`);
}

try {
  if (opt("stills")) await stills(String(opt("stills")).split(",").map(Number));
  else if (opt("frames")) {
    const [a, b] = String(opt("frames")).split("-").map(Number);
    await frames(a, b, path.join(OUT, opt("out") || "preview.mp4"));
  } else if (opt("audio")) await audio(path.join(OUT, "audio.wav"));
  else {
    await audio(path.join(OUT, "audio.wav"));
    await frames(0, info.total, path.join(OUT, "video_silent.mp4"));
    execFileSync(FFMPEG, [
      "-v", "error", "-y", "-i", path.join(OUT, "video_silent.mp4"), "-i", path.join(OUT, "audio.wav"),
      "-c:v", "copy", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", "48000", "-c:a", "aac", "-b:a", "256k",
      "-shortest", "-movflags", "+faststart", path.join(OUT, "final.mp4"),
    ]);
    console.log("muxed → out/final.mp4");
  }
} finally {
  await browser.close();
  wss.close();
  server.close();
}
