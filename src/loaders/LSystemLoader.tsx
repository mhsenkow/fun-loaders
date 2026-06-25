import { useCallback, useMemo, useRef } from "react";
import { LoaderShell } from "../LoaderShell";
import { useCanvasLoop } from "../hooks/useCanvasLoop";
import type { LoaderBackdrop, LoaderProps, LoaderShape } from "../types";
import { DEFAULT_SIZE } from "../types";
import { loopT } from "../lib/loop";
import { loopWindow } from "../lib/loopDraw";
import { beginLoaderFrame, endLoaderFrame } from "../lib/loaderFrame";
import {
  drawLogoGuides,
  drawMobilRing,
  drawPulseHead,
} from "../lib/logoGrammar";
import { resolveParams, type PresetDefinition } from "../lib/presets";
import {
  LOADER_GLOW,
  LOADER_THEME,
  shouldDrawGuides,
} from "../lib/loaderTheme";
import { strokeSegment } from "../lib/loaderPaint";
import { resolveBackdrop } from "../lib/resolveBackdrop";
import { resolveShape } from "../lib/resolveShape";
import { getShapeBounds, shapeRadius, type ShapeBounds } from "../lib/shape";

interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  depth: number;
}

interface Layout {
  scale: number;
  ox: number;
  oy: number;
}

const MAX_SEGMENTS = 2200;
const MAX_EXPAND_CHARS = 24_000;

/** Expand only as far as needed; never allocate megabyte strings. */
function expandCapped(
  axiom: string,
  rules: Record<string, string>,
  iterations: number,
): string {
  let current = axiom || "F";
  for (let i = 0; i < iterations; i++) {
    let next = "";
    for (let j = 0; j < current.length; j++) {
      next += rules[current[j]] ?? current[j];
      if (next.length >= MAX_EXPAND_CHARS) return next;
    }
    current = next;
  }
  return current;
}

function parseToSegments(
  instructions: string,
  angle: number,
  step: number,
): Segment[] {
  const segments: Segment[] = [];
  const stack: { x: number; y: number; angle: number; depth: number }[] = [];
  let x = 0;
  let y = 0;
  let dir = -Math.PI / 2;
  let depth = 0;

  for (let i = 0; i < instructions.length; i++) {
    if (segments.length >= MAX_SEGMENTS) break;
    const ch = instructions[i];
    if (ch === "F") {
      const nx = x + Math.cos(dir) * step;
      const ny = y + Math.sin(dir) * step;
      segments.push({ x1: x, y1: y, x2: nx, y2: ny, depth });
      x = nx;
      y = ny;
    } else if (ch === "+") {
      dir += angle;
    } else if (ch === "-") {
      dir -= angle;
    } else if (ch === "[") {
      stack.push({ x, y, angle: dir, depth });
      depth++;
    } else if (ch === "]") {
      const state = stack.pop();
      if (state) {
        x = state.x;
        y = state.y;
        dir = state.angle;
        depth = state.depth;
      }
    }
  }
  return segments;
}

function computeLayout(
  segments: Segment[],
  bounds: ShapeBounds,
  shape: LoaderShape,
): Layout {
  if (segments.length === 0) {
    return { scale: 1, ox: bounds.cx, oy: bounds.cy };
  }
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const s of segments) {
    minX = Math.min(minX, s.x1, s.x2);
    maxX = Math.max(maxX, s.x1, s.x2);
    minY = Math.min(minY, s.y1, s.y2);
    maxY = Math.max(maxY, s.y1, s.y2);
  }
  const w = maxX - minX;
  const h = maxY - minY;
  const safeW = Number.isFinite(w) && w > 0 ? w : 1;
  const safeH = Number.isFinite(h) && h > 0 ? h : 1;
  const margin = bounds.size * (shape === "circle" ? 0.14 : 0.08);
  const scale = Math.min(
    (bounds.size - margin * 2) / safeW,
    (bounds.size - margin * 2) / safeH,
  );
  const ox = bounds.cx - ((minX + maxX) / 2) * scale;
  const oy =
    shape === "circle"
      ? bounds.cy + bounds.half * 0.42 - maxY * scale
      : bounds.inset + bounds.size - margin - maxY * scale;
  return { scale, ox, oy };
}

