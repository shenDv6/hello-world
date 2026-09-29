import React from "react";
import { random } from "remotion";
import { C, H, W, lerp, mixColor } from "./theme";

const N = 240;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

// Unit points on a slightly squashed sphere (a "brain"), plus a fixed neighbour graph.
const PTS = Array.from({ length: N }, (_, i) => {
  const y = 1 - (2 * (i + 0.5)) / N;
  const r = Math.sqrt(1 - y * y);
  const phi = i * GOLDEN;
  const jitter = 1 + (random(`bj${i}`) - 0.5) * 0.12;
  return { x: Math.cos(phi) * r * 1.12 * jitter, y: y * 0.92 * jitter, z: Math.sin(phi) * r * jitter };
});

const EDGES: [number, number][] = (() => {
  const set = new Set<string>();
  const out: [number, number][] = [];
  PTS.forEach((p, i) => {
    const near = PTS.map((q, j) => ({ j, d: (p.x - q.x) ** 2 + (p.y - q.y) ** 2 + (p.z - q.z) ** 2 }))
      .filter((o) => o.j !== i)
      .sort((a, b) => a.d - b.d)
      .slice(0, 3);
    near.forEach(({ j }) => {
      const k = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (!set.has(k)) {
        set.add(k);
        out.push([i, j]);
      }
    });
  });
  return out;
})();

// The same N points drawn as one continuous (optionally trembling) line; the brain's dots take
// over from these exact positions at the burst, so the hand-off is seamless.
export const LineWave: React.FC<{
  frame: number;
  draw?: number;
  vibrate?: number;
  color?: string;
  lineY?: number;
  lineX0?: number;
  lineX1?: number;
  opacity?: number;
}> = ({ frame, draw = 1, vibrate = 0, color = C.copper, lineY = 900, lineX0 = 80, lineX1 = W - 80, opacity = 1 }) => {
  const n = Math.max(2, Math.round(N * draw));
  const pts = Array.from({ length: n }, (_, i) => {
    const x = lerp(lineX0, lineX1, i / (N - 1));
    const y = lineY + Math.sin(i * 0.9 + frame * 0.9) * vibrate * (0.4 + random(`bv${i}`));
    return [x, y];
  });
  const [hx, hy] = pts[pts.length - 1];
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity }}>
      <defs>
        {/* userSpaceOnUse: a perfectly straight line has a zero-height bbox, which would
            collapse an objectBoundingBox filter region and make the line vanish */}
        <filter id="lglow" filterUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}>
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <polyline
        points={pts.map((p) => p.join(",")).join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={2.4}
        strokeLinejoin="round"
        filter="url(#lglow)"
      />
      {draw < 1 && <circle cx={hx} cy={hy} r={7} fill="#fff1e2" filter="url(#lglow)" />}
    </svg>
  );
};

export type BrainProps = {
  frame: number; // global-ish frame driving rotation and pulses
  morph: number; // 0 = points lie on the horizontal line, 1 = full brain
  vibrate?: number; // amplitude (px) of the line's tremble before the burst
  cx?: number;
  cy?: number;
  radius?: number;
  scale?: number;
  opacity?: number;
  lineY?: number;
  lineX0?: number;
  lineX1?: number;
};

export const Brain: React.FC<BrainProps> = ({
  frame,
  morph,
  vibrate = 0,
  cx = W / 2,
  cy = 860,
  radius = 330,
  scale = 1,
  opacity = 1,
  lineY = 900,
  lineX0 = 80,
  lineX1 = W - 80,
}) => {
  const a = frame * 0.011;
  const tilt = 0.32;
  const [ca, sa, ct, st] = [Math.cos(a), Math.sin(a), Math.cos(tilt), Math.sin(tilt)];

  const proj = PTS.map((p, i) => {
    // rotate around Y, then tilt around X
    const x1 = p.x * ca + p.z * sa;
    const z1 = -p.x * sa + p.z * ca;
    const y2 = p.y * ct - z1 * st;
    const z2 = p.y * st + z1 * ct;
    const persp = 1000 / (1000 + z2 * radius);
    const bx = cx + x1 * radius * persp * scale;
    const by = cy + y2 * radius * persp * scale;
    // per-point stagger so the burst ripples instead of moving as one block
    const d = random(`bd${i}`) * 0.35;
    const t = Math.min(1, Math.max(0, (morph - d) / 0.65));
    const m = t * t * (3 - 2 * t);
    const lx = lerp(lineX0, lineX1, i / (N - 1));
    const ly = lineY + Math.sin(i * 0.9 + frame * 0.9) * vibrate * (0.4 + random(`bv${i}`));
    return { x: lerp(lx, bx, m), y: lerp(ly, by, m), depth: (z2 + 1.2) / 2.4, m, persp };
  });

  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity }}>
      <defs>
        <filter id="bglow" filterUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}>
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {EDGES.map(([i, j], k) => {
        const p = proj[i];
        const q = proj[j];
        const m = Math.min(p.m, q.m);
        if (m <= 0.02) return null;
        const pulse = (frame + k * 7) % 110 < 9;
        const o = m * (0.1 + 0.28 * (1 - (p.depth + q.depth) / 2)) * (pulse ? 3 : 1);
        return (
          <line
            key={k}
            x1={p.x}
            y1={p.y}
            x2={q.x}
            y2={q.y}
            stroke={pulse ? C.accentSoft : C.accent}
            strokeWidth={pulse ? 2 : 1.1}
            strokeOpacity={Math.min(1, o)}
          />
        );
      })}
      <g filter="url(#bglow)">
        {proj.map((p, i) => {
          const r = (1.3 + random(`br${i}`) * 2) * lerp(1, p.persp * scale, p.m);
          const color = mixColor(C.accentSoft, C.copper, 1 - p.m);
          const o = lerp(0.9, 0.35 + 0.65 * (1 - p.depth), p.m);
          return <circle key={i} cx={p.x} cy={p.y} r={r} fill={color} opacity={o} />;
        })}
      </g>
    </svg>
  );
};
