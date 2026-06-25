import { useCallback, useMemo, useRef } from "react";
import { LoaderShell } from "../LoaderShell";
import { useCanvasLoop } from "../hooks/useCanvasLoop";
import type { LoaderBackdrop, LoaderProps } from "../types";
import { DEFAULT_SIZE } from "../types";
import { hslToRgb } from "../lib/color";
import { loopHue } from "../lib/loop";
import { getLoopState, nestedWave } from "../lib/loopEngine";
import { beginLoaderFrame, endLoaderFrame } from "../lib/loaderFrame";
import {
  diagonalLoopPhase,
  drawLogoGuides,
  drawMobilRing,
  radialLoopPhase,
} from "../lib/logoGrammar";
import { resolveParams, type PresetDefinition } from "../lib/presets";
import {
  LOADER_THEME,
  shouldDrawGuides,
} from "../lib/loaderTheme";
import { resolveBackdrop } from "../lib/resolveBackdrop";
import { resolveShape } from "../lib/resolveShape";
import {
  containsShape,
  type LoaderShape,
} from "../lib/shape";

const GRID = 128;

export type ReactionDiffusionColorMode = "color" | "mono" | "ink";

export interface ReactionDiffusionLoaderParams {
  /** Visual breathe / hue loop period (simulation never resets) */
  cycleDuration: number;
  feed: number;
  kill: number;
  diffusionA: number;
  diffusionB: number;
  seedRadius: number;
  threshold: number;
  hueSpeed: number;
  colorMode: ReactionDiffusionColorMode;
  background: [number, number, number];
  /** Tiny feed/kill oscillation — keeps the pattern from settling */
  feedWobble: number;
  killWobble: number;
  /** How often to drop new growth sparks (ms) */
  perturbInterval: number;
  perturbRadius: number;
  perturbCount: number;
  scanWidth: number;
  shape?: LoaderShape;
  backdrop?: LoaderBackdrop;
}

export const REACTION_DIFFUSION_DEFAULT_PARAMS: ReactionDiffusionLoaderParams =
  {
    cycleDuration: 7000,
    feed: 0.0545,
    kill: 0.062,
    diffusionA: 1.0,
    diffusionB: 0.5,
    seedRadius: 8,
    threshold: 0.1,
    hueSpeed: 0,
    colorMode: "mono",
    background: [0, 0, 0],
    feedWobble: 0.004,
    killWobble: 0.005,
    perturbInterval: 900,
    perturbRadius: 4,
    perturbCount: 3,
    scanWidth: 0.12,
    shape: "circle",
    backdrop: "transparent",
  };

export const REACTION_DIFFUSION_PRESETS: Record<
  string,
  PresetDefinition<ReactionDiffusionLoaderParams>