function normalizeRuleSet(
  ruleSet: Partial<LSystemRuleSet> | undefined,
): LSystemRuleSet {
  const fallback = FERN_RULES;
  if (!ruleSet || typeof ruleSet !== "object") {
    return { ...fallback, rules: { ...fallback.rules } };
  }
  return {
    axiom: typeof ruleSet.axiom === "string" ? ruleSet.axiom : fallback.axiom,
    rules: { ...fallback.rules, ...(ruleSet.rules ?? {}) },
    iterations: Math.min(
      4,
      Math.max(1, Math.round(ruleSet.iterations ?? fallback.iterations)),
    ),
    angle: Number.isFinite(ruleSet.angle) ? ruleSet.angle! : fallback.angle,
    step: Number.isFinite(ruleSet.step) ? ruleSet.step! : fallback.step,
  };
}

function adaptRuleSetForShape(
  ruleSet: LSystemRuleSet,
  shape: LoaderShape,
): LSystemRuleSet {
  if (shape === "square") {
    return {
      ...ruleSet,
      angle: Math.PI / 2,
      rules: {
        ...ruleSet.rules,
        F: "F[+F]F[-F]F",
      },
    };
  }
  return {
    ...ruleSet,
    rules: {
      ...ruleSet.rules,
      F: ruleSet.rules.F?.includes("[+F][-F]") ? ruleSet.rules.F : "F[+F][-F]F",
    },
  };
}

function buildSegments(ruleSet: LSystemRuleSet, shape: LoaderShape): Segment[] {
  const normalized = normalizeRuleSet(ruleSet);
  const adapted = adaptRuleSetForShape(normalized, shape);
  const instr = expandCapped(
    adapted.axiom,
    adapted.rules,
    adapted.iterations,
  );
  return parseToSegments(instr, adapted.angle, adapted.step);
}

function renderBaseTree(
  ctx: CanvasRenderingContext2D,
  canvasSize: number,
  segments: Segment[],
  layout: Layout,
  hueBase: number,
  hueSpread: number,
  background: string,
  shape: LoaderShape,
  backdrop: LoaderBackdrop,
) {
  const { scale, ox, oy } = layout;
  const frame = beginLoaderFrame(ctx, canvasSize, shape, background, { backdrop });

  const total = segments.length;
  if (total === 0) {
    endLoaderFrame(ctx, frame);
    return;
  }

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  for (let i = 0; i < total; i++) {
    const s = segments[i];
    const x1 = s.x1 * scale + ox;
    const y1 = s.y1 * scale + oy;
    const x2 = s.x2 * scale + ox;
    const y2 = s.y2 * scale + oy;
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
  }
  ctx.strokeStyle =
    backdrop === "transparent" ? LOADER_THEME.ghost : `hsla(${hueBase}, 55%, 42%, 0.14)`;
  ctx.lineWidth = 1.1;
  ctx.stroke();
  endLoaderFrame(ctx, frame);
}

export interface LSystemRuleSet {
  axiom: string;
  rules: Record<string, string>;
  iterations: number;
  angle: number;
  step: number;
}

export interface LSystemLoaderParams {
  cycleDuration: number;
  ruleSet: LSystemRuleSet;
  hueBase: number;
  hueSpread: number;
  trailFraction: number;
  background: string;
  shape?: LoaderShape;
  backdrop?: LoaderBackdrop;
}

const FERN_RULES: LSystemRuleSet = {
  axiom: "F",
  rules: { F: "F[+F][-F]F", "+": "+", "-": "-" },
  iterations: 3,
  angle: Math.PI / 6,
  step: 4,
};

export const LSYSTEM_DEFAULT_PARAMS: LSystemLoaderParams = {
  cycleDuration: 4500,
  ruleSet: FERN_RULES,
  hueBase: 0,
  hueSpread: 0,
  trailFraction: 0.16,
  background: "transparent",
  shape: "circle",
  backdrop: "transparent",
};

