import { useCallback, useMemo } from "react";
import { LoaderShell } from "../LoaderShell";
import { useCanvasLoop } from "../hooks/useCanvasLoop";
import type { LoaderBackdrop, LoaderProps, LoaderShape } from "../types";
import { DEFAULT_SIZE } from "../types";
import { getLoopState, nestedWave } from "../lib/loopEngine";
import { beginLoaderFrame, endLoaderFrame } from "../lib/loaderFrame";
import {
  diagonalLoopPhase,
  drawLogoGuides,
  drawMobilRing,
  radialLoopPhase,
  sierpinskiCarpetRects,
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

function isMengerSolid(x: number, y: number, z: number): boolean {
  let cx = x;
  let cy = y;
  let cz = z;
  while (cx > 0 || cy > 0 || cz > 0) {
    const tx = cx % 3;
    const ty = cy % 3;
    const tz = cz % 3;
    if (
      (tx === 1 && ty === 1) ||
      (tx === 1 && tz === 1) ||
      (ty === 1 && tz === 1)
    ) {
      return false;
    }
    cx = Math.floor(cx / 3);
    cy = Math.floor(cy / 3);
    cz = Math.floor(cz / 3);
  }
  return true;
}

interface Cell {
  x: number;
  y: number;
  z: number;
  phase: number;
  sortKey: number;
}

function buildCells(): Cell[] {
  const n = 9;
  const cells: Cell[] = [];
  for (let z = 0; z < n; z++) {
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (isMengerSolid(x, y, z)) {
          cells.push({
            x,
            y,
            z,
            phase: (x * 17 + y * 31 + z * 13) % 1000,
            sortKey: x + z,
          });
        }
      }
    }
  }
  return cells;
}

const CELLS = buildCells();

function projectCell(cell: Cell, scale: number) {
  const isoX = (cell.x - cell.z) * scale * 0.9;
  const isoY = (cell.x + cell.z) * scale * 0.45 - cell.y * scale * 0.95;
  return { isoX, isoY };
}

function spongeBounds() {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const cell of CELLS) {
    const { isoX, isoY } = projectCell(cell, 1);
    const cube = 0.72;
    minX = Math.min(minX, isoX - cube / 2);
    maxX = Math.max(maxX, isoX + cube / 2 + cube * 0.18);
    minY = Math.min(minY, isoY - cube / 2 - cube * 0.22);
    maxY = Math.max(maxY, isoY + cube / 2);
  }
  return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
}

const BOUNDS = spongeBounds();
const MAX_SORT = Math.max(...CELLS.map((c) => c.sortKey));

export interface MengerLoaderParams {
  cycleDuration: number;
  waveWidth: number;
  saturation: number;
  lightness: number;
  hueBase: number;
  hueSpread: number;
  background: string;
  shape?: LoaderShape;
  backdrop?: LoaderBackdrop;
}

export const MENGER_DEFAULT_PARAMS: MengerLoaderParams = {
  cycleDuration: 4200,
  waveWidth: 0.18,
  saturation: 42,
  lightness: 38,
  hueBase: 0,
  hueSpread: 0,
  background: "transparent",
  shape: "circle",
  backdrop: "transparent",
};

export const MENGER_PRESETS: Record<string, PresetDefinition<MengerLoaderParams>> =
  {
    loader: {
      name: "Loader",
      description: "Monochrome radial / diagonal pulse",
      params: MENGER_DEFAULT_PARAMS,
    },
    mark: {
      name: "Mark",
      description: "Noyes ink on cream",
      params: {
        ...MENGER_DEFAULT_PARAMS,
        backdrop: "mark",
        background: "#f4f2ec",
        hueBase: 210,
        hueSpread: 40,
        cycleDuration: 3200,
      },
    },
    mobil: {
      name: "Mobil",
      description: "Red radial pulse in the disc",
      params: {
        ...MENGER_DEFAULT_PARAMS,
        cycleDuration: 2800,
        hueBase: 0,
        hueSpread: 18,
        saturation: 78,
        lightness: 48,
        background: "#f4f2ec",
      },
    },
    grid: {
      name: "Grid",
      description: "Modular isometric sweep",
      params: {
        ...MENGER_DEFAULT_PARAMS,
        shape: "square",
        cycleDuration: 3000,
        hueBase: 220,
        hueSpread: 25,
        saturation: 35,
        background: "#f0f0f0",
      },
    },
    midnight: {
      name: "Midnight",
      description: "IBM-blue modules on charcoal",
      params: {
        ...MENGER_DEFAULT_PARAMS,
        shape: "square",
        hueBase: 215,
        hueSpread: 30,
        saturation: 55,
        lightness: 52,
        background: "#0c0c10",
      },
    },
    frost: {
      name: "Frost",
      description: "Pale rings in a white disc",
      params: {
        ...MENGER_DEFAULT_PARAMS,
        cycleDuration: 4500,
        waveWidth: 0.22,
        saturation: 12,
        lightness: 55,
        hueBase: 200,
        hueSpread: 15,
        background: "#ffffff",
      },
    },
  };

