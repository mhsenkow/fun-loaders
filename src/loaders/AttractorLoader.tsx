import { useCallback, useMemo, useRef } from "react";
import { LoaderShell } from "../LoaderShell";
import { useCanvasLoop } from "../hooks/useCanvasLoop";
import type { LoaderBackdrop, LoaderProps, LoaderShape } from "../types";
import { DEFAULT_SIZE } from "../types";
import { cometChain, getLoopState } from "../lib/loopEngine";
import { beginLoaderFrame, endLoaderFrame } from "../lib/loaderFrame";
import { drawLogoGuides, drawMobilRing } from "../lib/logoGrammar";
import {
  LOADER_THEME,
  shouldDrawGuides,
} from "../lib/loaderTheme";
import { drawSoftComet, strokeSegment } from "../lib/loaderPaint";
import { resolveBackdrop } from "../lib/resolveBackdrop";
import { resolveParams, type PresetDefinition } from "../lib/presets";
import { resolveShape } from "../lib/resolveShape";
import type { ShapeBounds } from "../lib/shape";

interface Particle {
  seedX: number;
  seedY: number;
  offset: number;
}

export interface AttractorLoaderParams {
  cycleDuration: number;
  particleCount: number;
  trailFade: number;
  paramA: number;
  paramB: number;
  paramC: number;
  paramD: number;
  morphAmount: number;
  hueSpeed: number;
  particleSize: number;
  background: string;
  shape?: LoaderShape;
  backdrop?: LoaderBackdrop;
}

export const ATTRACTOR_DEFAULT_PARAMS: AttractorLoaderParams = {
  cycleDuration: 4800,
  particleCount: 1,
  trailFade: 0.1,
  paramA: -1.4,
  paramB: 1.6,
  paramC: 1.0,
  paramD: 0.7,
  morphAmount: 0.12,
  hueSpeed: 0,
  particleSize: 1.8,
  background: "transparent",
  shape: "circle",
  backdrop: "transparent",
};

export const ATTRACTOR_PRESETS: Record<
  string,
  PresetDefinition<AttractorLoaderParams>
> = {
  loader: {
    name: "Loader",
    description: "Monochrome comet orbit",
    params: ATTRACTOR_DEFAULT_PARAMS,
  },
  comet: {
    name: "Comet",
    description: "Single orbit on cream mark",
    params: {
      ...ATTRACTOR_DEFAULT_PARAMS,
      backdrop: "mark",
      background: "#f4f2ec",
      cycleDuration: 5000,
      hueSpeed: 0.01,
    },
  },
  trio: {
    name: "Trio",
    description: "Three offset comets",
    params: {
      ...ATTRACTOR_DEFAULT_PARAMS,
      particleCount: 3,
      morphAmount: 0.15,
    },
  },
  galaxy: {
    name: "Galaxy",
    description: "Slow spiral with long trails",
    params: {
      ...ATTRACTOR_DEFAULT_PARAMS,
      cycleDuration: 8000,
      trailFade: 0.06,
      morphAmount: 0.08,
    },
  },
  grid: {
    name: "Grid",
    description: "2×2 quadrant marks",
    params: {
      ...ATTRACTOR_DEFAULT_PARAMS,
      cycleDuration: 4500,
      shape: "square",
    },
  },
};

function spawnParticles(count: number): Particle[] {
  const n = Math.min(3, Math.max(1, count));
  return Array.from({ length: n }, (_, i) => ({
    seedX: Math.random() * 2 - 1,
    seedY: Math.random() * 2 - 1,
    offset: i / n,
  }));
}

function iterateAttractor(
  x: number,
  y: number,
  a: number,
  b: number,
  c: number,
  d: number,
  steps: number,
) {
  const whole = Math.floor(steps);
  const frac = steps - whole;
  let px = x;
  let py = y;
  for (let s = 0; s < whole; s++) {
    const nx = Math.sin(a * py) + c * Math.cos(a * px);
    const ny = Math.sin(b * px) + d * Math.cos(b * py);
    px = nx;
    py = ny;
  }
  if (frac > 0.001) {
    const nx = Math.sin(a * py) + c * Math.cos(a * px);
    const ny = Math.sin(b * px) + d * Math.cos(b * py);
    px += (nx - px) * frac;
    py += (ny - py) * frac;
  }
  return { x: px, y: py };
}