export const LSYSTEM_PRESETS: Record<
  string,
  PresetDefinition<LSystemLoaderParams>
> = {
  loader: {
    name: "Loader",
    description: "Monochrome branching pulse",
    params: LSYSTEM_DEFAULT_PARAMS,
  },
  ink: {
    name: "Ink",
    description: "Tree on cream mark",
    params: {
      ...LSYSTEM_DEFAULT_PARAMS,
      backdrop: "mark",
      background: "#f4f2ec",
      hueBase: 130,
      hueSpread: 20,
      cycleDuration: 4000,
    },
  },
  fern: {
    name: "Fern",
    description: "Classic branching green fern",
    params: {
      cycleDuration: 4000,
      ruleSet: FERN_RULES,
      hueBase: 100,
      hueSpread: 80,
      trailFraction: 0.18,
      background: "#060810",
    },
  },
  bush: {
    name: "Bush",
    description: "Dense shrub growth",
    params: {
      cycleDuration: 5000,
      ruleSet: {
        axiom: "F",
        rules: { F: "FF+[+F-F-F]-[-F+F+F]", "+": "+", "-": "-" },
        iterations: 3,
        angle: Math.PI / 7,
        step: 5,
      },
      hueBase: 80,
      hueSpread: 50,
      trailFraction: 0.22,
      background: "#081006",
    },
  },
  alien: {
    name: "Alien",
    description: "Angular sci-fi branches",
    params: {
      cycleDuration: 3500,
      ruleSet: {
        axiom: "F",
        rules: { F: "F[+F][-F][F]", "+": "+", "-": "-" },
        iterations: 3,
        angle: Math.PI / 4,
        step: 3,
      },
      hueBase: 280,
      hueSpread: 60,
      trailFraction: 0.15,
      background: "#08040f",
    },
  },
  winter: {
    name: "Winter",
    description: "Bare white tree skeleton",
    params: {
      cycleDuration: 4500,
      ruleSet: {
        axiom: "F",
        rules: { F: "F[+F]F[-F]F", "+": "+", "-": "-" },
        iterations: 3,
        angle: Math.PI / 5,
        step: 3.5,
      },
      hueBase: 210,
      hueSpread: 15,
      trailFraction: 0.2,
      background: "#0a0c10",
    },
  },
  "neon-vine": {
    name: "Neon Vine",
    description: "Hot pink fast-growing tendrils",
    params: {
      cycleDuration: 2800,
      ruleSet: {
        axiom: "F",
        rules: { F: "F[+F][-F]", "+": "+", "-": "-" },
        iterations: 4,
        angle: Math.PI / 5.5,
        step: 3,
      },
      hueBase: 320,
      hueSpread: 40,
      trailFraction: 0.14,
      background: "#0a0008",
    },
  },
};

export interface LSystemLoaderProps extends LoaderProps {
  params?: Partial<LSystemLoaderParams>;
}

