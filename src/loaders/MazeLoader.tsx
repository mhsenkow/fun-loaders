import { useCallback, useMemo, useRef } from "react";
import { LoaderShell } from "../LoaderShell";
import { useCanvasLoop } from "../hooks/useCanvasLoop";
import type { LoaderBackdrop, LoaderProps } from "../types";
import { DEFAULT_SIZE } from "../types";
import { nestedWave, openProgress } from "../lib/loopEngine";
import { beginLoaderFrame, endLoaderFrame } from "../lib/loaderFrame";
import {
  buildPolarMazePath,
  drawLogoGuides,
  drawMobilRing,
  drawPathPulse,
  drawPathPulseMono,
  drawPolarMazeWalls,
  pointAlongPath,
} from "../lib/logoGrammar";
import { resolveParams, type PresetDefinition } from "../lib/presets";
import {
  LOADER_THEME,
  shouldDrawGuides,
} from "../lib/loaderTheme";
import { drawSoftComet, drawSoftGlow, strokeSegment } from "../lib/loaderPaint";
import { resolveBackdrop } from "../lib/resolveBackdrop";
import { resolveShape } from "../lib/resolveShape";
import { type LoaderShape, type ShapeBounds } from "../lib/shape";

type Cell = 0 | 1;
type Maze = Cell[][];

function carveMaze(w: number, h: number, seed: number): Maze {
  const maze: Maze = Array.from({ length: h }, () =>
    Array(w).fill(1 as Cell),
  );
  const stack: [number, number][] = [[1, 1]];
  maze[1][1] = 0;
  let rng = seed;

  const random = () => {
    rng = (rng * 16807 + 0) % 2147483647;
    return rng / 2147483647;
  };

  const dirs: [number, number][] = [
    [0, -2],
    [2, 0],
    [0, 2],
    [-2, 0],
  ];

  while (stack.length) {
    const [cx, cy] = stack[stack.length - 1];
    const neighbors: [number, number, number, number][] = [];
    for (const [dx, dy] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx > 0 && nx < w - 1 && ny > 0 && ny < h - 1 && maze[ny][nx] === 1) {
        neighbors.push([nx, ny, cx + dx / 2, cy + dy / 2]);
      }
    }
    if (neighbors.length === 0) {
      stack.pop();
      continue;
    }
    const pick = Math.floor(random() * neighbors.length);
    const [nx, ny, wx, wy] = neighbors[pick];
    maze[ny][nx] = 0;
    maze[wy][wx] = 0;
    stack.push([nx, ny]);
  }
  return maze;
}

function buildPath(maze: Maze, w: number, h: number, seed: number): [number, number][] {
  const path: [number, number][] = [];
  const visited = new Set<string>();
  let rng = seed + 999;

  const random = () => {
    rng = (rng * 16807 + 0) % 2147483647;
    return rng / 2147483647;
  };

  const dfs = (x: number, y: number) => {
    visited.add(`${x},${y}`);
    path.push([x, y]);
    const dirs: [number, number][] = [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
    ];
    dirs.sort(() => random() - 0.5);
    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      if (
        nx >= 0 &&
        nx < w &&
        ny >= 0 &&
        ny < h &&
        maze[ny][nx] === 0 &&
        !visited.has(`${nx},${ny}`)
      ) {
        dfs(nx, ny);
      }
    }
  };
  dfs(1, 1);
  return path;
}

export interface MazeLoaderParams {
  cycleDuration: number;
  mazeSize: number;
  trailLength: number;
  wallColor: string;
  floorColor: string;
  pulseHue: number;
  pulseSaturation: number;
  seed: number;
  shape?: LoaderShape;
  backdrop?: LoaderBackdrop;
}

export const MAZE_DEFAULT_PARAMS: MazeLoaderParams = {
  cycleDuration: 4500,
  mazeSize: 31,
  trailLength: 40,
  wallColor: "transparent",
  floorColor: "transparent",
  pulseHue: 0,
  pulseSaturation: 0,
  seed: 42,
  shape: "circle",
  backdrop: "transparent",
};