function buildGhostPath(
  a: number,
  b: number,
  c: number,
  d: number,
  steps: number,
): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  let x = 0.1;
  let y = 0.1;
  for (let i = 0; i <= steps; i++) {
    pts.push({ x, y });
    const nx = Math.sin(a * y) + c * Math.cos(a * x);
    const ny = Math.sin(b * x) + d * Math.cos(b * y);
    x = nx;
    y = ny;
  }
  return pts;
}

function drawGhostLoop(
  ctx: CanvasRenderingContext2D,
  bounds: ShapeBounds,
  a: number,
  b: number,
  c: number,
  d: number,
  scale: number,
  stroke: string,
) {
  const ghost = buildGhostPath(a, b, c, d, 420);
  for (let i = 1; i < ghost.length; i++) {
    const a0 = ghost[i - 1];
    const a1 = ghost[i];
    strokeSegment(
      ctx,
      bounds.cx + a0.x * scale,
      bounds.cy + a0.y * scale,
      bounds.cx + a1.x * scale,
      bounds.cy + a1.y * scale,
      stroke,
      0.7,
      0.05,
      0,
    );
  }
  const last = ghost[ghost.length - 1];
  const first = ghost[0];
  strokeSegment(
    ctx,
    bounds.cx + last.x * scale,
    bounds.cy + last.y * scale,
    bounds.cx + first.x * scale,
    bounds.cy + first.y * scale,
    stroke,
    0.7,
    0.05,
    0,
  );
}

function drawComet(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number,
  progress: number,
  offset: number,
  seedX: number,
  seedY: number,
  a: number,
  b: number,
  c: number,
  d: number,
  tailLen: number,
  spacing: number,
  maxSteps: number,
  particleSize: number,
  mono: boolean,
  hue: number,
  sat: number,
) {
  const head = (progress + offset) % 1;
  const chain = cometChain(head, tailLen, spacing, true);

  for (let i = chain.length - 1; i >= 0; i--) {
    const travel = chain[i];
    const steps = travel * maxSteps;
    const { x, y } = iterateAttractor(seedX, seedY, a, b, c, d, steps);
    const px = cx + x * scale;
    const py = cy + y * scale;
    const fade = 1 - i / tailLen;
    const alpha = mono
      ? 0.06 + fade * fade * 0.75
      : 0.1 + fade * fade * 0.72;
    const dotSize = particleSize * (0.45 + fade * 0.75);

    if (mono) {
      drawSoftComet(ctx, px, py, dotSize, alpha, fade > 0.82);
      continue;
    }

    ctx.fillStyle = `hsla(${hue}, ${sat}%, ${38 + fade * 14}%, ${alpha})`;
    ctx.beginPath();
    ctx.arc(px, py, dotSize, 0, Math.PI * 2);
    ctx.fill();
  }
}

export interface AttractorLoaderProps extends LoaderProps {
  params?: Partial<AttractorLoaderParams>;
}

