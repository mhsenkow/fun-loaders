import { useCallback, useMemo, useRef } from "react";
import { LoaderShell } from "../LoaderShell";
import { useCanvasLoop } from "../hooks/useCanvasLoop";
import type { LoaderBackdrop, LoaderProps, LoaderShape } from "../types";
import { DEFAULT_SIZE } from "../types";
import { openProgress } from "../lib/loopEngine";
import { beginLoaderFrame, endLoaderFrame } from "../lib/loaderFrame";
import {
  buildGoldenSpiralPath,
  drawLogoGuides,
  drawMobilRing,
  drawPathPulse,
  drawPathPulseMono,
  drawPulseHead,
} from "../lib/logoGrammar";
import {
  shouldDrawGuides,
} from "../lib/loaderTheme";
import { resolveBackdrop } from "../lib/resolveBackdrop";
import { resolveParams, type PresetDefinition } from "../lib/presets";
import { resolveShape } from "../lib/resolveShape";

function hilbertIndex(order: number, index: number): [number, number] {
  let x = 0;
  let y = 0;
  let t = index;
  for (let s = 1; s < 1 << order; s *= 2) {
    const rx = 1 & (t / 2);
    const ry = 1 & (t ^ rx);
    if (ry === 0) {
      if (rx === 1) {
        x = s - 1 - x;
        y = s - 1 - y;
      }
      [x, y] = [y, x];
    }
    x += s * rx;
    y += s * ry;
    t = Math.floor(t / 4);
  }
  return [x, y];
}

function buildHilbertPoints(order: number): { x: number; y: number }[] {
  const total = (1 << order) * (1 << order);
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < total; i++) {
    const [x, y] = hilbertIndex(order, i);
    pts.push({ x, y });
  }
  return pts;
}

export interface HilbertLoaderParams {
  cycleDuration: number;
  order: number;
  trailFraction: number;
  lineWidth: number;
  hueStart: number;
  hueSpread: number;
  headGlow: number;
  background: string;
  shape?: LoaderShape;
  backdrop?: LoaderBackdrop;
}

export const HILBERT_DEFAULT_PARAMS: HilbertLoaderParams = {
  cycleDuration: 4200,
  order: 5,
  trailFraction: 0.14,
  lineWidth: 1.3,
  hueStart: 0,
  hueSpread: 0,
  headGlow: 6,
  background: "transparent",
  shape: "circle",
  backdrop: "transparent",
};

export const HILBERT_PRESETS: Record<
  string,
  PresetDefinition<HilbertLoaderParams>
> = {
  loader: {
    name: "Loader",
    description: "Monochrome spiral / Hilbert tracer",
    params: HILBERT_DEFAULT_PARAMS,
  },
  tracer: {
    name: "Tracer",
    description: "Spiral trace in disc / Hilbert in square",
    params: {
      ...HILBERT_DEFAULT_PARAMS,
      backdrop: "mark",
      background: "#f4f2ec",
      cycleDuration: 4000,
      trailFraction: 0.2,
      lineWidth: 1.6,
    },
  },
  ghost: {
    name: "Ghost",
    description: "Long faint whisper",
    params: {
      ...HILBERT_DEFAULT_PARAMS,
      cycleDuration: 6000,
      trailFraction: 0.35,
      lineWidth: 1,
      headGlow: 5,
    },
  },
  neon: {
    name: "Neon",
    description: "Bright short pulse",
    params: {
      ...HILBERT_DEFAULT_PARAMS,
      backdrop: "mark",
      background: "#0a0a0f",
      cycleDuration: 2500,
      trailFraction: 0.12,
      lineWidth: 2.2,
      hueStart: 300,
      hueSpread: 40,
      headGlow: 12,
    },
  },
  minimal: {
    name: "Minimal",
    description: "Ink line on paper",
    params: {
      ...HILBERT_DEFAULT_PARAMS,
      backdrop: "mark",
      background: "#f4f2ec",
      cycleDuration: 5000,
      order: 4,
      trailFraction: 0.18,
      lineWidth: 1.2,
      headGlow: 6,
      shape: "square",
    },
  },
  fire: {
    name: "Fire",
    description: "Warm ember sweep",
    params: {
      ...HILBERT_DEFAULT_PARAMS,
      backdrop: "mark",
      background: "#0c0604",
      cycleDuration: 3500,
      trailFraction: 0.22,
      lineWidth: 1.8,
      hueStart: 12,
      hueSpread: 35,
      headGlow: 10,
    },
  },
};

