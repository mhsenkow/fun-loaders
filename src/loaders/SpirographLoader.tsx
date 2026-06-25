import { useCallback, useMemo, useRef } from "react";
import { LoaderShell } from "../LoaderShell";
import { useCanvasLoop } from "../hooks/useCanvasLoop";
import type { LoaderBackdrop, LoaderProps, LoaderShape } from "../types";
import { DEFAULT_SIZE } from "../types";
import { loopHue, loopT } from "../lib/loop";
import { beginLoaderFrame, endLoaderFrame } from "../lib/loaderFrame";
import {
  drawLogoGuides,
  drawMobilRing,
  fadeTrailsTransparent,
  nestedSquarePoint,
} from "../lib/logoGrammar";
import {
  LOADER_GLOW,
  LOADER_THEME,
  isTransparentBackdrop,
  shouldDrawGuides,
} from "../lib/loaderTheme";
import { drawSoftGlow, strokeSegment } from "../lib/loaderPaint";
import { resolveBackdrop } from "../lib/resolveBackdrop";
import { resolveParams, type PresetDefinition } from "../lib/presets";
import { resolveShape } from "../lib/resolveShape";
import { clipShape, getShapeBounds, type ShapeBounds } from "../lib/shape";

export interface SpirographLoaderParams {
  cycleDuration: number;
  ringRatio: number;
  penOffset: number;
  layers: number;
  rotations: number;
  lineWidth: number;
  hueSpeed: number;
  trailFade: number;
  background: string;
  shape?: LoaderShape;
  backdrop?: LoaderBackdrop;
}

export const SPIROGRAPH_DEFAULT_PARAMS: SpirographLoaderParams = {
  cycleDuration: 3800,
  ringRatio: 0.32,
  penOffset: 0.58,
  layers: 2,
  rotations: 5,
  lineWidth: 1.4,
  hueSpeed: 0,
  trailFade: 0.06,
  background: "transparent",
  shape: "circle",
  backdrop: "transparent",
};

export const SPIROGRAPH_PRESETS: Record<
  string,
  PresetDefinition<SpirographLoaderParams>
> = {
  loader: {
    name: "Loader",
    description: "Monochrome ink trails",
    params: SPIROGRAPH_DEFAULT_PARAMS,
  },
  classic: {
    name: "Classic",
    description: "Hypotrochoid in disc / nested squares",
    params: {
      ...SPIROGRAPH_DEFAULT_PARAMS,
      backdrop: "mark",
      background: "#f4f2ec",
      layers: 3,
      lineWidth: 1.6,
      hueSpeed: 0.02,
      cycleDuration: 3200,
    },
  },
  tight: {
    name: "Tight",
    description: "Dense inner loops",
    params: {
      ...SPIROGRAPH_DEFAULT_PARAMS,
      cycleDuration: 2500,
      ringRatio: 0.22,
      penOffset: 0.35,
      layers: 2,
      rotations: 8,
      lineWidth: 1.8,
    },
  },
  rose: {
    name: "Rose",
    description: "Soft floral mark",
    params: {
      ...SPIROGRAPH_DEFAULT_PARAMS,
      backdrop: "mark",
      background: "#f4f2ec",
      cycleDuration: 3500,
      ringRatio: 0.28,
      penOffset: 0.5,
      layers: 2,
      rotations: 6,
      lineWidth: 1.8,
      hueSpeed: 0.015,
    },
  },
  hypno: {
    name: "Hypno",
    description: "Fast monochrome spiral",
    params: {
      ...SPIROGRAPH_DEFAULT_PARAMS,
      cycleDuration: 2000,
      ringRatio: 0.38,
      penOffset: 0.7,
      layers: 3,
      rotations: 13,
      lineWidth: 1.2,
      trailFade: 0.08,
    },
  },
};

function hypotrochoid(
  theta: number,
  R: number,
  r: number,
  d: number,
  cx: number,
  cy: number,
) {
  const k = (R - r) / r;
  const x = (R - r) * Math.cos(theta) + d * Math.cos(k * theta);
  const y = (R - r) * Math.sin(theta) - d * Math.sin(k * theta);
  return { x: cx + x, y: cy + y };
}

function circlePoint(
  theta: number,
  bounds: ShapeBounds,
  ringRatio: number,
  penOffset: number,
  layer: number,
  layerScale: number,
) {
  const { cx, cy, half } = bounds;
  const R = half * 0.95;
  const r = half * ringRatio * layerScale;
  const d = half * penOffset * 0.95 * layerScale;
  return hypotrochoid(theta, R, r, d, cx, cy);
}

function curvePoint(
  u: number,
  bounds: ShapeBounds,
  shape: LoaderShape,
  ringRatio: number,
  penOffset: number,
  layer: number,
  layerScale: number,
  layers: number,
) {
  if (shape === "square") {
    return nestedSquarePoint(u, bounds, layer, layers);
  }
  return circlePoint(u, bounds, ringRatio, penOffset, layer, layerScale);
}

