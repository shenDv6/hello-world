#!/usr/bin/env python3
"""Verify the finished video: contact sheet, spectrogram, loudness, and A/V sync.

Sync check: for every "main" cue (impacts, check dings, big reveals) exported by the page,
find (a) the audio onset — the sharpest rise in short-time energy near the cue — and
(b) the picture change — the peak of mean absolute frame difference near the cue — and
report both offsets against the planned time.

Usage: python3 tools/check.py [out/final.mp4]
"""
import json
import re
import subprocess
import sys
from pathlib import Path

import imageio_ffmpeg
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "out"
FF = imageio_ffmpeg.get_ffmpeg_exe()
video = Path(sys.argv[1]) if len(sys.argv) > 1 else OUT / "final.mp4"


def run(args, **kw):
    return subprocess.run([FF, "-v", "error", "-y", *args], check=True, capture_output=True, **kw)


# ---- contact sheet + spectrogram ----
run(["-i", str(video), "-vf", "fps=1,scale=216:-1,tile=6x3", str(OUT / "contact_%02d.jpg")])
run(["-i", str(video), "-lavfi", "showspectrumpic=s=1600x500:legend=1:color=intensity:scale=log", str(OUT / "spectrum.png")])

# ---- loudness ----
r = subprocess.run([FF, "-i", str(video), "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True)
summary = r.stderr[r.stderr.rfind("Summary:"):]
lufs = re.search(r"I:\s+(-?[\d.]+) LUFS", summary)
peak = re.search(r"Peak:\s+(-?[\d.]+) dBFS", summary)
print(f"loudness: {lufs.group(1) if lufs else '?'} LUFS integrated, true peak {peak.group(1) if peak else '?'} dBFS")

# ---- audio envelope ----
SR = 48000
pcm = run(["-i", str(video), "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"]).stdout
a = np.frombuffer(pcm, dtype=np.int16).astype(np.float32) / 32768
hop = SR // 200  # 5 ms
n = len(a) // hop
energy = np.sqrt((a[: n * hop].reshape(n, hop) ** 2).mean(axis=1) + 1e-12)
db = 20 * np.log10(energy)
rise = np.diff(db, prepend=db[0])

# ---- picture change per frame ----
FPS = 30
w, h = 54, 96
raw = run(["-i", str(video), "-vf", f"scale={w}:{h},format=gray", "-f", "rawvideo", "-"]).stdout
frames = np.frombuffer(raw, dtype=np.uint8).reshape(-1, h, w).astype(np.float32)
motion = np.concatenate([[0], np.abs(np.diff(frames, axis=0)).mean(axis=(1, 2))])

cues = [c for c in json.loads((OUT / "cues.json").read_text()) if c["main"]]
print(f"\n{'cue':<10}{'planned':>9}{'audio':>10}{'picture':>10}")
aud_off, vid_off = [], []
for c in cues:
    t = c["t"]
    i0, i1 = int((t - 0.12) * 200), int((t + 0.2) * 200)
    ai = i0 + int(np.argmax(rise[i0:i1]))
    ta = ai / 200
    f0, f1 = int((t - 0.2) * FPS), int((t + 0.35) * FPS) + 1
    fi = f0 + int(np.argmax(motion[f0:f1]))
    tv = fi / FPS
    aud_off.append((ta - t) * 1000)
    vid_off.append((tv - t) * 1000)
    print(f"{c['label']:<10}{t:>8.2f}s{aud_off[-1]:>+9.0f}ms{vid_off[-1]:>+9.0f}ms")
av = np.array(aud_off) - np.array(vid_off)
print(f"\naudio vs plan: mean {np.mean(aud_off):+.0f} ms, worst {np.max(np.abs(aud_off)):.0f} ms")
print(f"picture vs plan: mean {np.mean(vid_off):+.0f} ms, worst {np.max(np.abs(vid_off)):.0f} ms (1 frame = 33 ms)")
print(f"audio vs picture: mean {np.mean(av):+.0f} ms, worst {np.max(np.abs(av)):.0f} ms")