export function AttractorLoader({
  size = DEFAULT_SIZE,
  label,
  className,
  preset,
  shape: propShape,
  backdrop: propBackdrop,
  params: paramOverrides,
}: AttractorLoaderProps) {
  const p = useMemo(
    () =>
      resolveParams(
        ATTRACTOR_DEFAULT_PARAMS,
        ATTRACTOR_PRESETS,
        preset,
        paramOverrides,
      ),
    [preset, paramOverrides],
  );

  const shape = resolveShape(propShape, p, p.shape);
  const backdrop = resolveBackdrop(propBackdrop, p, p.backdrop);
  const mono = backdrop === "transparent" || p.hueSpeed === 0;
  const particleCount = Math.min(3, Math.max(1, p.particleCount));

  const particlesRef = useRef<Particle[]>(spawnParticles(particleCount));
  const countRef = useRef(particleCount);
  if (countRef.current !== particleCount) {
    particlesRef.current = spawnParticles(particleCount);
    countRef.current = particleCount;
  }

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, canvasSize: number, t: number) => {
      const frame = beginLoaderFrame(ctx, canvasSize, shape, p.background, {
        backdrop,
      });
      const { bounds } = frame;
      if (shouldDrawGuides(backdrop)) {
        drawLogoGuides(ctx, bounds, shape);
        if (shape === "circle") drawMobilRing(ctx, bounds, 0.08);
      }

      const { progress, phase } = getLoopState(t, p.cycleDuration);
      const a = p.paramA + Math.sin(phase) * p.morphAmount;
      const b = p.paramB + Math.cos(phase * 1.3) * p.morphAmount * 0.7;
      const c = p.paramC + Math.sin(phase * 0.7) * p.morphAmount * 0.5;
      const d = p.paramD + Math.cos(phase * 1.1) * p.morphAmount * 0.35;
      const maxSteps = 160;
      const tailLen = 32;
      const spacing = 0.016;
      const ghostStroke = mono ? LOADER_THEME.ghost : "rgba(0,0,0,0.07)";

      if (shape === "circle") {
        drawGhostLoop(
          ctx,
          bounds,
          a,
          b,
          c,
          d,
          bounds.half * 0.78,
          ghostStroke,
        );

        for (const part of particlesRef.current) {
          drawComet(
            ctx,
            bounds.cx,
            bounds.cy,
            bounds.half * 0.78,
            progress,
            part.offset,
            part.seedX,
            part.seedY,
            a,
            b,
            c,
            d,
            tailLen,
            spacing,
            maxSteps,
            p.particleSize,
            mono,
            355,
            58,
          );
        }
      } else {
        const quadHalf = bounds.half * 0.42;
        if (shouldDrawGuides(backdrop)) {
          ctx.save();
          ctx.strokeStyle = "rgba(0,0,0,0.06)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(bounds.cx, bounds.inset);
          ctx.lineTo(bounds.cx, bounds.inset + bounds.size);
          ctx.moveTo(bounds.inset, bounds.cy);
          ctx.lineTo(bounds.inset + bounds.size, bounds.cy);
          ctx.stroke();
          ctx.restore();
        }
        const offsets = [
          { cx: bounds.cx - quadHalf * 0.55, cy: bounds.cy - quadHalf * 0.55 },
          { cx: bounds.cx + quadHalf * 0.55, cy: bounds.cy - quadHalf * 0.55 },
          { cx: bounds.cx - quadHalf * 0.55, cy: bounds.cy + quadHalf * 0.55 },
          { cx: bounds.cx + quadHalf * 0.55, cy: bounds.cy + quadHalf * 0.55 },
        ];
        const seeds = [
          { sx: 0.12, sy: 0.08 },
          { sx: -0.1, sy: 0.14 },
          { sx: 0.08, sy: -0.12 },
          { sx: -0.14, sy: -0.08 },
        ];

        for (let q = 0; q < 4; q++) {
          const { cx, cy } = offsets[q];
          const { sx, sy } = seeds[q];
          drawGhostLoop(
            ctx,
            { ...bounds, cx, cy },
            a,
            b,
            c,
            d,
            quadHalf * 0.72,
            ghostStroke,
          );
          drawComet(
            ctx,
            cx,
            cy,
            quadHalf * 0.72,
            progress,
            q * 0.25,
            sx,
            sy,
            a,
            b,
            c,
            d,
            tailLen - 6,
            spacing,
            maxSteps,
            p.particleSize * 0.85,
            mono,
            0,
            0,
          );
        }
      }

      endLoaderFrame(ctx, frame);
    },
    [p, shape, backdrop, mono, particleCount],
  );

  const canvasRef = useCanvasLoop(draw, [p, shape, backdrop, mono, particleCount], size);
  return (
    <LoaderShell
      canvasRef={canvasRef}
      label={label}
      className={className}
      size={size}
      shape={shape}
      backdrop={backdrop}
    />
  );
}