function drawCurveArc(
  ctx: CanvasRenderingContext2D,
  bounds: ShapeBounds,
  shape: LoaderShape,
  u0: number,
  u1: number,
  ringRatio: number,
  penOffset: number,
  layer: number,
  layerScale: number,
  layers: number,
  stroke: string,
  lineWidth: number,
  steps: number,
  mono = false,
) {
  const span = u1 - u0;
  if (span <= 0) return;

  const segs = Math.max(
    2,
    Math.ceil(steps * (span / (shape === "square" ? 1 : Math.PI * 2))),
  );
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= segs; i++) {
    const u = u0 + (span * i) / segs;
    pts.push(
      curvePoint(u, bounds, shape, ringRatio, penOffset, layer, layerScale, layers),
    );
  }

  if (mono) {
    const alpha = layer === 0 ? 0.55 : 0.08;
    const glow = layer === 0 ? LOADER_GLOW.soft : 0;
    for (let i = 1; i < pts.length; i++) {
      strokeSegment(
        ctx,
        pts[i - 1].x,
        pts[i - 1].y,
        pts[i].x,
        pts[i].y,
        stroke,
        lineWidth,
        alpha,
        glow,
      );
    }
    return;
  }

  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i].x, pts[i].y);
  }
  ctx.stroke();
}

function parseBgRgb(bg: string): [number, number, number] {
  if (bg.startsWith("#") && bg.length >= 7) {
    return [
      parseInt(bg.slice(1, 3), 16) || 244,
      parseInt(bg.slice(3, 5), 16) || 242,
      parseInt(bg.slice(5, 7), 16) || 236,
    ];
  }
  return [244, 242, 236];
}

export interface SpirographLoaderProps extends LoaderProps {
  params?: Partial<SpirographLoaderParams>;
}

export function SpirographLoader({
  size = DEFAULT_SIZE,
  label,
  className,
  preset,
  shape: propShape,
  backdrop: propBackdrop,
  params: paramOverrides,
}: SpirographLoaderProps) {
  const p = useMemo(
    () =>
      resolveParams(
        SPIROGRAPH_DEFAULT_PARAMS,
        SPIROGRAPH_PRESETS,
        preset,
        paramOverrides,
      ),
    [preset, paramOverrides],
  );

  const shape = resolveShape(propShape, p, p.shape);
  const backdrop = resolveBackdrop(propBackdrop, p, p.backdrop);
  const mono = backdrop === "transparent" || p.hueSpeed === 0;

  const lastProgressRef = useRef(0);
  const paramsKeyRef = useRef("");
  const primedRef = useRef(false);

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, canvasSize: number, t: number) => {
      const key = `${p.cycleDuration}-${p.rotations}-${p.layers}-${shape}-${p.background}-${backdrop}`;
      const bounds = getShapeBounds(canvasSize);
      const [br, bgG, bgB] = parseBgRgb(p.background);
      const inkHue = mono ? 0 : loopHue(t, p.cycleDuration, p.hueSpeed * 0.3);

      if (paramsKeyRef.current !== key) {
        paramsKeyRef.current = key;
        lastProgressRef.current = loopT(t, p.cycleDuration);
        primedRef.current = false;
      }

      if (!primedRef.current) {
        const prime = beginLoaderFrame(ctx, canvasSize, shape, p.background, {
          backdrop,
        });
        endLoaderFrame(ctx, prime);
        primedRef.current = true;
      }

      const frame = beginLoaderFrame(ctx, canvasSize, shape, p.background, {
        backdrop,
      });

      if (isTransparentBackdrop(backdrop)) {
        fadeTrailsTransparent(ctx, bounds, p.trailFade);
      } else {
        ctx.save();
        clipShape(ctx, bounds, shape);
        ctx.fillStyle = `rgba(${br},${bgG},${bgB},${p.trailFade})`;
        ctx.fillRect(bounds.inset, bounds.inset, bounds.size, bounds.size);
        ctx.restore();
      }

      if (shouldDrawGuides(backdrop)) {
        drawLogoGuides(ctx, bounds, shape);
        if (shape === "circle") drawMobilRing(ctx, bounds, 0.1);
      }

      const progress = loopT(t, p.cycleDuration);
      const last = lastProgressRef.current;
      const tau = shape === "square" ? 1 : Math.PI * 2 * p.rotations;
      const uEnd = progress * tau;
      const uStart = last * tau;

      const drawLayers = (t0: number, t1: number, steps: number) => {
        for (let layer = 0; layer < p.layers; layer++) {
          const layerScale = 1 - layer * 0.11;
          const stroke = mono
            ? layer === 0
              ? LOADER_THEME.pulse
              : LOADER_THEME.ghostStrong
            : `hsla(${inkHue + layer * 18}, 42%, ${28 + layer * 4}%, 0.88)`;
          drawCurveArc(
            ctx,
            bounds,
            shape,
            t0,
            t1,
            p.ringRatio,
            p.penOffset,
            layer,
            layerScale,
            p.layers,
            stroke,
            p.lineWidth - layer * 0.12,
            steps,
            mono,
          );
        }
      };

      if (progress < last - 0.001) {
        drawLayers(uStart, tau, 48);
        drawLayers(0, uEnd, 48);
      } else if (uEnd > uStart) {
        drawLayers(uStart, uEnd, 64);
      }

      lastProgressRef.current = progress;

      const head = curvePoint(
        uEnd,
        bounds,
        shape,
        p.ringRatio,
        p.penOffset,
        0,
        0.85,
        p.layers,
      );
      if (mono) {
        drawSoftGlow(ctx, head.x, head.y, 4, LOADER_THEME.headCore);
      } else {
        ctx.fillStyle = `hsla(${inkHue}, 8%, 22%, 0.92)`;
        ctx.beginPath();
        ctx.arc(head.x, head.y, 4, 0, Math.PI * 2);
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