> = {
  loader: {
    name: "Loader",
    description: "Monochrome organic contour",
    params: REACTION_DIFFUSION_DEFAULT_PARAMS,
  },
  mark: {
    name: "Mark",
    description: "Organic growth on cream",
    params: {
      ...REACTION_DIFFUSION_DEFAULT_PARAMS,
      backdrop: "mark",
      background: [244, 242, 236],
      colorMode: "color",
      hueSpeed: 0.015,
      cycleDuration: 6000,
    },
  },
  mobil: {
    name: "Mobil",
    description: "Red radial bloom on cream",
    params: {
      ...REACTION_DIFFUSION_DEFAULT_PARAMS,
      cycleDuration: 5500,
      hueSpeed: 0.012,
      feed: 0.0545,
      kill: 0.062,
      seedRadius: 9,
      background: [244, 242, 236],
    },
  },
  labyrinth: {
    name: "Labyrinth",
    description: "Corner-seeded maze on paper",
    params: {
      cycleDuration: 8000,
      feed: 0.037,
      kill: 0.06,
      diffusionA: 1.0,
      diffusionB: 0.5,
      seedRadius: 6,
      threshold: 0.12,
      hueSpeed: 0,
      colorMode: "mono",
      background: [250, 250, 250],
      feedWobble: 0.003,
      killWobble: 0.004,
      perturbInterval: 1000,
      perturbRadius: 3,
      perturbCount: 4,
      scanWidth: 0.14,
      shape: "square",
    },
  },
  ink: {
    name: "Ink",
    description: "Veins on warm paper",
    params: {
      cycleDuration: 7000,
      feed: 0.039,
      kill: 0.058,
      diffusionA: 1.0,
      diffusionB: 0.5,
      seedRadius: 10,
      threshold: 0.11,
      hueSpeed: 0,
      colorMode: "ink",
      background: [245, 242, 235],
      feedWobble: 0.0035,
      killWobble: 0.0045,
      perturbInterval: 1400,
      perturbRadius: 5,
      perturbCount: 2,
      scanWidth: 0.1,
      shape: "square",
    },
  },
  midnight: {
    name: "Midnight",
    description: "Electric bloom on charcoal",
    params: {
      cycleDuration: 4500,
      feed: 0.055,
      kill: 0.062,
      diffusionA: 0.9,
      diffusionB: 0.45,
      seedRadius: 8,
      threshold: 0.09,
      hueSpeed: 0.04,
      colorMode: "color",
      background: [12, 12, 16],
      feedWobble: 0.005,
      killWobble: 0.006,
      perturbInterval: 700,
      perturbRadius: 4,
      perturbCount: 4,
      scanWidth: 0.11,
    },
  },
};

function seedBlob(
  b: Float32Array,
  cx: number,
  cy: number,
  radius: number,
) {
  const r2 = radius * radius;
  for (let y = Math.max(0, cy - radius); y < Math.min(GRID, cy + radius); y++) {
    for (let x = Math.max(0, cx - radius); x < Math.min(GRID, cx + radius); x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2) {
        b[y * GRID + x] = 1;
      }
    }
  }
}

function initialSeed(b: Float32Array, radius: number, shape: LoaderShape) {
  b.fill(0);
  const c = GRID / 2;
  seedBlob(b, c, c, radius);
  if (shape === "square") {
    const corner = Math.floor(GRID * 0.15);
    const r = radius * 0.55;
    seedBlob(b, corner, corner, r);
    seedBlob(b, GRID - corner, corner, r);
    seedBlob(b, corner, GRID - corner, r);
    seedBlob(b, GRID - corner, GRID - corner, r);
  }
}

/** Drop sparks along existing pattern edges or at random. */
function perturb(
  b: Float32Array,
  count: number,
  radius: number,
) {
  const candidates: number[] = [];
  for (let y = 2; y < GRID - 2; y++) {
    for (let x = 2; x < GRID - 2; x++) {
      const i = y * GRID + x;
      if (b[i] < 0.08) continue;
      const n =
        b[i - 1] + b[i + 1] + b[i - GRID] + b[i + GRID];
      if (n > 0.15 && n < 2.8) candidates.push(i);
    }
  }

  for (let n = 0; n < count; n++) {
    let cx: number;
    let cy: number;
    if (candidates.length > 0 && Math.random() < 0.8) {
      const i = candidates[(Math.random() * candidates.length) | 0];
      cx = i % GRID;
      cy = (i / GRID) | 0;
      const angle = Math.random() * Math.PI * 2;
      cx = Math.round(cx + Math.cos(angle) * (radius + 2));
      cy = Math.round(cy + Math.sin(angle) * (radius + 2));
    } else {
      cx = 8 + ((Math.random() * (GRID - 16)) | 0);
      cy = 8 + ((Math.random() * (GRID - 16)) | 0);
    }
    cx = Math.max(2, Math.min(GRID - 3, cx));
    cy = Math.max(2, Math.min(GRID - 3, cy));
    seedBlob(b, cx, cy, radius);
  }
}

function measureVitality(b: Float32Array) {
  let sum = 0;
  let peak = 0;
  for (let i = 0; i < b.length; i++) {
    sum += b[i];
    if (b[i] > peak) peak = b[i];
  }
  return { sum, peak };
}