export interface HilbertLoaderProps extends LoaderProps {
  params?: Partial<HilbertLoaderParams>;
}

/** Circle: golden spiral tracer. Square: Hilbert space-fill. */
export function HilbertLoader({
  size = DEFAULT_SIZE,
  label,
  className,
  preset,
  shape: propShape,
  backdrop: propBackdrop,
  params: paramOverrides,
}: HilbertLoaderProps) {
  const p = useMemo(
    () =>
      resolveParams(
        HILBERT_DEFAULT_PARAMS,
        HILBERT_PRESETS,
        preset,
        paramOverrides,
      ),
    [preset, paramOverrides],
  );

  const shape = resolveShape(propShape, p, p.shape);
  const backdrop = resolveBackdrop(propBackdrop, p, p.backdrop);
  const mono = backdrop === "transparent" || p.hueSpread === 0;

  const hilbertRef = useRef<{ order: number; pts: { x: number; y: number }[] } | null>(null);
  const spiralRef = useRef<{ key: string; pts: { x: number; y: number }[] } | null>(null);

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, canvasSize: number, t: number) => {
      const frame = beginLoaderFrame(ctx, canvasSize, shape, p.background, {
        backdrop,
      });
      const { bounds } = frame;
      const { inset, size: span } = bounds;
      if (shouldDrawGuides(backdrop)) {
        drawLogoGuides(ctx, bounds, shape);
        if (shape === "circle") drawMobilRing(ctx, bounds, 0.08);
      }
      const progress = openProgress(t, p.cycleDuration);
      const halfW = p.trailFraction * 0.5;
      const sat = p.hueSpread === 0 ? 0 : 72;
      const baseStroke = `hsla(${p.hueStart}, ${sat}%, 42%, 1)`;
      const litStroke = `hsla(${p.hueStart + p.hueSpread * 0.5}, ${sat || 8}%, 28%, 1)`;

      let path: { x: number; y: number }[];
      if (shape === "circle") {
        const key = `${canvasSize}`;
        if (!spiralRef.current || spiralRef.current.key !== key) {
          spiralRef.current = {
            key,
            pts: buildGoldenSpiralPath(bounds, 4.5, 560),
          };
        }
        path = spiralRef.current.pts;
      } else {
        if (!hilbertRef.current || hilbertRef.current.order !== p.order) {
          hilbertRef.current = {
            order: p.order,
            pts: buildHilbertPoints(p.order),
          };
        }
        const grid = 1 << p.order;
        path = hilbertRef.current.pts.map((pt) => ({
          x: inset + (pt.x / (grid - 1)) * span,
          y: inset + (pt.y / (grid - 1)) * span,
        }));
      }

      if (mono) {
        drawPathPulseMono(ctx, path, progress, halfW, p.lineWidth, undefined, undefined, bounds, shape);
        const headIdx = Math.min(
          path.length - 1,
          Math.floor(progress * (path.length - 1)),
        );
        const hp = path[headIdx];
        drawPulseHead(ctx, hp.x, hp.y, p.headGlow * 0.5);
      } else {
        drawPathPulse(
          ctx,
          path,
          progress,
          halfW,
          baseStroke,
          litStroke,
          p.lineWidth,
        );
        const headIdx = Math.min(
          path.length - 1,
          Math.floor(progress * (path.length - 1)),
        );
        const hp = path[headIdx];
        ctx.fillStyle = `hsla(${p.hueStart}, ${sat || 5}%, 22%, 0.95)`;
        ctx.beginPath();
        ctx.arc(hp.x, hp.y, p.headGlow * 0.35, 0, Math.PI * 2);
        ctx.fill();
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
