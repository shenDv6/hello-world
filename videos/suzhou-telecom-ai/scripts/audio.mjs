#!/usr/bin/env node
// Builds the music bed and SFX kit for this video as deterministic 16-bit WAVs.
// Reads src/vo.json so the music's pulse starts at the burst and drops out before the finale.
// Usage: node scripts/audio.mjs
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const vo = JSON.parse(fs.readFileSync(path.join(ROOT, "src/vo.json"), "utf8"));
const SR = 44100;
const OUT = path.join(ROOT, "public/audio");
fs.mkdirSync(path.join(OUT, "sfx"), { recursive: true });

let seed = 20260928;
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const mtof = (m) => 440 * 2 ** ((m - 69) / 12);

function writeWav(file, L, R = L, peakTo = 0.89) {
  const n = L.length, buf = Buffer.alloc(44 + n * 4);
  let peak = 1e-9;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const g = peakTo / peak;
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write("WAVE", 8);
  buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
  buf.write("data", 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * g)) * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * g)) * 32767), 46 + i * 4);
  }
  fs.writeFileSync(path.join(OUT, file), buf);
  console.log("wrote", file, (n / SR).toFixed(2) + "s");
}

// ---------------- music bed ----------------
const lines = vo.lines;
const firstOf = (sc) => lines.find((l) => l.scene === sc).start;
const pulseFrom = firstOf(2) + 1.6; // right after the burst
const pulseTo = firstOf(8) - 0.6; // drops out for the thesis
const total = vo.total;

function bed() {
  const n = Math.floor(total * SR), L = new Float32Array(n), R = new Float32Array(n);
  // D minor-ish progression, 8s per chord; darker voicing before the burst
  const chords = [[38, 45, 50, 53, 57], [34, 41, 46, 50, 57], [36, 43, 48, 52, 55], [33, 40, 45, 48, 52]];
  const chordLen = 8 * SR, phases = new Float64Array(64);
  let lpL = 0, lpR = 0, subPh = 0;
  const bpm = 84, beat = 60 / bpm;
  for (let i = 0; i < n; i++) {
    const t = i / SR, ci = Math.floor(i / chordLen), x = (i % chordLen) / chordLen;
    const cur = chords[ci % 4], nxt = chords[(ci + 1) % 4];
    const xf = Math.max(0, (x - 0.85) / 0.15);
    let sl = 0, sr = 0;
    [cur, nxt].forEach((ch, k) => {
      const w = k === 0 ? 1 - xf : xf;
      if (w === 0) return;
      ch.forEach((m, j) => {
        for (let d = 0; d < 2; d++) {
          const idx = k * 20 + j * 2 + d, fr = mtof(m) * (d ? 1.004 : 0.996);
          phases[idx] = (phases[idx] + fr / SR) % 1;
          const s = (phases[idx] * 2 - 1) * w * 0.1;
          if (d) sr += s; else sl += s;
        }
      });
    });
    // filter opens up after the burst (the world "wakes")
    const open = t < pulseFrom ? 0.012 : Math.min(0.05, 0.012 + (t - pulseFrom) * 0.0012);
    const cutoff = open + 0.008 * Math.sin(t * 0.21);
    lpL += cutoff * (sl - lpL); lpR += cutoff * (sr - lpR);
    // low heartbeat pulse between burst and finale, slowly swelling
    let kick = 0;
    if (t >= pulseFrom && t < pulseTo) {
      const tb = (t - pulseFrom) % beat;
      const swell = Math.min(1, (t - pulseFrom) / 20);
      subPh += (48 + 70 * Math.exp(-tb * 30)) / SR;
      kick = Math.sin(2 * Math.PI * subPh) * Math.exp(-tb * 7) * (0.35 + 0.45 * swell);
    }
    const air = rand() * 0.003;
    const env = Math.min(1, t / 2) * Math.min(1, (total - t) / 3);
    L[i] = (lpL * 1.4 + kick + air) * env;
    R[i] = (lpR * 1.4 + kick + air) * env;
  }
  return [L, R];
}

// ---------------- SFX ----------------
function tick() {
  const n = Math.floor(0.06 * SR), a = new Float32Array(n);
  for (let i = 0; i < n; i++) { const t = i / SR; a[i] = Math.sin(2 * Math.PI * 2200 * t) * Math.exp(-t * 160) + rand() * 0.25 * Math.exp(-t * 420); }
  return a;
}
function whoosh() {
  const n = Math.floor(0.7 * SR), a = new Float32Array(n); let lp = 0;
  for (let i = 0; i < n; i++) { const x = i / n; const c = 0.02 + 0.35 * Math.sin(Math.PI * x) ** 2; lp += c * (rand() - lp); a[i] = lp * Math.sin(Math.PI * x) ** 1.5; }
  return a;
}
function hit() {
  const n = Math.floor(1.6 * SR), a = new Float32Array(n); let ph = 0;
  for (let i = 0; i < n; i++) { const t = i / SR; ph += (50 + 110 * Math.exp(-t * 20)) / SR; a[i] = Math.sin(2 * Math.PI * ph) * Math.exp(-t * 2.6) + rand() * 0.2 * Math.exp(-t * 35); }
  return a;
}
function impact() { // bigger: sub drop + noise burst + metallic ring tail
  const n = Math.floor(3.2 * SR), L = new Float32Array(n), R = new Float32Array(n); let ph = 0, lp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    ph += (38 + 140 * Math.exp(-t * 14)) / SR;
    const sub = Math.sin(2 * Math.PI * ph) * Math.exp(-t * 1.4);
    lp += 0.25 * (rand() - lp);
    const crack = lp * Math.exp(-t * 18) * 1.4;
    const ring = [220, 331, 497].reduce((s, f0, k) => s + Math.sin(2 * Math.PI * f0 * t + k) * 0.06 * Math.exp(-t * (1.5 + k)), 0);
    L[i] = sub + crack + ring;
    R[i] = sub + crack * 0.9 + ring * 1.1;
  }
  return [L, R];
}
function riser() { // 2s rising filtered noise + pitch sweep into the impact
  const n = Math.floor(2 * SR), a = new Float32Array(n); let lp = 0, ph = 0;
  for (let i = 0; i < n; i++) {
    const x = i / n;
    const c = 0.01 + 0.4 * x * x;
    lp += c * (rand() - lp);
    ph += (200 + 1400 * x * x) / SR;
    a[i] = (lp * 0.9 + Math.sin(2 * Math.PI * ph) * 0.12) * x ** 2.2;
  }
  return a;
}
function chime() {
  const n = Math.floor(3.5 * SR), a = new Float32Array(n);
  const partials = [[1, 1], [2.76, 0.4], [5.4, 0.2], [8.93, 0.08]], f0 = 587.33;
  for (let i = 0; i < n; i++) { const t = i / SR; a[i] = partials.reduce((s, [r, g]) => s + g * Math.sin(2 * Math.PI * f0 * r * t) * Math.exp(-t * (1 + r * 0.5)), 0); }
  return a;
}

writeWav("bgm.wav", ...bed());
writeWav("sfx/tick.wav", tick());
writeWav("sfx/whoosh.wav", whoosh());
writeWav("sfx/hit.wav", hit());
writeWav("sfx/impact.wav", ...impact());
writeWav("sfx/riser.wav", riser());
writeWav("sfx/chime.wav", chime());