export const MAZE_PRESETS: Record<string, PresetDefinition<MazeLoaderParams>> =
  {
    loader: {
      name: "Loader",
      description: "Monochrome maze pulse",
      params: MAZE_DEFAULT_PARAMS,
    },
    mark: {
      name: "Mark",
      description: "Polar ring maze / orthogonal grid",
      params: {
        ...MAZE_DEFAULT_PARAMS,
        backdrop: "mark",
        floorColor: "#f4f2ec",
        wallColor: "#1a1a1a",
        pulseHue: 355,
        pulseSaturation: 55,
        cycleDuration: 5000,
      },
    },
    classic: {
      name: "Classic",
      description: "Mobil red pulse on cream",
      params: {
        ...MAZE_DEFAULT_PARAMS,
        pulseHue: 355,
        pulseSaturation: 55,
      },
    },
    neon: {
      name: "Neon",
      description: "Dark corridors, cyan glow",
      params: {
        cycleDuration: 4000,
        mazeSize: 27,
        trailLength: 50,
        wallColor: "#0a0a14",
        floorColor: "#12121e",
        pulseHue: 185,
        pulseSaturation: 95,
        seed: 7,
      },
    },
    blueprint: {
      name: "Blueprint",
      description: "Technical drawing style",
      params: {
        cycleDuration: 6000,
        mazeSize: 35,
        trailLength: 35,
        wallColor: "#1a3a6e",
        floorColor: "#0d2240",
        pulseHue: 210,
        pulseSaturation: 70,
        seed: 123,
      },
    },
    ink: {
      name: "Ink",
      description: "Black walls on cream paper",
      params: {
        cycleDuration: 5500,
        mazeSize: 29,
        trailLength: 30,
        wallColor: "#1a1a1a",
        floorColor: "#f4f2ec",
        pulseHue: 0,
        pulseSaturation: 0,
        seed: 88,
        shape: "square",
      },
    },
    retro: {
      name: "Retro",
      description: "Pac-man arcade chase",
      params: {
        cycleDuration: 3500,
        mazeSize: 25,
        trailLength: 25,
        wallColor: "#2020a0",
        floorColor: "#000000",
        pulseHue: 55,
        pulseSaturation: 100,
        seed: 256,
      },
    },
  };