export interface MengerLoaderProps extends LoaderProps {
  params?: Partial<MengerLoaderParams>;
}

/** Circle: Sierpiński carpet rings. Square: isometric module sweep. */
export function MengerLoader({
  size = DEFAULT_SIZE,
  label,
  className,
  preset,
  shape: propShape,
  backdrop: propBackdrop,
  params: paramOverrides,
}: MengerLoaderProps) {
  const p = useMemo(
    () =>
      resolveParams(
        MENGER_DEFAULT_PARAMS,
        MENGER_PRESETS,
        preset,
        paramOverrides,
      ),
    [preset, paramOverrides],
  );

  const shape = resolveShape(propShape, p, p.shape);
  const backdrop = resolveBackdrop(propBackdrop, p, p.backdrop);
  const mono = backdrop === "transparent" || p.hueSpread === 0;

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, canvasSize: number, t: number) => {
      const { progress, sin: breathe } = getLoopState(t, p.cycleDuration);
      const frame = beginLoaderFrame(ctx, canvasSize, shape, p.background, {
        backdrop,
      });
      const { bounds } = frame;
      if (shouldDrawGuides(backdrop)) {
        drawLogoGuides(ctx, bounds, shape);
        if (shape === "circle") drawMobilRing(ctx, bounds, 0.1);
      }

      if (shape === "circle") {
        const rects = sierpinskiCarpetRects(bounds, 3);
        for (const rect of rects) {
          const cx = rect.x + rect.size / 2;
          const cy = rect.y + rect.size / 2;
          const phase = radialLoopPhase(cx, cy, bounds, progress);
          let wave = nestedWave(phase, 0, p.waveWidth, 2);
          wave = Math.max(
            wave,
            nestedWave(phase, 0.5, p.waveWidth * 0.8, 2) * 0.5,
          );
          const cyclePhase = progress * Math.PI * 2;
          const idle =
            0.08 +
            0.06 * breathe * Math.sin(cyclePhase + rect.level * 0.9);
          const pulse = idle + wave * (1 - idle);

          if (mono) {
            const lit = pulse > 0.35;
            strokeSegment(
              ctx,
              rect.x + 0.5,
              rect.y + 0.5,
              rect.x + rect.size - 0.5,
              rect.y + 0.5,
              lit ? LOADER_THEME.pulse : LOADER_THEME.ghost,
              0.75,
              lit ? 0.35 + pulse * 0.45 : 0.06,
              lit ? LOADER_GLOW.soft : 0,
            );
            strokeSegment(
              ctx,
              rect.x + rect.size - 0.5,
              rect.y + 0.5,
              rect.x + rect.size - 0.5,
              rect.y + rect.size - 0.5,
              lit ? LOADER_THEME.pulse : LOADER_THEME.ghost,
              0.75,
              lit ? 0.35 + pulse * 0.45 : 0.06,
              lit ? LOADER_GLOW.soft : 0,
            );
            strokeSegment(
              ctx,
              rect.x + rect.size - 0.5,
              rect.y + rect.size - 0.5,
              rect.x + 0.5,
              rect.y + rect.size - 0.5,
              lit ? LOADER_THEME.pulse : LOADER_THEME.ghost,
              0.75,
              lit ? 0.35 + pulse * 0.45 : 0.06,
              lit ? LOADER_GLOW.soft : 0,
            );
            strokeSegment(
              ctx,
              rect.x + 0.5,
              rect.y + rect.size - 0.5,
              rect.x + 0.5,
              rect.y + 0.5,
              lit ? LOADER_THEME.pulse : LOADER_THEME.ghost,
              0.75,
              lit ? 0.35 + pulse * 0.45 : 0.06,
              lit ? LOADER_GLOW.soft : 0,
            );
            if (lit) {
              ctx.fillStyle = `rgba(255,255,255,${0.04 + pulse * 0.12})`;
              ctx.fillRect(rect.x, rect.y, rect.size, rect.size);
            }
          } else {
            const hue = (p.hueBase + rect.level * 12) % 360;
            const light = p.lightness + pulse * 28;
            const alpha = 0.2 + pulse * 0.75;
            ctx.fillStyle = `hsla(${hue}, ${p.saturation}%, ${light}%, ${alpha})`;
            ctx.fillRect(rect.x, rect.y, rect.size, rect.size);
            ctx.strokeStyle = `rgba(0,0,0,${0.05 + pulse * 0.1})`;
            ctx.lineWidth = 0.75;
            ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.size - 1, rect.size - 1);
          }
        }
      } else {
        const scale =
          Math.min(bounds.size / BOUNDS.width, bounds.size / BOUNDS.height) *
          0.9;
        const cx = bounds.cx - ((BOUNDS.minX + BOUNDS.maxX) / 2) * scale;
        const cy = bounds.cy - ((BOUNDS.minY + BOUNDS.maxY) / 2) * scale;
        const sorted = [...CELLS].sort((a, b) => a.sortKey - b.sortKey);
        const cellStep = scale * 0.72;

        if (!mono && shouldDrawGuides(backdrop)) {
          ctx.strokeStyle = "rgba(0,0,0,0.05)";
          ctx.lineWidth = 0.6;
          for (let gx = 0; gx <= 9; gx++) {
            const wx = cx + (gx - 4) * cellStep * 0.95;
            ctx.beginPath();
            ctx.moveTo(wx, cy - bounds.half * 0.85);
            ctx.lineTo(wx, cy + bounds.half * 0.85);
            ctx.stroke();
          }
        }

        for (const cell of sorted) {
          const { isoX, isoY } = projectCell(cell, scale);
          const wx = cx + isoX;
          const wy = cy + isoY;
          const phase = diagonalLoopPhase(wx, wy, bounds, progress);
          const wave = nestedWave(phase, 0, p.waveWidth, 3);
          const cyclePhase = progress * Math.PI * 2;
          const idle =
            0.1 +
            0.08 * breathe * Math.sin(cyclePhase + cell.phase * 0.08);
          const pulse = idle + wave * (1 - idle);
          const cube = scale * 0.72 * (0.78 + pulse * 0.22);

          if (mono) {
            const lit = pulse > 0.3;
            const x0 = wx - cube / 2;
            const y0 = wy - cube / 2;
            const x1 = x0 + cube;
            const y1 = y0 + cube;
            const color = lit ? LOADER_THEME.pulse : LOADER_THEME.ghost;
            const alpha = lit ? 0.3 + pulse * 0.5 : 0.06;
            const glow = lit ? LOADER_GLOW.soft : 0;
            strokeSegment(ctx, x0, y0, x1, y0, color, 0.8, alpha, glow);
            strokeSegment(ctx, x1, y0, x1, y1, color, 0.8, alpha, glow);
            strokeSegment(ctx, x1, y1, x0, y1, color, 0.8, alpha, glow);
            strokeSegment(ctx, x0, y1, x0, y0, color, 0.8, alpha, glow);
            if (lit) {
              const topFace = cube * 0.22;
              strokeSegment(
                ctx,
                x0,
                y0 - topFace,
                x1,
                y0 - topFace,
                color,
                0.7,
                alpha * 0.7,
                glow * 0.6,
              );
            }
          } else {
            const hue =
              (p.hueBase + (cell.x + cell.z) * 8 + cell.y * 4) % 360;
            const light = p.lightness + pulse * 22;
            const alpha = 0.25 + pulse * 0.75;
            const topFace = cube * 0.22;
            const rightFace = cube * 0.18;
            ctx.fillStyle = `hsla(${hue}, ${p.saturation}%, ${light}%, ${alpha})`;
            ctx.fillRect(wx - cube / 2, wy - cube / 2, cube, cube);
            ctx.fillStyle = `hsla(${hue}, ${p.saturation + 8}%, ${light + 16}%, ${alpha * 0.55})`;
            ctx.fillRect(wx - cube / 2, wy - cube / 2 - topFace, cube, topFace);
            ctx.fillStyle = `hsla(${hue}, ${p.saturation - 12}%, ${light - 10}%, ${alpha * 0.45})`;
            ctx.fillRect(wx + cube / 2 - rightFace, wy - cube / 2, rightFace, cube);
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
