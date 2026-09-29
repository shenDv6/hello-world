#!/usr/bin/env python3
"""Chinese voice-over, synthesized line by line with Microsoft neural voices (edge-tts),
trimmed, and laid out on a timeline that the picture is then timed to.

Input : a JSON list of {"scene": int, "text": str} (one entry per spoken line).
Output: one WAV per line + a timeline JSON:
        {"voice", "total", "lines": [{scene, text, file, start, dur}]}  (seconds)

  python3 tts.py --script vo-script.json --audio-dir audio/vo --json web/vo.json \
                 --file-prefix audio/vo --voice zh-CN-XiaoxiaoNeural --rate=+0%
  (Remotion layout: --audio-dir public/audio/vo --json src/vo.json --file-prefix audio/vo)

Voices that sound native (no foreign accent):
  zh-CN-YunyangNeural  male, news/documentary, authoritative   (serious, epic)
  zh-CN-YunjianNeural  male, passionate, sports-commentary      (hype)
  zh-CN-YunxiNeural    male, young and natural                  (friendly)
  zh-CN-XiaoxiaoNeural female, bright and warm                  (lively)
Pass rate/pitch with '=' (e.g. --rate=-8%) so argparse does not read them as flags.

Requires: pip install edge-tts imageio-ffmpeg ; network access to speech.platform.bing.com
"""
import argparse
import array
import asyncio
import json
import os
import subprocess
import wave
from pathlib import Path

import imageio_ffmpeg

FF = imageio_ffmpeg.get_ffmpeg_exe()
SR = 48000


async def synth(text, out_mp3, voice, rate, pitch):
    import certifi

    # Behind a TLS-inspecting proxy (e.g. Claude Code cloud sandboxes) edge-tts fails with
    # CERTIFICATE_VERIFY_FAILED because it pins certifi's bundle. Point it at the proxy's CA
    # bundle instead — verification stays on.
    bundle = os.environ.get("TTS_CA_BUNDLE", "/root/.ccr/ca-bundle.crt")
    if os.path.exists(bundle):
        certifi.where = lambda: bundle
    import edge_tts

    await edge_tts.Communicate(text, voice, rate=rate, pitch=pitch).save(str(out_mp3))


def to_trimmed_wav(src, dst):
    raw = subprocess.run([FF, "-v", "error", "-i", str(src), "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"],
                         check=True, capture_output=True).stdout
    s = array.array("h", raw)
    thr = 400
    a = next((i for i, v in enumerate(s) if abs(v) > thr), 0)
    b = next((i for i in range(len(s) - 1, -1, -1) if abs(s[i]) > thr), len(s) - 1)
    pad = int(0.04 * SR)
    s = s[max(0, a - pad): min(len(s), b + pad)]
    with wave.open(str(dst), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(s.tobytes())
    return len(s) / SR


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--script", default="vo-script.json")
    ap.add_argument("--audio-dir", default="audio/vo", help="where WAVs are written")
    ap.add_argument("--json", default="web/vo.json", help="timeline JSON output")
    ap.add_argument("--file-prefix", default="audio/vo", help="path of the WAVs as the renderer will fetch them")
    ap.add_argument("--voice", default="zh-CN-YunyangNeural")
    ap.add_argument("--rate", default="+0%")
    ap.add_argument("--pitch", default="+0Hz")
    ap.add_argument("--lead-in", type=float, default=1.2, help="picture before the first line")
    ap.add_argument("--gap-line", type=float, default=0.4, help="pause between lines of a scene")
    ap.add_argument("--gap-scene", type=float, default=1.3, help="pause between scenes (room for hits)")
    ap.add_argument("--extra", default="", help="extra pauses before scenes, e.g. '2:0.7,8:1.0'")
    ap.add_argument("--tail", type=float, default=6.0, help="hold after the last line")
    args = ap.parse_args()
    extra = {int(k): float(v) for k, v in (p.split(":") for p in args.extra.split(",") if p)}

    lines = json.loads(Path(args.script).read_text("utf-8"))
    out_dir = Path(args.audio_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    t, prev, timeline = args.lead_in, None, []
    for i, line in enumerate(lines):
        sc = line["scene"]
        if prev is not None:
            t += args.gap_scene if sc != prev else args.gap_line
        if sc != prev:
            t += extra.get(sc, 0)
        mp3, wav = out_dir / f"{i:02d}.mp3", out_dir / f"{i:02d}.wav"
        asyncio.run(synth(line["text"], mp3, args.voice, args.rate, args.pitch))
        dur = to_trimmed_wav(mp3, wav)
        mp3.unlink()
        timeline.append({"scene": sc, "text": line["text"], "file": f"{args.file_prefix}/{i:02d}.wav",
                         "start": round(t, 3), "dur": round(dur, 3)})
        print(f"{i:02d} scene {sc} {t:6.2f}s +{dur:4.2f}s {line['text']}")
        t += dur
        prev = sc
    total = round(t + args.tail, 3)
    Path(args.json).parent.mkdir(parents=True, exist_ok=True)
    Path(args.json).write_text(json.dumps({"voice": args.voice, "total": total, "lines": timeline},
                                          ensure_ascii=False, indent=1), "utf-8")
    print(f"total {total:.2f}s  (adjust --gap-*/--tail/--rate to hit the target length)")


if __name__ == "__main__":
    main()
