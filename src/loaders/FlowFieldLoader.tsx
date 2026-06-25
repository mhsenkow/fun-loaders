import { useCallback, useMemo, useRef } from "react";
import { LoaderShell } from "../LoaderShell";
import { useCanvasLoop } from "../hooks/useCanvasLoop";
import type { LoaderBackdrop, LoaderProps } from "../types";
import { DEFAULT_SIZE } from "../types";
import { cometChain, getLoopState } from "../lib/loopEngine";
import { beginLoaderFrame, endLoaderFrame } from "../lib/loaderFrame";
import {
  drawLogoGuides,
  drawMobilRing,
  drawStripeBandGuides,
  spiralFlowAngle,
  stripeFlowAngle,
} from "../lib/logoGrammar";
import {
  LOADER_GLOW,
  LOADER_THEME,
  shouldDrawGuides,
} from "../lib/loaderTheme";
import { strokeSegment } from "../lib/loaderPaint";
import { resolveBackdrop } from "../lib/resolveBackdrop";
import { resolveParams, type PresetDefinition } from "../lib/presets";
import { resolveShape } from "../lib/resolveShape";
import { containsShape, type LoaderShape, type ShapeBounds } from "../lib/shape";

interface Particle {
  t: number;
  band: number;
}

export interface FlowFieldLoaderParams {
  cycleDuration: number;
  particleCount: number;
  speed: number;
  tailLength: number;
  tailSpacing: number;
  hueBase: number;
  hueSpread: number;
  saturation: number;
  background: string;
  shape?: LoaderShape;
  backdrop?: LoaderBackdrop;
}

export const FLOW_FIELD_DEFAULT_PARAMS: FlowFieldLoaderParams = {
  cycleDuration: 5000,
  particleCount: 80,
  speed: 1.1,
  tailLength: 20,
  tailSpacing: 0.024,
  hueBase: 0,
  hueSpread: 0,
  saturation: 0,
  background: "transparent",
  shape: "circle",
  backdrop: "transparent",
};

export const FLOW_FIELD_PRESETS: Record<
  string,
  PresetDefinition<FlowFieldLoaderParams>
> = {
  loader: {
    name: "Loader",
    description: "Monochrome comet stream",
    params: FLOW_FIELD_DEFAULT_PARAMS,
  },
  mark: {
    name: "Mark",
    description: "Spiral comets on cream",
    params: {
      ...FLOW_FIELD_DEFAULT_PARAMS,
      backdrop: "mark",
      background: "#f4f2ec",
      particleCount: 140,
      hueSpread: 20,
      saturation: 72,
      cycleDuration: 4800,
    },
  },
  stripes: {
    name: "Stripes",
    description: "Horizontal ink bands",
    params: {
      ...FLOW_FIELD_DEFAULT_PARAMS,
      shape: "square",
      cycleDuration: 5200,
      particleCount: 70,
      tailLength: 16,
    },
  },
  frost: {
    name: "Frost",
    description: "Pale wisps",
    params: {
      ...FLOW_FIELD_DEFAULT_PARAMS,
      cycleDuration: 6000,
      particleCount: 60,
      tailLength: 24,
    },
  },
};

function traceSpiral(
  u: number,
  bounds: ShapeBounds,
  phase: number,
  speed: number,
  seed: number,
): { px: number; py: number } {
  const startAngle = seed * Math.PI * 2;
  let px = bounds.cx + Math.cos(startAngle) * bounds.half * 0.04;
  let py = bounds.cy + Math.sin(startAngle) * bounds.half * 0.04;
  const steps = Math.round(6 + u * 32);
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    const angle = spiralFlowAngle(px, py, bounds, phase + u * 0.4);
    const step = speed * (1.2 + t * 2.8);
    px += Math.cos(angle) * step;
    py += Math.sin(angle) * step;
  }
  return { px, py };
}

