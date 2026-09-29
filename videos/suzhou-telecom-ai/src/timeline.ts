import vo from "./vo.json";
import { FPS } from "./theme";

export type VoLine = { scene: number; text: string; file: string; start: number; dur: number };
export type Line = VoLine & { from: number; to: number }; // frames, relative to the scene start
export type Scene = { id: number; from: number; dur: number; lines: Line[] };

const lines = vo.lines as VoLine[];
export const TOTAL = Math.ceil(vo.total * FPS);
export const voLines = lines;

// Picture leads the voice slightly so each scene is already moving when its first line starts.
const LEAD = 0.55;
const ids = [...new Set(lines.map((l) => l.scene))].sort((a, b) => a - b);
const starts = ids.map((id) =>
  id === 1 ? 0 : Math.round((Math.min(...lines.filter((l) => l.scene === id).map((l) => l.start)) - LEAD) * FPS),
);

export const scenes: Scene[] = ids.map((id, i) => {
  const from = starts[i];
  const end = i + 1 < ids.length ? starts[i + 1] : TOTAL;
  return {
    id,
    from,
    dur: end - from,
    lines: lines
      .filter((l) => l.scene === id)
      .map((l) => ({ ...l, from: Math.round(l.start * FPS) - from, to: Math.round((l.start + l.dur) * FPS) - from })),
  };
});

export const sceneById = (id: number) => scenes.find((s) => s.id === id)!;

// Frame (relative to a line's scene) at which `text` starts being spoken inside the line, assuming
// roughly even pacing across the line's characters. Used to land visuals on specific words.
export function atChar(line: Line, text: string) {
  const i = line.text.indexOf(text);
  const n = line.text.length;
  return Math.round(line.from + ((i < 0 ? 0 : i) / n) * (line.to - line.from));
}

// Global frame where the copper line bursts into the brain (the film's one colour change).
const s2 = sceneById(2);
export const BURST = s2.from + atChar(s2.lines[0], "正在");
