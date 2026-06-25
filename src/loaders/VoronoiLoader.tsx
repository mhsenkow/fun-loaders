import { useCallback, useMemo, useRef } from "react";
import { LoaderShell } from "../LoaderShell";
import { useCanvasLoop } from "../hooks/useCanvasLoop";
import type { LoaderBackdrop, LoaderProps } from "../types";
import { DEFAULT_SIZE } from "../types";
import { getLoopState, nestedWave } from "../lib/loopEngine";
import { beginLoaderFrame, endLoaderFrame } from "../lib/loaderFrame";
import {
  diagonalLoopPhase,
  drawLogoGuides,
  drawMobilRing,
  gridSites,
  radialLoopPhase,
  radialSites,
  type Point2,
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
import { containsShape, type LoaderShape } from "../lib/shape";

export interface VoronoiLoaderParams {
  cycleDuration: number;
  siteCount: number;
  resolution: number;
  waveWidth: number;
  hueBase: number;
  hueSpread: number;
  saturation: number;
  lightness: number;
  showSites: boolean;
  background: string;
  shape?: LoaderShape;
  backdrop?: LoaderBackdrop;
}

export const VORONOI_DEFAULT_PARAMS: VoronoiLoaderParams = {
  cycleDuration: 4200,
  siteCount: 18,
  resolution: 64,
  waveWidth: 0.16,
  hueBase: 0,
  hueSpread: 0,
  saturation: 0,
  lightness: 46,
  showSites: false,
  background: "transparent",
  shape: "circle",
  backdrop: "transparent",
};

export const VORONOI_PRESETS: Record<
  string,
  PresetDefinition<VoronoiLoaderParams>
> = {
  loader: {
    name: "Loader",
    description: "Monochrome cell borders",
    params: VORONOI_DEFAULT_PARAMS,
  },
  mark: {
    name: "Mark",
    description: "Mobil petrochemical cells on cream",
    params: {
      ...VORONOI_DEFAULT_PARAMS,
      backdrop: "mark",
      background: "#f4f2ec",
      resolution: 80,
      hueSpread: 18,
      saturation: 72,
      cycleDuration: 4000,
    },
  },
  mobil: {
    name: "Mobil",
    description: "Red radial pulse from hub",
    params: {
      ...VORONOI_DEFAULT_PARAMS,
      cycleDuration: 3200,
      siteCount: 16,
      hueBase: 0,
      hueSpread: 12,
      saturation: 78,
      lightness: 48,
      waveWidth: 0.14,
    },
  },
  grid: {
    name: "Grid",
    description: "IBM modular cells, diagonal sweep",
    params: {
      ...VORONOI_DEFAULT_PARAMS,
      shape: "square",
      cycleDuration: 3600,
      siteCount: 16,
      hueBase: 215,
      hueSpread: 22,
      saturation: 38,
      lightness: 42,
      background: "#f0f0f0",
      waveWidth: 0.12,
    },
  },
  midnight: {
    name: "Midnight",
    description: "Blue modules on charcoal",
    params: {
      ...VORONOI_DEFAULT_PARAMS,
      shape: "square",
      cycleDuration: 4200,
      siteCount: 20,
      hueBase: 215,
      hueSpread: 28,
      saturation: 48,
      lightness: 50,
      background: "#0c0c10",
      waveWidth: 0.15,
    },
  },
  frost: {
    name: "Frost",
    description: "Pale rings in a white disc",
    params: {
      ...VORONOI_DEFAULT_PARAMS,
      cycleDuration: 5000,
      siteCount: 14,
      hueBase: 200,
      hueSpread: 8,
      saturation: 14,
      lightness: 58,
      background: "#ffffff",
      waveWidth: 0.2,
    },
  },
};

function buildSites(count: number, shape: LoaderShape): Point2[] {
  return shape === "circle"
    ? radialSites(count, 0.32)
    : gridSites(count, 0.14);
}

export interface VoronoiLoaderProps extends LoaderProps {
  params?: Partial<VoronoiLoaderParams>;
}

/** Circle: radial hub sites + ring pulse. Square: grid sites + diagonal sweep. */
export function VoronoiLoader({
  size = DEFAULT_SIZE,
  shape: propShape,
  label,
  className,
  preset,
  backdrop: propBackdrop,
  params: paramOverrides,
}: VoronoiLoaderProps) {
  const p = useMemo(
    () =>
      resolveParams(
        VORONOI_DEFAULT_PARAMS,
        VORONOI_PRESETS,
        preset,
        paramOverrides,
      ),
    [preset, paramOverrides],
  );
  const shape = resolveShape(propShape, p, p.shape);
  const backdrop = resolveBackdrop(propBackdrop, p, p.backdrop);
  const mono = backdrop === "transparent" || p.saturation === 0;

  const sitesRef = useRef<Point2[]>(buildSites(p.siteCount, shape));
  const keyRef = useRef(`${p.siteCount}-${shape}`);
  if (keyRef.current !== `${p.siteCount}-${shape}`) {
    sitesRef.current = buildSites(p.siteCount, shape);
    keyRef.current = `${p.siteCount}-${shape}`;
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

      const sites = sitesRef.current;
      const { progress, sin: breathe } = getLoopState(t, p.cycleDuration);
      const res = p.resolution;
      const cellW = canvasSize / res;
      const cellH = canvasSize / res;
      const nearestGrid = new Uint16Array(res * res);

      for (let gy = 0; gy < res; gy++) {
        for (let gx = 0; gx < res; gx++) {
          const pxNorm = (gx + 0.5) / res;
          const pyNorm = (gy + 0.5) / res;
          let minDist = Infinity;
          let nearest = 0;
          for (let i = 0; i < sites.length; i++) {
            const dx = pxNorm - sites[i].x;
            const dy = pyNorm - sites[i].y;
            const d = dx * dx + dy * dy;
            if (d < minDist) {
              minDist = d;
              nearest = i;
            }
          }
          nearestGrid[gy * res + gx] = nearest;
        }
      }

      if (!mono) {
        for (let gy = 0; gy < res; gy++) {
          for (let gx = 0; gx < res; gx++) {
            const px = ((gx + 0.5) / res) * canvasSize;
            const py = ((gy + 0.5) / res) * canvasSize;
            if (!containsShape(px, py, bounds, shape)) continue;

            const nearest = nearestGrid[gy * res + gx];
            const loopPhase =
              shape === "circle"
                ? radialLoopPhase(px, py, bounds, progress)
                : diagonalLoopPhase(px, py, bounds, progress);
            const wave = nestedWave(loopPhase, 0, p.waveWidth, 3);
            const idle =
              0.12 + 0.06 * breathe * Math.sin(progress * Math.PI * 2 + nearest * 0.4);
            const pulse = idle + wave * (1 - idle);
            const hue =
              (p.hueBase + nearest * (p.hueSpread / Math.max(1, sites.length - 1))) %
              360;
            const light = p.lightness + pulse * 24;
            const alpha = 0.22 + pulse * 0.72;

            ctx.fillStyle = `hsla(${hue}, ${p.saturation}%, ${light}%, ${alpha})`;
            ctx.fillRect(gx * cellW, gy * cellH, cellW + 0.5, cellH + 0.5);
          }
        }
      }


      for (let gy = 0; gy < res; gy++) {
        for (let gx = 0; gx < res; gx++) {
          const px = ((gx + 0.5) / res) * canvasSize;
          const py = ((gy + 0.5) / res) * canvasSize;
          if (!containsShape(px, py, bounds, shape)) continue;
          const here = nearestGrid[gy * res + gx];
          const loopPhase =
            shape === "circle"
              ? radialLoopPhase(px, py, bounds, progress)
              : diagonalLoopPhase(px, py, bounds, progress);
          const wave = nestedWave(loopPhase, 0, p.waveWidth, 3);
          const pulse = 0.15 + wave * 0.85;
          const lit = pulse > 0.4;
          const color = mono
            ? lit
              ? LOADER_THEME.pulse
              : LOADER_THEME.ghost
            : "rgba(0,0,0,0.14)";
          const alpha = mono ? (lit ? 0.25 + pulse * 0.5 : 0.05) : 0.14;
          const glow = mono && lit ? LOADER_GLOW.soft * pulse : 0;
          if (gx + 1 < res) {
            const px2 = ((gx + 1.5) / res) * canvasSize;
            const py2 = py;
            if (
              containsShape(px2, py2, bounds, shape) &&
              nearestGrid[gy * res + gx + 1] !== here
            ) {
              strokeSegment(
                ctx,
                (gx + 1) * cellW,
                gy * cellH,
                (gx + 1) * cellW,
                (gy + 1) * cellH,
                color,
                0.65,
                alpha,
                glow,
              );
            }
          }
          if (gy + 1 < res) {
            const px2 = px;
            const py2 = ((gy + 1.5) / res) * canvasSize;
            if (
              containsShape(px2, py2, bounds, shape) &&
              nearestGrid[(gy + 1) * res + gx] !== here
            ) {
              strokeSegment(
                ctx,
                gx * cellW,
                (gy + 1) * cellH,
                (gx + 1) * cellW,
                (gy + 1) * cellH,
                color,
                0.65,
                alpha,
                glow,
              );
            }
          }
        }
      }

      if (p.showSites) {
        for (const s of sites) {
          ctx.fillStyle = "rgba(0,0,0,0.35)";
          ctx.beginPath();
          ctx.arc(s.x * canvasSize, s.y * canvasSize, 2.5, 0, Math.PI * 2);
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
