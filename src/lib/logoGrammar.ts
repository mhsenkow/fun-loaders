import { cyclicDist } from "./loop";
import { LOADER_GLOW, LOADER_THEME } from "./loaderTheme";
import { drawSoftGlow, edgeFeather, strokeSegment } from "./loaderPaint";
import type { LoaderShape, ShapeBounds } from "./shape";

export interface Point2 {
  x: number;
  y: number;
}

/** Faint construction guides — mark backdrop only. */
export function drawLogoGuides(
  ctx: CanvasRenderingContext2D,
  bounds: ShapeBounds,
  shape: LoaderShape,
  ink = "rgba(0,0,0,0.06)",
): void {
  ctx.save();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1;
  if (shape === "circle") {
    for (let i = 1; i <= 3; i++) {
      const r = (bounds.half * i) / 3;
      ctx.beginPath();
      ctx.arc(bounds.cx, bounds.cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(bounds.cx - bounds.half, bounds.cy);
    ctx.lineTo(bounds.cx + bounds.half, bounds.cy);
    ctx.moveTo(bounds.cx, bounds.cy - bounds.half);
    ctx.lineTo(bounds.cx, bounds.cy + bounds.half);
    ctx.stroke();
  } else {
    const { inset, size } = bounds;
    const third = size / 3;
    for (let i = 1; i < 2; i++) {
      ctx.beginPath();
      ctx.moveTo(inset + third * i, inset);
      ctx.lineTo(inset + third * i, inset + size);
      ctx.moveTo(inset, inset + third * i);
      ctx.lineTo(inset + size, inset + third * i);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** Outer ring hint — mark backdrop only. */
export function drawMobilRing(
  ctx: CanvasRenderingContext2D,
  bounds: ShapeBounds,
  alpha = 0.14,
  light = false,
): void {
  ctx.save();
  ctx.strokeStyle = light
    ? `rgba(255,255,255,${alpha})`
    : `rgba(0,0,0,${alpha})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(bounds.cx, bounds.cy, bounds.half * 0.92, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** Loop phase 0–1 from position — radial ring (circle). */
export function radialLoopPhase(
  x: number,
  y: number,
  bounds: ShapeBounds,
  progress: number,
): number {
  const r = Math.hypot(x - bounds.cx, y - bounds.cy) / bounds.half;
  return cyclicDist(r, progress);
}

/** Loop phase — diagonal sweep (square). */
export function diagonalLoopPhase(
  x: number,
  y: number,
  bounds: ShapeBounds,
  progress: number,
): number {
  const u = (x - bounds.inset) / bounds.size;
  const v = (y - bounds.inset) / bounds.size;
  const d = (u + v) * 0.5;
  return cyclicDist(d, progress);
}

/** Archimedean spiral path for circle-native tracers. */
export function buildSpiralPath(
  bounds: ShapeBounds,
  turns: number,
  steps: number,
): Point2[] {
  const pts: Point2[] = [];
  const maxR = bounds.half * 0.9;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = t * turns * Math.PI * 2 - Math.PI / 2;
    const r = maxR * t;
    pts.push({
      x: bounds.cx + Math.cos(a) * r,
      y: bounds.cy + Math.sin(a) * r,
    });
  }
  return pts;
}

/** Logarithmic golden spiral — reads as a designed disc tracer. */
export function buildGoldenSpiralPath(
  bounds: ShapeBounds,
  turns: number,
  steps: number,
): Point2[] {
  const pts: Point2[] = [];
  const maxR = bounds.half * 0.82;
  const growth = 0.17;
  const end = turns * Math.PI * 2;
  const denom = Math.exp(end * growth) - 1 || 1;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const theta = t * end - Math.PI / 2;
    const r = maxR * (Math.exp(theta * growth + Math.PI / 2 * growth) - 1) / denom;
    pts.push({
      x: bounds.cx + Math.cos(theta) * r,
      y: bounds.cy + Math.sin(theta) * r,
    });
  }
  return pts;
}

/** Polar ring maze path — walker loops through concentric corridors. */
export function buildPolarMazePath(
  bounds: ShapeBounds,
  rings: number,
  sectors: number,
): Point2[] {
  const path: Point2[] = [];
  const maxR = bounds.half * 0.88;
  const minR = bounds.half * 0.12;

  for (let ring = 0; ring < rings; ring++) {
    const r0 = minR + ((maxR - minR) * ring) / rings;
    const r1 = minR + ((maxR - minR) * (ring + 1)) / rings;
    const r = (r0 + r1) / 2;
    const sectorOffset = ring % 2 === 0 ? 0 : 0.5 / sectors;
    const segs = sectors + (ring % 2);
    for (let s = 0; s <= segs; s++) {
      const u = (s / segs + sectorOffset) % 1;
      const a = u * Math.PI * 2 - Math.PI / 2;
      path.push({
        x: bounds.cx + Math.cos(a) * r,
        y: bounds.cy + Math.sin(a) * r,
      });
    }
    if (ring < rings - 1) {
      const aEnd = ((segs / segs + sectorOffset) % 1) * Math.PI * 2 - Math.PI / 2;
      const rNext = minR + ((maxR - minR) * (ring + 1.5)) / rings;
      path.push({
        x: bounds.cx + Math.cos(aEnd) * rNext,
        y: bounds.cy + Math.sin(aEnd) * rNext,
      });
    }
  }
  return path;
}

/** Ink walls for the polar maze — concentric arcs + radial spokes with gaps. */
export function drawPolarMazeWalls(
  ctx: CanvasRenderingContext2D,
  bounds: ShapeBounds,
  rings: number,
  sectors: number,
  ink = "rgba(0,0,0,0.16)",
): void {
  const maxR = bounds.half * 0.88;
  const minR = bounds.half * 0.1;
  ctx.save();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1.15;
  ctx.lineCap = "butt";

  for (let ring = 1; ring <= rings; ring++) {
    const r = minR + ((maxR - minR) * ring) / rings;
    const phase = ring % 2 === 0 ? 0 : Math.PI / sectors;
    for (let s = 0; s < sectors; s++) {
      const span = (Math.PI * 2) / sectors;
      const a0 = phase + s * span + span * 0.08;
      const a1 = phase + s * span + span * 0.72;
      ctx.beginPath();
      ctx.arc(bounds.cx, bounds.cy, r, a0, a1);
      ctx.stroke();
    }
  }

  for (let s = 0; s < sectors; s++) {
    const a = (s / sectors) * Math.PI * 2 - Math.PI / 2;
    for (let ring = 0; ring < rings; ring++) {
      if ((ring + s) % 3 === 1) continue;
      const r0 = minR + ((maxR - minR) * ring) / rings;
      const r1 = minR + ((maxR - minR) * (ring + 0.78)) / rings;
      ctx.beginPath();
      ctx.moveTo(bounds.cx + Math.cos(a) * r0, bounds.cy + Math.sin(a) * r0);
      ctx.lineTo(bounds.cx + Math.cos(a) * r1, bounds.cy + Math.sin(a) * r1);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** IBM-style horizontal band guides (square flow field). */
export function drawStripeBandGuides(
  ctx: CanvasRenderingContext2D,
  bounds: ShapeBounds,
  bandCount: number,
  ink = "rgba(0,0,0,0.07)",
): void {
  ctx.save();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1;
  for (let b = 1; b < bandCount; b++) {
    const y = bounds.inset + (b / bandCount) * bounds.size;
    ctx.beginPath();
    ctx.moveTo(bounds.inset, y);
    ctx.lineTo(bounds.inset + bounds.size, y);
    ctx.stroke();
  }
  ctx.restore();
}

/** Sierpiński carpet depth for square Menger mark. */
export function sierpinskiCarpetRects(
  bounds: ShapeBounds,
  depth: number,
): { x: number; y: number; size: number; level: number }[] {
  const rects: { x: number; y: number; size: number; level: number }[] = [];
  const start = bounds.inset;
  const total = bounds.size;

  function subdiv(x: number, y: number, size: number, level: number) {
    if (level >= depth) {
      rects.push({ x, y, size, level });
      return;
    }
    const third = size / 3;
    for (let gy = 0; gy < 3; gy++) {
      for (let gx = 0; gx < 3; gx++) {
        if (gx === 1 && gy === 1) continue;
        subdiv(x + gx * third, y + gy * third, third, level + 1);
      }
    }
  }
  subdiv(start, start, total, 0);
  return rects;
}

/** Grid sites for square Voronoi / modular marks. */
export function gridSites(count: number, inset = 0.18): Point2[] {
  const n = Math.ceil(Math.sqrt(count));
  const pts: Point2[] = [];
  for (let i = 0; i < count; i++) {
    const gx = i % n;
    const gy = Math.floor(i / n);
    pts.push({
      x: inset + (gx / Math.max(1, n - 1)) * (1 - inset * 2),
      y: inset + (gy / Math.max(1, n - 1)) * (1 - inset * 2),
    });
  }
  return pts;
}

/** Radial sites + center for circle marks. */
export function radialSites(count: number, orbit = 0.34): Point2[] {
  const pts: Point2[] = [{ x: 0.5, y: 0.5 }];
  for (let i = 0; i < count - 1; i++) {
    const a = (i / (count - 1)) * Math.PI * 2 - Math.PI / 2;
    pts.push({
      x: 0.5 + Math.cos(a) * orbit,
      y: 0.5 + Math.sin(a) * orbit,
    });
  }
  return pts;
}

/** Spiral flow angle (circle). */
export function spiralFlowAngle(
  x: number,
  y: number,
  bounds: ShapeBounds,
  phase: number,
): number {
  const dx = x - bounds.cx;
  const dy = y - bounds.cy;
  const r = Math.hypot(dx, dy) + 0.001;
  return Math.atan2(dy, dx) + phase + r * 0.02;
}

/** Horizontal stripe flow (square / IBM rhythm). */
export function stripeFlowAngle(
  y: number,
  bounds: ShapeBounds,
  phase: number,
  bandCount = 5,
): number {
  const v = (y - bounds.inset) / bounds.size;
  const band = Math.floor(v * bandCount);
  return (band % 2 === 0 ? 0 : Math.PI) + Math.sin(phase + v * 6) * 0.15;
}

/** Superellipse — n=2 circle, high n → square. */
export function superellipsePoint(
  t: number,
  bounds: ShapeBounds,
  n: number,
): Point2 {
  const a = t * Math.PI * 2;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const exp = 2 / n;
  const x = Math.sign(cos) * Math.pow(Math.abs(cos), exp);
  const y = Math.sign(sin) * Math.pow(Math.abs(sin), exp);
  return {
    x: bounds.cx + x * bounds.half * 0.88,
    y: bounds.cy + y * bounds.half * 0.88,
  };
}

/** Point on a rotated square perimeter, t ∈ [0, 1). */
export function pointOnRotatedSquare(
  t: number,
  cx: number,
  cy: number,
  half: number,
  rot: number,
): Point2 {
  const u = ((t % 1) + 1) % 1;
  const side = half * 2;
  const perim = side * 4;
  let d = u * perim;
  let lx = 0;
  let ly = 0;
  if (d < side) {
    lx = -half + d;
    ly = -half;
  } else if ((d -= side) < side) {
    lx = half;
    ly = -half + d;
  } else if ((d -= side) < side) {
    lx = half - d;
    ly = half;
  } else {
    d -= side;
    lx = -half;
    ly = half - d;
  }
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  return { x: cx + lx * cos - ly * sin, y: cy + lx * sin + ly * cos };
}

/** Nested rotating squares — walks each layer's perimeter. */
export function nestedSquarePoint(
  t: number,
  bounds: ShapeBounds,
  layer: number,
  layers: number,
): Point2 {
  const shrink = 1 - (layer / layers) * 0.58;
  const half = bounds.half * 0.86 * shrink;
  const dir = layer % 2 === 0 ? 1 : -1;
  const rot = layer * (Math.PI / (2.5 * layers));
  const layerT = (t + layer * (0.19 / layers)) % 1;
  return pointOnRotatedSquare(
    layerT * dir,
    bounds.cx,
    bounds.cy,
    half,
    rot + layerT * Math.PI * 2 * 0.02 * dir,
  );
}

/** Closed superellipse loop for square-native knot/weave marks. */
export function buildSuperellipsePath(
  bounds: ShapeBounds,
  n: number,
  steps: number,
): Point2[] {
  const pts: Point2[] = [];
  for (let i = 0; i <= steps; i++) {
    pts.push(superellipsePoint(i / steps, bounds, n));
  }
  return pts;
}

/** Square-wound Lissajous for torus-knot alternative. */
export function squareWeavePoint(
  t: number,
  bounds: ShapeBounds,
  p: number,
  q: number,
): Point2 {
  const u = t * Math.PI * 2;
  return {
    x: bounds.cx + Math.sin(p * u) * bounds.half * 0.82,
    y: bounds.cy + Math.sin(q * u + Math.PI / 4) * bounds.half * 0.82,
  };
}

/** Map normalized path index to pixel along a polyline. */
export function pointAlongPath(
  path: Point2[],
  progress: number,
): { x: number; y: number; tangent: number } {
  if (path.length === 0) return { x: 0, y: 0, tangent: 0 };
  if (path.length === 1) return { x: path[0].x, y: path[0].y, tangent: 0 };
  const total = path.length - 1;
  const f = progress * total;
  const i = Math.min(total - 1, Math.floor(f));
  const frac = f - i;
  const a = path[i];
  const b = path[i + 1];
  return {
    x: a.x + (b.x - a.x) * frac,
    y: a.y + (b.y - a.y) * frac,
    tangent: Math.atan2(b.y - a.y, b.x - a.x),
  };
}

/** Draw polyline with traveling bright window. */
export function drawPathPulse(
  ctx: CanvasRenderingContext2D,
  path: Point2[],
  progress: number,
  halfW: number,
  strokeBase: string,
  strokeLit: string,
  lineWidth: number,
): void {
  if (path.length < 2) return;
  const total = path.length - 1;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let i = 1; i < path.length; i++) {
    const pos = i / total;
    const d = cyclicDist(pos, progress);
    const bright = d < halfW ? 1 - d / halfW : 0;
    const alpha = 0.12 + bright * 0.88;
    ctx.strokeStyle = bright > 0.1 ? strokeLit : strokeBase;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = lineWidth + bright * 1.2;
    ctx.beginPath();
    ctx.moveTo(path[i - 1].x, path[i - 1].y);
    ctx.lineTo(path[i].x, path[i].y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/** Fade ink trails on a transparent canvas. */
export function fadeTrailsTransparent(
  ctx: CanvasRenderingContext2D,
  bounds: ShapeBounds,
  fade: number,
): void {
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillStyle = `rgba(0,0,0,${fade})`;
  ctx.fillRect(bounds.inset, bounds.inset, bounds.size, bounds.size);
  ctx.restore();
}

/** Monochrome traveling pulse — ghost trail + blooming bright band. */
export function drawPathPulseMono(
  ctx: CanvasRenderingContext2D,
  path: Point2[],
  progress: number,
  halfW: number,
  lineWidth: number,
  ghost = LOADER_THEME.ghost,
  lit = LOADER_THEME.pulse,
  bounds?: ShapeBounds,
  shape?: LoaderShape,
): void {
  if (path.length < 2) return;
  const total = path.length - 1;

  for (let i = 1; i < path.length; i++) {
    const pos = i / total;
    const d = cyclicDist(pos, progress);
    const bright = d < halfW ? 1 - d / halfW : 0;
    const eased = bright * bright * (3 - 2 * bright);
    const edge =
      bounds && shape
        ? edgeFeather(
            (path[i - 1].x + path[i].x) * 0.5,
            (path[i - 1].y + path[i].y) * 0.5,
            bounds,
            shape,
          )
        : 1;
    const alpha = (eased > 0.06 ? 0.08 + eased * 0.72 : 0.05) * edge;
    if (alpha < 0.01) continue;
    strokeSegment(
      ctx,
      path[i - 1].x,
      path[i - 1].y,
      path[i].x,
      path[i].y,
      eased > 0.08 ? lit : ghost,
      lineWidth + eased * 1.4,
      alpha,
      eased * LOADER_GLOW.pulse * edge,
    );
  }
}

/** Soft glowing head for tracers. */
export function drawPulseHead(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
): void {
  drawSoftGlow(ctx, x, y, radius, LOADER_THEME.headCore);
}