function traceStripe(
  u: number,
  bounds: ShapeBounds,
  phase: number,
  band: number,
  bandCount: number,
): { px: number; py: number } {
  const v = (band + 0.5) / bandCount;
  const baseY = bounds.inset + v * bounds.size;
  const px = bounds.inset + u * bounds.size;
  const angle = stripeFlowAngle(baseY, bounds, phase + u * 0.4, bandCount);
  const drift = Math.sin(u * Math.PI * 3 + phase) * bounds.size * 0.012;
  return { px, py: baseY + drift + Math.sin(angle) * bounds.size * 0.008 };
}

function flowPosition(
  u: number,
  bounds: ShapeBounds,
  shape: LoaderShape,
  phase: number,
  speed: number,
  particle: Particle,
): { px: number; py: number } {
  if (shape === "circle") {
    return traceSpiral(u, bounds, phase, speed, particle.t);
  }
  return traceStripe(u, bounds, phase, particle.band, 5);
}

function spawnParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    t: i / count,
    band: i % 5,
  }));
}

export interface FlowFieldLoaderProps extends LoaderProps {
  params?: Partial<FlowFieldLoaderParams>;
}

export function FlowFieldLoader({
  size = DEFAULT_SIZE,
  shape: propShape,
  label,
  className,
  preset,
  backdrop: propBackdrop,
  params: paramOverrides,
}: FlowFieldLoaderProps) {
  const p = useMemo(
    () =>
      resolveParams(
        FLOW_FIELD_DEFAULT_PARAMS,
        FLOW_FIELD_PRESETS,
        preset,
        paramOverrides,
      ),
    [preset, paramOverrides],
  );
  const shape = resolveShape(propShape, p, p.shape);
  const backdrop = resolveBackdrop(propBackdrop, p, p.backdrop);
  const mono = backdrop === "transparent" || p.saturation === 0;

  const particlesRef = useRef<Particle[]>(spawnParticles(p.particleCount));
  const countRef = useRef(p.particleCount);
  if (countRef.current !== p.particleCount) {
    particlesRef.current = spawnParticles(p.particleCount);
    countRef.current = p.particleCount;
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
        else drawStripeBandGuides(ctx, bounds, 5);
      }

      const { progress, sin: pulse, phase } = getLoopState(t, p.cycleDuration);

      for (const part of particlesRef.current) {
        const head = (progress + part.t) % 1;
        const chain = cometChain(head, p.tailLength, p.tailSpacing, true);
        const hue =
          (p.hueBase + part.t * p.hueSpread + (part.band / 5) * p.hueSpread * 0.4) %
          360;

        for (let i = chain.length - 1; i >= 1; i--) {
          const u0 = chain[i];
          const u1 = chain[i - 1];
          const a = flowPosition(u0, bounds, shape, phase, p.speed, part);
          const b = flowPosition(u1, bounds, shape, phase, p.speed, part);

          if (
            !containsShape(a.px, a.py, bounds, shape) &&
            !containsShape(b.px, b.py, bounds, shape)
          ) {
            continue;
          }

          const fade = 1 - i / p.tailLength;
          const alpha = mono
            ? 0.05 + fade * (0.15 + 0.35 * (0.5 + 0.5 * pulse))
            : 0.08 + fade * (0.18 + 0.32 * (0.5 + 0.5 * pulse));
          const glow = mono ? fade * LOADER_GLOW.pulse * 0.7 : 0;

          if (mono) {
            strokeSegment(
              ctx,
              a.px,
              a.py,
              b.px,
              b.py,
              `rgba(255,255,255,${0.4 + fade * 0.5})`,
              0.6 + fade * 1.4,
              alpha,
              glow,
            );
          } else {
            ctx.strokeStyle = `hsla(${hue}, ${p.saturation}%, ${38 + fade * 14}%, ${alpha})`;
            ctx.lineWidth = 0.7 + fade * 1.6;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(a.px, a.py);
            ctx.lineTo(b.px, b.py);
            ctx.stroke();
          }
        }
      }
      endLoaderFrame(ctx, frame);
    },
    [p, shape, backdrop, mono],
  );

  const canvasRef = useCanvasLoop(draw, [p, shape, backdrop, mono], size);
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
