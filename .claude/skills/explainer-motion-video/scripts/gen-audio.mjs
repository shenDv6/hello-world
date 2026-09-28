#!/usr/bin/env node
// Synthesizes a deterministic ambient music bed and a small SFX kit as 16-bit WAVs,
// so a video never ships silent when no audio assets are available.
// Usage: node gen-audio.mjs <outDir> [durationSeconds=60] [mood=cool|warm]
import fs from "node:fs";
import path from "node:path";

const [, , outDir = "public/audio", durArg = "60", mood = "cool"] = process.argv;
const SR = 44100;
fs.mkdirSync(outDir, { recursive: true });

let seed = 1234567;
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const mtof = (m) => 440 * 2 ** ((m - 69) / 12);

function writeWav(file, L, R = L) {
  const n = L.length, buf = Buffer.alloc(44 + n * 4);
  let peak = 1e-9;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const g = 0.89 / peak; // normalize to about -1 dBFS
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write("WAVE", 8);
  buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
  buf.write("data", 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * g)) * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * g)) * 32767), 46 + i * 4);
  }
  fs.writeFileSync(path.join(outDir, file), buf);
  console.log("wrote", path.join(outDir, file), (n / SR).toFixed(2) + "s");
}

// Ambient pad: detuned saws through a one-pole low-pass, slow chord changes, soft noise air.
function pad(seconds) {
  const n = Math.floor(seconds * SR), L = new Float32Array(n), R = new Float32Array(n);
  const chords = mood === "warm"
    ? [[45, 52, 57, 60, 64], [41, 48, 53, 57, 64], [43, 50, 55, 59, 62], [40, 47, 52, 55, 59]]
    : [[38, 45, 50, 53, 57], [34, 41, 46, 50, 57], [36, 43, 48, 52, 55], [33, 40, 45, 48, 52]];
  const chordLen = 8 * SR, phases = new Float64Array(40);
  let lpL = 0, lpR = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, ci = Math.floor(i / chordLen), x = (i % chordLen) / chordLen;
    const cur = chords[ci % chords.length], nxt = chords[(ci + 1) % chords.length];
    const xf = Math.max(0, (x - 0.85) / 0.15); // crossfade into the next chord
    let sl = 0, sr = 0;
    [cur, nxt].forEach((ch, k) => {
      const w = k === 0 ? 1 - xf : xf;
      if (w === 0) return;
      ch.forEach((m, j) => {
        for (let d = 0; d < 2; d++) {
          const idx = k * 20 + j * 2 + d, f = mtof(m) * (d ? 1.004 : 0.996);
          phases[idx] = (phases[idx] + f / SR) % 1;
          const s = (phases[idx] * 2 - 1) * w * 0.12;
          if (d) sr += s; else sl += s;
        }
      });
    });
    const cutoff = 0.02 + 0.015 * Math.sin(t * 0.21);
    lpL += cutoff * (sl - lpL); lpR += cutoff * (sr - lpR);
    const air = rand() * 0.004;
    const env = Math.min(1, t / 3) * Math.min(1, (seconds - t) / 3);
    L[i] = (lpL + air) * env; R[i] = (lpR + air) * env;
  }
  return [L, R];
}

function tick() { // UI click for counters and snaps
  const n = Math.floor(0.05 * SR), a = new Float32Array(n);
  for (let i = 0; i < n; i++) { const t = i / SR; a[i] = Math.sin(2 * Math.PI * 2400 * t) * Math.exp(-t * 180) + rand() * 0.3 * Math.exp(-t * 400); }
  return a;
}
function whoosh() { // filtered noise swell for transitions
  const n = Math.floor(0.6 * SR), a = new Float32Array(n); let lp = 0;
  for (let i = 0; i < n; i++) { const x = i / n; const c = 0.02 + 0.3 * Math.sin(Math.PI * x) ** 2; lp += c * (rand() - lp); a[i] = lp * Math.sin(Math.PI * x) ** 1.5; }
  return a;
}
function hit() { // low boom for reveals / climaxes
  const n = Math.floor(1.8 * SR), a = new Float32Array(n); let ph = 0;
  for (let i = 0; i < n; i++) { const t = i / SR; ph += (45 + 90 * Math.exp(-t * 18)) / SR; a[i] = Math.sin(2 * Math.PI * ph) * Math.exp(-t * 2.2) + rand() * 0.15 * Math.exp(-t * 30); }
  return a;
}
function chime() { // soft bell for the emotional turn
  const n = Math.floor(3 * SR), a = new Float32Array(n);
  const partials = [[1, 1], [2.76, 0.4], [5.4, 0.2], [8.93, 0.08]], f0 = mood === "warm" ? 660 : 880;
  for (let i = 0; i < n; i++) { const t = i / SR; a[i] = partials.reduce((s, [r, g]) => s + g * Math.sin(2 * Math.PI * f0 * r * t) * Math.exp(-t * (1.2 + r * 0.6)), 0); }
  return a;
}

writeWav("bgm.wav", ...pad(Number(durArg)));
writeWav("tick.wav", tick());
writeWav("whoosh.wav", whoosh());
writeWav("hit.wav", hit());
writeWav("chime.wav", chime());