/** L-system — cached tree + lightweight traveling pulse. */
export function LSystemLoader({
  size = DEFAULT_SIZE,
  label,
  className,
  preset,
  shape: propShape,
  backdrop: propBackdrop,
  params: paramOverrides,
}: LSystemLoaderProps) {
  const p = useMemo(
    () =>
      resolveParams(
        LSYSTEM_DEFAULT_PARAMS,
        LSYSTEM_PRESETS,
        preset,
        paramOverrides,
      ),
    [preset, paramOverrides],
  );

  const shape = resolveShape(propShape, p, p.shape);
  const backdrop = resolveBackdrop(propBackdrop, p, p.backdrop);
  const mono = backdrop === "transparent" || p.hueSpread === 0;

  const ruleKey = JSON.stringify(p.ruleSet);

  const ruleSet = useMemo(
    () => normalizeRuleSet(p.ruleSet),
    [ruleKey],
  );
  const segments = useMemo(
    () => buildSegments(ruleSet, shape),
    [ruleSet, shape],
  );

  const cacheRef = useRef<{
    key: string;
    canvas: HTMLCanvasElement;
    layout: Layout;
  } | null>(null);

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, canvasSize: number, t: number) => {
      const bounds = getShapeBounds(canvasSize);
      const cacheKey = `${ruleKey}-${p.hueBase}-${p.hueSpread}-${p.background}-${shape}-${canvasSize}-${backdrop}`;
      if (!cacheRef.current || cacheRef.current.key !== cacheKey) {
        const layout = computeLayout(segments, bounds, shape);
        const canvas = document.createElement("canvas");
        canvas.width = canvasSize;
        canvas.height = canvasSize;
        const baseCtx = canvas.getContext("2d")!;
        renderBaseTree(
          baseCtx,
          canvasSize,
          segments,
          layout,
          p.hueBase,
          p.hueSpread,
          p.background,
          shape,
          backdrop,
        );
        cacheRef.current = { key: cacheKey, canvas, layout };
      }

      const { canvas, layout } = cacheRef.current;
      const { scale, ox, oy } = layout;

      const frame = beginLoaderFrame(ctx, canvasSize, shape, p.background, { backdrop });
      if (shouldDrawGuides(backdrop)) {
        drawLogoGuides(ctx, bounds, shape);
        if (shape === "circle") drawMobilRing(ctx, bounds, 0.07);
      }
      ctx.drawImage(canvas, 0, 0, canvasSize, canvasSize);

      const total = segments.length;
      if (total === 0) {
        endLoaderFrame(ctx, frame);
        return;
      }

      const progress = loopT(t, p.cycleDuration);
      const halfW = p.trailFraction * 0.5;

      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      for (let i = 0; i < total; i++) {
        const s = segments[i];
        const mx = (s.x1 + s.x2) * 0.5 * scale + ox;
        const my = (s.y1 + s.y2) * 0.5 * scale + oy;
        const spatial =
          shape === "circle"
            ? loopWindow(shapeRadius(mx, my, bounds, shape), progress, halfW)
            : loopWindow(
                ((mx - bounds.inset) / bounds.size +
                  (my - bounds.inset) / bounds.size) *
                  0.5,
                progress,
                halfW,
              );
        const segBright = loopWindow(i / total, progress, halfW);
        const combined = Math.max(spatial * 0.65, segBright);
        if (combined < 0.04) continue;

        const x1 = s.x1 * scale + ox;
        const y1 = s.y1 * scale + oy;
        const x2 = s.x2 * scale + ox;
        const y2 = s.y2 * scale + oy;

        if (mono) {
          const lit = combined > 0.12;
          strokeSegment(
            ctx,
            x1,
            y1,
            x2,
            y2,
            lit ? LOADER_THEME.pulse : LOADER_THEME.ghost,
            Math.max(0.5, 1.4 - s.depth * 0.25 + combined * 1.1),
            lit ? 0.15 + combined * 0.65 : 0.05,
            lit ? combined * LOADER_GLOW.pulse : 0,
          );
          continue;
        }

        ctx.strokeStyle = `hsla(${p.hueBase + s.depth * 35 + (i / total) * p.hueSpread}, 78%, ${42 + s.depth * 10 + combined * 22}%, ${0.25 + combined * 0.75})`;
        ctx.lineWidth = Math.max(0.6, 1.8 - s.depth * 0.3 + combined * 1.2);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      const headIdx = Math.min(total - 1, Math.floor(progress * total));
      const head = segments[headIdx];
      if (head) {
        const frac = progress * total - headIdx;
        const hx = head.x1 + (head.x2 - head.x1) * frac;
        const hy = head.y1 + (head.y2 - head.y1) * frac;
        if (mono) {
          drawPulseHead(ctx, hx * scale + ox, hy * scale + oy, 3.5);
        } else {
          ctx.fillStyle = `hsla(${p.hueBase + 50}, 92%, 72%, 0.95)`;
          ctx.beginPath();
          ctx.arc(hx * scale + ox, hy * scale + oy, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      endLoaderFrame(ctx, frame);
    },
    [p, ruleKey, segments, shape, backdrop, mono],
  );

  const canvasRef = useCanvasLoop(draw, [p, segments, shape, backdrop, mono], size);
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
