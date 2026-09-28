#!/usr/bin/env python3
"""Synthesize the Chinese voiceover line by line and lay it out on a timeline.

Each line in vo-script.json becomes public/audio/vo/NN.wav (leading/trailing silence
trimmed); src/vo.json records scene, text, file, start and duration in seconds so the
Remotion composition can place every line and derive scene boundaries from them.

Usage: python3 scripts/tts.py [--voice zh-CN-YunyangNeural] [--rate=-8%] [--pitch=-2Hz]
Requires: pip install edge-tts imageio-ffmpeg
"""
import argparse
import array
import asyncio
import json
import subprocess
import wave
from pathlib import Path

import imageio_ffmpeg

ROOT = Path(__file__).resolve().parent.parent
FF = imageio_ffmpeg.get_ffmpeg_exe()
SR = 48000

LEAD_IN = 1.6          # seconds of picture before the first line (the line draws itself)
GAP_LINE = 0.4         # pause between lines inside a scene
GAP_SCENE = 1.3        # pause between scenes (room for hits / transitions)
EXTRA_BEFORE = {2: 0.7, 3: 0.3, 5: 0.4, 7: 0.5, 8: 1.0}  # dramatic pauses before these scenes
TAIL = 6.6             # title hold after the last line (lands the film at ~90s)


async def synth(text, out_mp3, voice, rate, pitch):
    import os
    import certifi
    # In the sandbox, HTTPS goes through a proxy whose CA is in this bundle; edge-tts pins
    # certifi's bundle, so point it there (certificate verification stays on).
    if os.path.exists("/root/.ccr/ca-bundle.crt"):
        certifi.where = lambda: "/root/.ccr/ca-bundle.crt"
    import edge_tts
    await edge_tts.Communicate(text, voice, rate=rate, pitch=pitch).save(str(out_mp3))


def to_trimmed_wav(src, dst):
    raw = subprocess.run([FF, "-v", "error", "-i", str(src), "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"],
                         check=True, capture_output=True).stdout
    samples = array.array("h", raw)
    thr = 400
    start = next((i for i, s in enumerate(samples) if abs(s) > thr), 0)
    end = next((i for i in range(len(samples) - 1, -1, -1) if abs(samples[i]) > thr), len(samples) - 1)
    pad = int(0.04 * SR)
    samples = samples[max(0, start - pad): min(len(samples), end + pad)]
    with wave.open(str(dst), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(samples.tobytes())
    return len(samples) / SR


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--voice", default="zh-CN-YunyangNeural")
    ap.add_argument("--rate", default="-8%")
    ap.add_argument("--pitch", default="-2Hz")
    args = ap.parse_args()

    lines = json.loads((ROOT / "vo-script.json").read_text("utf-8"))
    out_dir = ROOT / "public" / "audio" / "vo"
    out_dir.mkdir(parents=True, exist_ok=True)

    t = LEAD_IN
    prev_scene = None
    timeline = []
    for i, line in enumerate(lines):
        scene = line["scene"]
        if prev_scene is not None:
            t += GAP_SCENE if scene != prev_scene else GAP_LINE
        if scene != prev_scene:
            t += EXTRA_BEFORE.get(scene, 0)
        mp3 = out_dir / f"{i:02d}.mp3"
        wav = out_dir / f"{i:02d}.wav"
        asyncio.run(synth(line["text"], mp3, args.voice, args.rate, args.pitch))
        dur = to_trimmed_wav(mp3, wav)
        mp3.unlink()
        timeline.append({"scene": scene, "text": line["text"], "file": f"audio/vo/{i:02d}.wav",
                         "start": round(t, 3), "dur": round(dur, 3)})
        print(f"{i:02d} scene {scene} {t:6.2f}s +{dur:4.2f}s {line['text']}")
        t += dur
        prev_scene = scene

    total = round(t + TAIL, 3)
    (ROOT / "src" / "vo.json").write_text(
        json.dumps({"voice": args.voice, "total": total, "lines": timeline}, ensure_ascii=False, indent=1), "utf-8")
    print(f"total {total:.2f}s")


if __name__ == "__main__":
    main()
