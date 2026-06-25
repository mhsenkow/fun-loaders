import { useCallback, useMemo, useRef } from "react";
import { LoaderShell } from "../LoaderShell";
import { useCanvasLoop } from "../hooks/useCanvasLoop";
import type { LoaderBackdrop, LoaderProps } from "../types";
import { DEFAULT_SIZE } from "../types";
import { loopHue } from "../lib/loop";
import { getLoopState, nestedWave } from "../lib/loopEngine";
import { loopWindow } from "../lib/loopDraw";
import { beginLoaderFrame, endLoaderFrame } from "../lib/loaderFrame";
import {
  buildSuperellipsePath,
  drawLogoGuides,
  drawMobilRing,
  drawPathPulse,
  drawPathPulseMono,
  drawPulseHead,
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
import { type LoaderShape, type ShapeBounds } from "../lib/shape";

export interface TorusKnotLoaderParams {
  cycleDuration: number;
  p: number;
  q: number;
  rotSpeedX: number;
  rotSpeedY: number;
  lineWidth: number;
  hueSpeed: number;
  headGlow: number;
  background: string;
  shape?: LoaderShape;
  backdrop?: LoaderBackdrop;
}

export const TORUS_KNOT_DEFAULT_PARAMS: TorusKnotLoaderParams = {
  cycleDuration: 4400,
  p: 2,
  q: 3,
  rotSpeedX: 0.0007,
  rotSpeedY: 0.001,
  lineWidth: 1.1,
  hueSpeed: 0,
  headGlow: 6,
  background: "transparent",
  shape: "circle",
  backdrop: "transparent",
};

export const TORUS_KNOT_PRESETS: Record<
  string,
  PresetDefinition<TorusKnotLoaderParams>
> = {
  loader: {
    name: "Loader",
    description: "Monochrome trefoil pulse",
    params: TORUS_KNOT_DEFAULT_PARAMS,
  },
  trefoil: {
    name: "Trefoil",
    description: "Classic (2,3) on cream mark",
    params: {
      ...TORUS_KNOT_DEFAULT_PARAMS,
      backdrop: "mark",
      background: "#f4f2ec",
      lineWidth: 1.4,
      hueSpeed: 0.02,
      headGlow: 8,
      cycleDuration: 4000,
    },
  },
  weave: {
    name: "Weave",
    description: "Square superellipse weave",
    params: {
      ...TORUS_KNOT_DEFAULT_PARAMS,
      cycleDuration: 4200,
      shape: "square",
      headGlow: 6,
    },
  },
  cinquifoil: {
    name: "Cinquifoil",
    description: "Five-fold (2,5) symmetry",
    params: { ...TORUS_KNOT_DEFAULT_PARAMS, cycleDuration: 5000, p: 2, q: 5 },
  },
  wire: {
    name: "Wire",
    description: "Thin wireframe",
    params: {
      ...TORUS_KNOT_DEFAULT_PARAMS,
      lineWidth: 0.9,
      headGlow: 5,
    },
  },
};

function buildKnotPoints(
  bounds: ShapeBounds,
  pW: number,
  qW: number,
  rotY: number,
  rotX: number,
) {
  const cx = bounds.cx;
  const cy = bounds.cy;
  const scale = bounds.half * 0.55;
  const R = scale;
  const r = scale * 0.357;
  const steps = 360;
  const cosY = Math.cos(rotY);
  const sinY = Math.sin(rotY);
  const cosX = Math.cos(rotX);
  const sinX = Math.sin(rotX);
  const points: { x: number; y: number; z: number }[] = [];

  for (let i = 0; i <= steps; i++) {
    const u = (i / steps) * Math.PI * 2;
    const x3 = (R + r * Math.cos(pW * u)) * Math.cos(u);
    const y3 = (R + r * Math.cos(pW * u)) * Math.sin(u);
    const z3 = r * Math.sin(pW * u);
    const x1 = x3 * cosY + z3 * sinY;
    const z1 = -x3 * sinY + z3 * cosY;
    const y1 = y3 * cosX - z1 * sinX;
    const z2 = y3 * sinX + z1 * cosX;
    points.push({ x: cx + x1, y: cy + y1, z: z2 });
  }
  return points;
}

function buildWeavePath(bounds: ShapeBounds, steps: number) {
  return buildSuperellipsePath(bounds, 7, steps);
}

export interface TorusKnotLoaderProps extends LoaderProps {
  params?: Partial<TorusKnotLoaderParams>;
}

export function TorusKnotLoader({
  size = DEFAULT_SIZE,
  shape: propShape,
  label,
  className,
  preset,
  backdrop: propBackdrop,
  params: paramOverrides,
}: TorusKnotLoaderProps) {
  const p = useMemo(
    () =>
      resolveParams(
        TORUS_KNOT_DEFAULT_PARAMS,
        TORUS_KNOT_PRESETS,
        preset,
        paramOverrides,
      ),
    [preset, paramOverrides],
  );
  const shape = resolveShape(propShape, p, p.shape);
  const backdrop = resolveBackdrop(propBackdrop, p, p.backdrop);
  const mono = backdrop === "transparent" || p.hueSpeed === 0;

  const weaveRef = useRef<{ key: string; pts: { x: number; y: number }[] } | null>(
    null,
  );

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, canvasSize: number, t: number) => {
      const frame = beginLoaderFrame(ctx, canvasSize, shape, p.background, {
        backdrop,
      });
      const { bounds } = frame;
      const { progress } = getLoopState(t, p.cycleDuration);
      if (shouldDrawGuides(backdrop)) {
        drawLogoGuides(ctx, bounds, shape);
        if (shape === "circle") drawMobilRing(ctx, bounds, 0.08);
      }
      const sat = p.hueSpeed === 0 ? 0 : 72;
      const inkHue = mono ? 0 : loopHue(t, p.cycleDuration, p.hueSpeed * 0.4);

      if (shape === "circle") {
        const rotY = progress * Math.PI * 2;
        const rotX = progress * Math.PI * 2 * 0.7;
        const points = buildKnotPoints(bounds, p.p, p.q, rotY, rotX);
        const steps = points.length - 1;
        const halfW = 0.12;

        for (let i = 1; i <= steps; i++) {
          const pos = i / steps;
          const bright =
            nestedWave(pos, progress, halfW, 3) * 0.6 +
            loopWindow(pos, progress, halfW) * 0.4;
          const a = points[i - 1];
          const b = points[i];
          const alpha = mono
            ? bright > 0.08
              ? 0.12 + bright * 0.6
              : 0.05
            : 0.06 + bright * 0.35;
          if (mono) {
            strokeSegment(
              ctx,
              a.x,
              a.y,
              b.x,
              b.y,
              bright > 0.08 ? LOADER_THEME.pulse : LOADER_THEME.ghost,
              p.lineWidth + bright * 0.9,
              alpha,
              bright * LOADER_GLOW.pulse,
            );
            continue;
          }
          ctx.strokeStyle = `hsla(${inkHue}, ${sat}%, 48%, ${alpha})`;
          ctx.lineWidth = p.lineWidth + bright * 0.8;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }

        const headIdx = Math.floor(progress * steps) % steps;
        const hp = points[headIdx];
        if (mono) {
          drawPulseHead(ctx, hp.x, hp.y, p.headGlow * 0.5);
        } else {
          ctx.fillStyle = `hsla(${inkHue}, ${sat || 8}%, 24%, 0.92)`;
          ctx.beginPath();
          ctx.arc(hp.x, hp.y, p.headGlow * 0.45, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        const key = `${canvasSize}`;
        if (!weaveRef.current || weaveRef.current.key !== key) {
          weaveRef.current = {
            key,
            pts: buildWeavePath(bounds, 480),
          };
        }
        const path = weaveRef.current.pts;
        if (mono) {
          drawPathPulseMono(ctx, path, progress, 0.1, p.lineWidth, undefined, undefined, bounds, shape);
          const headIdx = Math.min(
            path.length - 1,
            Math.floor(progress * (path.length - 1)),
          );
          const hp = path[headIdx];
          drawPulseHead(ctx, hp.x, hp.y, p.headGlow * 0.45);
        } else {
          const baseStroke = `hsla(${inkHue}, ${sat || 6}%, 42%, 0.35)`;
          const litStroke = `hsla(${inkHue}, ${sat || 8}%, 26%, 1)`;
          drawPathPulse(
            ctx,
            path,
            progress,
            0.1,
            baseStroke,
            litStroke,
            p.lineWidth,
          );
          const headIdx = Math.min(
            path.length - 1,
            Math.floor(progress * (path.length - 1)),
          );
          const hp = path[headIdx];
          ctx.fillStyle = `hsla(${inkHue}, ${sat || 8}%, 22%, 0.95)`;
          ctx.beginPath();
          ctx.arc(hp.x, hp.y, p.headGlow * 0.4, 0, Math.PI * 2);
          ctx.fill();
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
