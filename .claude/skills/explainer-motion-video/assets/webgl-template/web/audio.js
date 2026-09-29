// Whole soundtrack rendered offline with Web Audio: a bright 120 BPM groove, SFX on every
// visual beat, the voice-over, reverb, ducking and a master compressor. Returns a WAV buffer.
import { FPS } from "./util.js";

const SR = 48000;
const BPM = 120;
const BEAT = 60 / BPM;
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// I–V–vi–IV in C, one chord per bar
const CHORDS = [
  { root: 36, stab: [60, 64, 67, 72], arp: [72, 76, 79, 84] },
  { root: 43, stab: [59, 62, 67, 71], arp: [71, 74, 79, 83] },
  { root: 45, stab: [57, 60, 64, 69], arp: [69, 72, 76, 81] },
  { root: 41, stab: [57, 60, 65, 69], arp: [69, 72, 77, 81] },
];

export async function renderAudio(T) {
  const dur = T.total / FPS;
  const ctx = new OfflineAudioContext(2, Math.ceil(dur * SR), SR);
  const B = T.B;
  const sec = (frame) => frame / FPS;

  // ---------- buses ----------
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.knee.value = 8;
  comp.ratio.value = 3.5;
  comp.attack.value = 0.004;
  comp.release.value = 0.18;
  const masterGain = gain(0.9);
  comp.connect(masterGain).connect(ctx.destination);

  const reverb = ctx.createConvolver();
  reverb.buffer = impulse(2.6, 2.8);
  const revRet = gain(0.3);
  reverb.connect(revRet).connect(comp);

  const delay = ctx.createDelay(2);
  delay.delayTime.value = BEAT * 0.75;
  const fb = gain(0.32);
  const delayRet = gain(0.35);
  delay.connect(fb).connect(delay);
  delay.connect(delayRet).connect(comp);

  const music = gain(0.85);
  const duck = gain(1);
  music.connect(duck).connect(comp);
  duck.connect(send(0.18, reverb));
  const sfx = gain(0.8);
  sfx.connect(comp);
  sfx.connect(send(0.22, reverb));
  const voice = gain(1.25);
  voice.connect(comp);
  voice.connect(send(0.04, reverb));

  function gain(v) {
    const g = ctx.createGain();
    g.gain.value = v;
    return g;
  }
  function send(v, dest) {
    const g = gain(v);
    g.connect(dest);
    return g;
  }
  function impulse(seconds, decay) {
    const n = Math.floor(seconds * SR);
    const b = ctx.createBuffer(2, n, SR);
    let seed = 7;
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < n; i++) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        d[i] = ((seed / 4294967296) * 2 - 1) * Math.pow(1 - i / n, decay);
      }
    }
    return b;
  }
  const noiseBuf = (() => {
    const b = ctx.createBuffer(1, SR * 2, SR);
    const d = b.getChannelData(0);
    let seed = 99;
    for (let i = 0; i < d.length; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      d[i] = (seed / 4294967296) * 2 - 1;
    }
    return b;
  })();
  function noise(t, len, out) {
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    s.connect(out);
    s.start(t, (t * 7.3) % 1, len + 0.05);
    return s;
  }
  function env(g, t, a, peak, d, sustain = 0.0001) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(sustain, 0.0001), t + a + d);
  }
  function osc(type, freq, t, len, out, detune = 0) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.detune.value = detune;
    o.connect(out);
    o.start(t);
    o.stop(t + len + 0.05);
    return o;
  }

  // ---------- instruments ----------
  function kick(t, out = music, amt = 1) {
    const g = gain(0);
    g.connect(out);
    env(g, t, 0.002, 0.95 * amt, 0.38);
    const o = osc("sine", 150, t, 0.45, g);
    o.frequency.setValueAtTime(160, t);
    o.frequency.exponentialRampToValueAtTime(46, t + 0.12);
  }
  function clap(t) {
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1300;
    bp.Q.value = 0.9;
    const g = gain(0);
    bp.connect(g).connect(music);
    g.connect(send(0.25, reverb));
    [0, 0.012, 0.024].forEach((o) => {
      g.gain.setValueAtTime(0.5, t + o);
      g.gain.exponentialRampToValueAtTime(0.05, t + o + 0.011);
    });
    g.gain.setValueAtTime(0.45, t + 0.036);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    noise(t, 0.25, bp);
  }
  function hat(t, open = false, amt = 1) {
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 7500;
    const g = gain(0);
    hp.connect(g).connect(music);
    env(g, t, 0.001, 0.2 * amt, open ? 0.22 : 0.045);
    noise(t, open ? 0.3 : 0.08, hp);
  }
  function bass(t, m, len = BEAT * 0.45) {
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.Q.value = 6;
    lp.frequency.setValueAtTime(1400, t);
    lp.frequency.exponentialRampToValueAtTime(260, t + len);
    const g = gain(0);
    lp.connect(g).connect(music);
    env(g, t, 0.004, 0.34, len);
    osc("sawtooth", mtof(m), t, len, lp);
    osc("square", mtof(m - 12), t, len, lp);
  }
  function stab(t, notes, amt = 1) {
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 2600;
    const g = gain(0);
    lp.connect(g).connect(music);
    g.connect(send(0.3, reverb));
    env(g, t, 0.004, 0.07 * amt, 0.22);
    notes.forEach((m) => [-8, 8].forEach((d) => osc("sawtooth", mtof(m), t, 0.3, lp, d)));
  }
  function pluck(t, m, amt = 1) {
    const g = gain(0);
    g.connect(music);
    g.connect(send(0.5, delay));
    env(g, t, 0.002, 0.075 * amt, 0.16);
    osc("triangle", mtof(m), t, 0.2, g);
    const sq = gain(0.3);
    sq.connect(g);
    osc("square", mtof(m), t, 0.2, sq, 5);
  }
  function pad(t, notes, len, amt = 1) {
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 1500;
    const g = gain(0);
    lp.connect(g).connect(music);
    g.connect(send(0.6, reverb));
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.04 * amt, t + 0.4);
    g.gain.setValueAtTime(0.04 * amt, t + len - 0.3);
    g.gain.linearRampToValueAtTime(0.0001, t + len + 0.4);
    notes.forEach((m) => [-6, 6].forEach((d) => osc("triangle", mtof(m - 12), t, len + 0.5, lp, d)));
  }

  // ---------- SFX ----------
  function pop(t, pitch = 1) {
    const g = gain(0);
    g.connect(sfx);
    env(g, t, 0.002, 0.35, 0.09);
    const o = osc("sine", 500 * pitch, t, 0.12, g);
    o.frequency.setValueAtTime(420 * pitch, t);
    o.frequency.exponentialRampToValueAtTime(1150 * pitch, t + 0.06);
  }
  function tick(t, pitch = 1, amt = 1) {
    const g = gain(0);
    g.connect(sfx);
    env(g, t, 0.001, 0.14 * amt, 0.035);
    osc("sine", 2000 * pitch, t, 0.05, g);
  }
  function ding(t, m) {
    const g = gain(0);
    g.connect(sfx);
    env(g, t, 0.002, 0.18, 0.7);
    osc("sine", mtof(m), t, 0.8, g);
    const hi = gain(0.2);
    hi.connect(g);
    osc("sine", mtof(m) * 2.76, t, 0.5, hi);
  }
  function sparkle(t) {
    [84, 88, 91, 96, 100].forEach((m, i) => {
      const g = gain(0);
      g.connect(sfx);
      g.connect(send(0.5, delay));
      env(g, t + i * 0.045, 0.002, 0.07, 0.45);
      osc("sine", mtof(m), t + i * 0.045, 0.5, g);
    });
  }
  function whoosh(t, len = 0.55) {
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(300, t);
    bp.frequency.exponentialRampToValueAtTime(3200, t + len * 0.6);
    bp.frequency.exponentialRampToValueAtTime(600, t + len);
    const g = gain(0);
    bp.connect(g).connect(sfx);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + len * 0.55);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    noise(t, len, bp);
  }
  function riser(t0, t1) {
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 2;
    bp.frequency.setValueAtTime(400, t0);
    bp.frequency.exponentialRampToValueAtTime(7000, t1);
    const g = gain(0);
    bp.connect(g).connect(sfx);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.32, t1);
    g.gain.setValueAtTime(0.0001, t1 + 0.01);
    noise(t0, t1 - t0 + 0.05, bp);
    const og = gain(0);
    og.connect(sfx);
    og.gain.setValueAtTime(0.0001, t0);
    og.gain.exponentialRampToValueAtTime(0.05, t1);
    og.gain.setValueAtTime(0.0001, t1 + 0.01);
    const o = osc("sawtooth", 200, t0, t1 - t0, og);
    o.frequency.setValueAtTime(200, t0);
    o.frequency.exponentialRampToValueAtTime(1600, t1);
  }
  function impact(t, amt = 1) {
    kick(t, sfx, 1.2 * amt);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 900;
    const g = gain(0);
    lp.connect(g).connect(sfx);
    env(g, t, 0.002, 0.5 * amt, 0.5);
    noise(t, 0.6, lp);
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 5000;
    const c = gain(0);
    hp.connect(c).connect(sfx);
    c.connect(send(0.4, reverb));
    env(c, t, 0.002, 0.22 * amt, 1.6);
    noise(t, 1.8, hp);
  }

  // ---------- arrangement ----------
  const drop = sec(B.drop);
  const s8 = sec(T.scene(8).from);
  const title = sec(B.title);
  const bar = BEAT * 4;
  const chordAt = (t) => CHORDS[((Math.floor((t - drop) / bar) % 4) + 4) % 4];

  // intro: pad + gentle plucks, hats creeping in during the build
  for (let t = drop - bar * Math.ceil(drop / bar); t < drop; t += BEAT / 2) {
    if (t < 0) continue;
    const c = chordAt(t);
    const step = Math.round((t - drop) / (BEAT / 2));
    if (((step % 8) + 8) % 8 === 0) pad(t, c.stab, bar, 0.8);
    pluck(t, c.arp[((step % 4) + 4) % 4], 0.7);
    if (t > drop - bar * 2) hat(t + BEAT / 4, false, 0.6);
  }
  // snare-roll build into the drop
  for (let k = 0; k < 16; k++) clap(drop - BEAT * 2 + k * (BEAT / 8));

  // main groove from the drop to the finale break, then again from the title
  const groove = (from, to) => {
    for (let t = from; t < to - 0.01; t += BEAT / 4) {
      const step = Math.round((t - drop) / (BEAT / 4));
      const s16 = ((step % 16) + 16) % 16;
      const c = chordAt(t);
      if (s16 % 4 === 0) kick(t);
      if (s16 === 4 || s16 === 12) clap(t);
      if (s16 % 4 === 2) hat(t, s16 === 14);
      else hat(t, false, 0.35);
      if (s16 % 2 === 0) bass(t, c.root + (s16 === 6 || s16 === 14 ? 12 : 0));
      if (s16 === 2 || s16 === 6 || s16 === 10 || s16 === 14) stab(t, c.stab);
      pluck(t, c.arp[[0, 1, 2, 3, 2, 1, 3, 2][s16 % 8]], 0.8);
      if (s16 === 0) pad(t, c.stab, bar, 0.7);
    }
  };
  groove(drop, s8);
  // finale break: pad + plucks, riser into the title
  for (let t = s8; t < title; t += BEAT / 2) {
    const c = chordAt(t);
    const step = Math.round((t - drop) / (BEAT / 2));
    if (((step % 8) + 8) % 8 === 0) pad(t, c.stab, bar, 1);
    pluck(t, c.arp[((step % 4) + 4) % 4], 0.8);
  }
  riser(title - 1.6, title);
  groove(title, dur - 1.5);
  pad(dur - 1.6, CHORDS[0].stab, 1.4, 1.2);

  // ---------- SFX on the visual beats ----------
  const cues = [];
  const at = (frame, fn, label, main = false) => {
    const t = sec(frame);
    if (t < 0 || t > dur) return;
    fn(t);
    cues.push({ t, label, main });
  };
  at(B.q - 8, (t) => whoosh(t), "question");
  [B.card1, B.card2, B.card3].forEach((f, i) => at(f, (t) => pop(t, 1 + i * 0.25), "card"));
  riser(sec(B.drop) - 2, sec(B.drop));
  at(B.drop, (t) => impact(t), "drop", true);
  at(B.drop + 16, (t) => sparkle(t), "stars");
  T.scenes.slice(2).forEach((s) => at(s.from - 6, (t) => whoosh(t), `scene${s.id}`));
  at(B.wujiang - 4, (t) => pop(t, 1), "pin");
  at(B.center - 4, (t) => pop(t, 1.2), "center");
  for (let f = B.num; f < B.numLand; f += 3) at(f, (t) => tick(t, 1 + (f - B.num) / 60), "count");
  at(B.numLand, (t) => impact(t, 0.7), "500", true);
  at(B.numLand, (t) => sparkle(t), "500-sparkle");
  const per = (B.hexEnd - B.hexStart) / 23;
  for (let i = 0; i < 23; i++) at(Math.round(B.hexStart + i * per), (t) => tick(t, 0.8 + i * 0.03, 1.6), "hex");
  at(B.hexEnd, (t) => sparkle(t), "23", true);
  at(B.lines + 4, (t) => pop(t, 1.3), "lines");
  at(T.L(5, 0).f0 - 6, (t) => pop(t, 0.9), "teaser");
  at(T.L(5, 0).f0 + 4, (t) => sparkle(t), "teaser-sparkle");
  at(B.cloud - 4, (t) => pop(t, 1), "cloud");
  at(B.agent, (t) => pop(t, 1.4), "agent");
  for (let f = B.type0; f < B.type1; f += 3) at(f, (t) => tick(t, 1.4, 0.6), "type");
  at(B.type1, (t) => pop(t, 1.6), "send");
  B.stepWords.forEach((f, i) => at(f, (t) => ding(t, 79 + i * 4), "step", true));
  at(B.skills, (t) => impact(t, 0.5), "skills");
  B.skillWords.forEach((f, i) => at(f - 2, (t) => pop(t, 1 + i * 0.15), "skill"));
  for (let i = 0; i < 4; i++) at(T.scene(6).from + 14 + i * 6, (t) => pop(t, 0.9 + i * 0.15), "ring");
  at(B.badge - 2, (t) => impact(t, 0.6), "badge", true);
  at(B.save - 2, (t) => pop(t, 1.5), "save");
  at(B.save + 10, (t) => sparkle(t), "save-sparkle");
  riser(sec(B.million + 10) - 2, sec(B.million + 10));
  for (let f = B.users + 4; f < B.million + 10; f += 2) at(f, (t) => tick(t, 1 + (f - B.users) / 90, 0.6), "count");
  at(B.million + 10, (t) => impact(t), "million", true);
  at(B.million + 10, (t) => sparkle(t), "million-sparkle");
  at(B.newWord - 8, (t) => whoosh(t, 0.3), "strike");
  at(B.newWord, (t) => pop(t, 1.2), "new");
  at(B.title, (t) => impact(t), "title", true);
  at(B.title + 4, (t) => sparkle(t), "title-sparkle");
  for (let i = 0; i < 5; i++) at(B.everyday - 6 + i * 4, (t) => pop(t, 1 + i * 0.12), "word");

  // ---------- voice-over + ducking ----------
  const g = duck.gain;
  g.setValueAtTime(1, 0);
  for (const l of T.lines) {
    const buf = await ctx.decodeAudioData(await (await fetch(`/${l.file}`)).arrayBuffer());
    const s = ctx.createBufferSource();
    s.buffer = buf;
    s.connect(voice);
    s.start(l.start);
    g.setTargetAtTime(0.4, Math.max(0, l.start - 0.12), 0.04);
    g.setTargetAtTime(1, l.start + l.dur + 0.05, 0.12);
  }
  // fade out
  masterGain.gain.setValueAtTime(0.9, dur - 1.8);
  masterGain.gain.linearRampToValueAtTime(0.0001, dur);

  const out = await ctx.startRendering();
  window.__cues = cues;
  return toWav(out);
}

function toWav(buf) {
  const ch = buf.numberOfChannels, n = buf.length;
  const data = new DataView(new ArrayBuffer(44 + n * ch * 2));
  const w = (o, s) => [...s].forEach((c, i) => data.setUint8(o + i, c.charCodeAt(0)));
  w(0, "RIFF");
  data.setUint32(4, 36 + n * ch * 2, true);
  w(8, "WAVE");
  w(12, "fmt ");
  data.setUint32(16, 16, true);
  data.setUint16(20, 1, true);
  data.setUint16(22, ch, true);
  data.setUint32(24, buf.sampleRate, true);
  data.setUint32(28, buf.sampleRate * ch * 2, true);
  data.setUint16(32, ch * 2, true);
  data.setUint16(34, 16, true);
  w(36, "data");
  data.setUint32(40, n * ch * 2, true);
  const chans = Array.from({ length: ch }, (_, c) => buf.getChannelData(c));
  let o = 44;
  for (let i = 0; i < n; i++)
    for (let c = 0; c < ch; c++) {
      const v = Math.max(-1, Math.min(1, chans[c][i]));
      data.setInt16(o, v < 0 ? v * 32768 : v * 32767, true);
      o += 2;
    }
  return data.buffer;
}