function drawSquareMaze(
  ctx: CanvasRenderingContext2D,
  bounds: ShapeBounds,
  maze: Maze,
  path: [number, number][],
  w: number,
  h: number,
  progress: number,
  p: MazeLoaderParams,
  mono: boolean,
) {
  const margin = bounds.inset;
  const cellSize = bounds.size / w;
  const headFloat = progress * (path.length - 1);
  const head = Math.floor(headFloat);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (maze[y][x] === 1) {
        if (mono) {
          const cx = margin + x * cellSize + cellSize / 2;
          const cy = margin + y * cellSize + cellSize / 2;
          const half = cellSize * 0.42;
          strokeSegment(
            ctx,
            cx - half,
            cy - half,
            cx + half,
            cy - half,
            LOADER_THEME.ghostStrong,
            cellSize * 0.35,
            0.07,
            0,
          );
          strokeSegment(
            ctx,
            cx + half,
            cy - half,
            cx + half,
            cy + half,
            LOADER_THEME.ghostStrong,
            cellSize * 0.35,
            0.07,
            0,
          );
          strokeSegment(
            ctx,
            cx + half,
            cy + half,
            cx - half,
            cy + half,
            LOADER_THEME.ghostStrong,
            cellSize * 0.35,
            0.07,
            0,
          );
          strokeSegment(
            ctx,
            cx - half,
            cy + half,
            cx - half,
            cy - half,
            LOADER_THEME.ghostStrong,
            cellSize * 0.35,
            0.07,
            0,
          );
        } else {
          ctx.fillStyle = p.wallColor;
          ctx.fillRect(
            margin + x * cellSize,
            margin + y * cellSize,
            cellSize + 0.5,
            cellSize + 0.5,
          );
        }
      }
    }
  }

  const trail = p.trailLength;
  for (let i = Math.max(0, head - trail); i <= head; i++) {
    const [px, py] = path[i];
    const trailProgress = (i - (head - trail)) / trail;
    const alpha = mono
      ? 0.08 + trailProgress * 0.4
      : 0.15 + trailProgress * 0.5;
    const tx = margin + px * cellSize + cellSize / 2;
    const ty = margin + py * cellSize + cellSize / 2;
    if (mono) {
      drawSoftComet(ctx, tx, ty, cellSize * 0.22, alpha, false);
    } else {
      ctx.fillStyle = `hsla(${p.pulseHue}, ${p.pulseSaturation}%, ${45 + trailProgress * 20}%, ${alpha})`;
      ctx.beginPath();
      ctx.arc(tx, ty, cellSize * 0.28, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (head < path.length) {
    const [hx, hy] = path[head];
    const frac = headFloat - head;
    const [cx, cy] =
      head + 1 < path.length
        ? [
            hx + (path[head + 1][0] - hx) * frac,
            hy + (path[head + 1][1] - hy) * frac,
          ]
        : [hx, hy];
    const pulse = 0.65 + 0.35 * Math.sin(progress * Math.PI * 6);
    const px = margin + cx * cellSize + cellSize / 2;
    const py = margin + cy * cellSize + cellSize / 2;
    if (mono) {
      drawSoftGlow(ctx, px, py, cellSize * 0.32, LOADER_THEME.headCore);
    } else {
      ctx.fillStyle = `hsla(${p.pulseHue}, ${p.pulseSaturation}%, 68%, ${pulse})`;
      ctx.beginPath();
      ctx.arc(px, py, cellSize * 0.38, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawPolarMaze(
  ctx: CanvasRenderingContext2D,
  bounds: ShapeBounds,
  polarPath: { x: number; y: number }[],
  progress: number,
  p: MazeLoaderParams,
  mono: boolean,
) {
  if (!mono) drawMobilRing(ctx, bounds, 0.08);
  drawPolarMazeWalls(
    ctx,
    bounds,
    6,
    12,
    mono ? "rgba(255,255,255,0.12)" : undefined,
  );
  const halfW = (p.trailLength / polarPath.length) * 0.45;

  if (mono) {
    drawPathPulseMono(ctx, polarPath, progress, halfW, 1.4, undefined, undefined, bounds, "circle");
  } else {
    const baseStroke = `hsla(${p.pulseHue}, ${p.pulseSaturation || 8}%, 42%, 0.35)`;
    const litStroke = `hsla(${p.pulseHue}, ${p.pulseSaturation || 55}%, 32%, 1)`;
    drawPathPulse(
      ctx,
      polarPath,
      progress,
      halfW,
      baseStroke,
      litStroke,
      1.4,
    );
  }

  const head = pointAlongPath(polarPath, progress);
  if (mono) {
    drawSoftGlow(ctx, head.x, head.y, 4, LOADER_THEME.headCore);
  } else {
    ctx.fillStyle = `hsla(${p.pulseHue}, ${p.pulseSaturation}%, 38%, 0.95)`;
    ctx.beginPath();
    ctx.arc(head.x, head.y, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

export interface MazeLoaderProps extends LoaderProps {
  params?: Partial<MazeLoaderParams>;
}

/** Circle: polar ring maze path. Square: DFS carved maze. */
export function MazeLoader({
  size = DEFAULT_SIZE,
  shape: propShape,
  label,
  className,
  preset,
  backdrop: propBackdrop,
  params: paramOverrides,
}: MazeLoaderProps) {
  const p = useMemo(
    () =>
      resolveParams(MAZE_DEFAULT_PARAMS, MAZE_PRESETS, preset, paramOverrides),
    [preset, paramOverrides],
  );
  const shape = resolveShape(propShape, p, p.shape);
  const backdrop = resolveBackdrop(propBackdrop, p, p.backdrop);
  const mono = backdrop === "transparent" || p.pulseSaturation === 0;

  const mazeRef = useRef<{
    maze: Maze;
    path: [number, number][];
    w: number;
    h: number;
    seed: number;
  } | null>(null);

  const polarRef = useRef<{
    key: string;
    path: { x: number; y: number }[];
  } | null>(null);

  const ensureMaze = (seed: number) => {
    const w = p.mazeSize | 1;
    const h = p.mazeSize | 1;
    const maze = carveMaze(w, h, seed);
    const path = buildPath(maze, w, h, seed);
    mazeRef.current = { maze, path, w, h, seed };
  };

  if (
    !mazeRef.current ||
    mazeRef.current.seed !== p.seed ||
    mazeRef.current.w !== (p.mazeSize | 1)
  ) {
    ensureMaze(p.seed);
  }

  const draw = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      canvasSize: number,
      t: number,
      _dt: number,
    ) => {
      const frame = beginLoaderFrame(ctx, canvasSize, shape, p.floorColor, {
        backdrop,
      });
      const { bounds } = frame;
      if (shouldDrawGuides(backdrop)) drawLogoGuides(ctx, bounds, shape);
      const progress = openProgress(t, p.cycleDuration);

      if (shape === "circle") {
        const key = `${canvasSize}`;
        if (!polarRef.current || polarRef.current.key !== key) {
          polarRef.current = {
            key,
            path: buildPolarMazePath(bounds, 6, 16),
          };
        }
        drawPolarMaze(ctx, bounds, polarRef.current.path, progress, p, mono);
      } else {
        const { maze, path, w, h } = mazeRef.current!;
        drawSquareMaze(ctx, bounds, maze, path, w, h, progress, p, mono);
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