/** Keep a thin veil of activator so the sim never fully flatlines. */
function sustainField(b: Float32Array, a: Float32Array) {
  for (let i = 0; i < b.length; i++) {
    if (Math.random() < 0.0008) {
      b[i] = Math.min(1, b[i] + 0.6);
      a[i] = Math.max(0.4, a[i]);
    }
  }
}

function isEdge(b: Float32Array, x: number, y: number, threshold: number): boolean {
  const i = y * GRID + x;
  if (b[i] <= threshold) return false;
  const neighbors = [
    b[i - 1],
    b[i + 1],
    b[i - GRID],
    b[i + GRID],
  ];
  return neighbors.some((n) => n <= threshold);
}

export interface ReactionDiffusionLoaderProps extends LoaderProps {
  params?: Partial<ReactionDiffusionLoaderParams>;
}

/** Circle: center seed + radial scan. Square: corner seeds + diagonal band. */
export function ReactionDiffusionLoader({
  size = DEFAULT_SIZE,
  shape: propShape,
  label,
  className,
  preset,
  backdrop: propBackdrop,
  params: paramOverrides,
}: ReactionDiffusionLoaderProps) {
  const p = useMemo(
    () =>
      resolveParams(
        REACTION_DIFFUSION_DEFAULT_PARAMS,
        REACTION_DIFFUSION_PRESETS,
        preset,
        paramOverrides,
      ),
    [preset, paramOverrides],
  );
  const shape = resolveShape(propShape, p, p.shape);
  const backdrop = resolveBackdrop(propBackdrop, p, p.backdrop);
  const contour = backdrop === "transparent";

  const stateRef = useRef<{
    a: Float32Array;
    b: Float32Array;
    nextA: Float32Array;
    nextB: Float32Array;
    imageData: ImageData;
    offscreen: HTMLCanvasElement;
    perturbTimer: number;
  } | null>(null);
  const paramsKeyRef = useRef("");

  const draw = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      canvasSize: number,
      t: number,
      dt: number,
    ) => {
      const paramsKey = `${p.feed}-${p.kill}-${p.seedRadius}-${p.colorMode}-${shape}`;
      if (paramsKeyRef.current !== paramsKey) {
        stateRef.current = null;
        paramsKeyRef.current = paramsKey;
      }

      const [bgR, bgG, bgB] = p.background;
      const bgColor = contour ? "transparent" : `rgb(${bgR}, ${bgG}, ${bgB})`;
      const frame = beginLoaderFrame(ctx, canvasSize, shape, bgColor, {
        backdrop,
      });
      const bounds = frame.bounds;
      if (shouldDrawGuides(backdrop)) {
        drawLogoGuides(ctx, bounds, shape);
        if (shape === "circle") drawMobilRing(ctx, bounds, 0.08);
      }

      if (!stateRef.current) {
        const n = GRID * GRID;
        const a = new Float32Array(n).fill(1);
        const b = new Float32Array(n);
        initialSeed(b, p.seedRadius, shape);
        const offscreen = document.createElement("canvas");
        offscreen.width = GRID;
        offscreen.height = GRID;
        stateRef.current = {
          a,
          b,
          nextA: new Float32Array(n),
          nextB: new Float32Array(n),
          imageData: ctx.createImageData(GRID, GRID),
          offscreen,
          perturbTimer: 0,
        };
      }

      const state = stateRef.current;
      const { a, b, nextA, nextB, imageData, offscreen } = state;

      state.perturbTimer += dt;
      const { progress, phase, sin: breathe } = getLoopState(t, p.cycleDuration);
      if (state.perturbTimer >= p.perturbInterval) {
        state.perturbTimer = 0;
        perturb(b, p.perturbCount, p.perturbRadius);
      }

      const feed = p.feed + Math.sin(phase) * p.feedWobble;
      const kill = p.kill + Math.cos(phase * 1.37) * p.killWobble;
      const breatheScale = 0.96 + 0.04 * breathe;
      const steps = Math.max(2, Math.min(8, Math.round(dt / 10)));

      for (let step = 0; step < steps; step++) {
        for (let y = 1; y < GRID - 1; y++) {
          for (let x = 1; x < GRID - 1; x++) {
            const i = y * GRID + x;
            const lapA =
              a[i - 1] + a[i + 1] + a[i - GRID] + a[i + GRID] - 4 * a[i];
            const lapB =
              b[i - 1] + b[i + 1] + b[i - GRID] + b[i + GRID] - 4 * b[i];
            const reaction = a[i] * b[i] * b[i];
            nextA[i] =
              a[i] + (p.diffusionA * lapA - reaction + feed * (1 - a[i]));
            nextB[i] =
              b[i] +
              (p.diffusionB * lapB + reaction - (kill + feed) * b[i]);
          }
        }
        a.set(nextA);
        b.set(nextB);
      }

      sustainField(b, a);

      const vitality = measureVitality(b);
      if (vitality.peak < 0.04 || vitality.sum < GRID * GRID * 0.002) {
        perturb(b, p.perturbCount * 2, p.perturbRadius + 2);
        if (vitality.peak < 0.015) {
          seedBlob(b, (GRID / 2) | 0, (GRID / 2) | 0, p.seedRadius);
        }
      }

      const data = imageData.data;
      const hueShift = loopHue(t, p.cycleDuration, p.hueSpeed / 0.015);

      for (let gy = 0; gy < GRID; gy++) {
        for (let gx = 0; gx < GRID; gx++) {
          const px = ((gx + 0.5) / GRID) * canvasSize;
          const py = ((gy + 0.5) / GRID) * canvasSize;
          const i = gy * GRID + gx;
          const idx = i * 4;

          if (!containsShape(px, py, bounds, shape)) {
            data[idx] = 0;
            data[idx + 1] = 0;
            data[idx + 2] = 0;
            data[idx + 3] = 0;
            continue;
          }

          const loopPhase =
            shape === "circle"
              ? radialLoopPhase(px, py, bounds, progress)
              : diagonalLoopPhase(px, py, bounds, progress);
          const scan = nestedWave(loopPhase, 0, p.scanWidth, 3);
          const edgeMask = 1;
          const v = Math.min(
            1,
            b[i] * breatheScale * (0.88 + scan * 0.14) * edgeMask,
          );

          if (contour) {
            if (v > p.threshold && isEdge(b, gx, gy, p.threshold)) {
              const eased = scan * scan * (3 - 2 * scan);
              const alpha = Math.round((0.06 + eased * 0.82) * 255);
              data[idx] = 255;
              data[idx + 1] = 255;
              data[idx + 2] = 255;
              data[idx + 3] = alpha;
            } else {
              data[idx] = 0;
              data[idx + 1] = 0;
              data[idx + 2] = 0;
              data[idx + 3] = 0;
            }
            continue;
          }

          if (v > p.threshold) {
            if (p.colorMode === "mono") {
              const g = Math.round(20 + v * 200);
              data[idx] = g;
              data[idx + 1] = g;
              data[idx + 2] = g;
            } else if (p.colorMode === "ink") {
              const k = Math.round(v * 220);
              data[idx] = Math.max(0, bgR - k);
              data[idx + 1] = Math.max(0, bgG - k);
              data[idx + 2] = Math.max(0, bgB - k);
            } else {
              const hue = (hueShift + v * 60) % 360;
              const sat = 55 + v * 25;
              const light = 28 + v * 42;
              const [r, g, bl] = hslToRgb(hue / 360, sat / 100, light / 100);
              data[idx] = r;
              data[idx + 1] = g;
              data[idx + 2] = bl;
            }
            data[idx + 3] = 255;
          } else {
            data[idx] = bgR;
            data[idx + 1] = bgG;
            data[idx + 2] = bgB;
            data[idx + 3] = 255;
          }
        }
      }

      offscreen.getContext("2d")!.putImageData(imageData, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(offscreen, 0, 0, canvasSize, canvasSize);
      endLoaderFrame(ctx, frame);
    },
    [p, shape, backdrop, contour],
  );

  const canvasRef = useCanvasLoop(draw, [p, shape, backdrop, contour], size);
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
