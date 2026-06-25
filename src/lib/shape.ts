/** Logo frame: circle (Mobil) or square (IBM grid). */
export type LoaderShape = "circle" | "square";

export interface ShapeBounds {
  cx: number;
  cy: number;
  /** Half-width of the drawable region (inset from canvas edge). */
  half: number;
  inset: number;
  size: number;
}

export function getShapeBounds(
  canvasSize: number,
  insetRatio = 0.06,
): ShapeBounds {
  const inset = canvasSize * insetRatio;
  const size = canvasSize - inset * 2;
  return {
    cx: canvasSize / 2,
    cy: canvasSize / 2,
    half: size / 2,
    inset,
    size,
  };
}

export function containsShape(
  x: number,
  y: number,
  bounds: ShapeBounds,
  shape: LoaderShape,
): boolean {
  const dx = x - bounds.cx;
  const dy = y - bounds.cy;
  if (shape === "circle") {
    return dx * dx + dy * dy <= bounds.half * bounds.half;
  }
  return Math.abs(dx) <= bounds.half && Math.abs(dy) <= bounds.half;
}

/** 0 at center, 1 at edge — for radial logo pulses. */
export function shapeRadius(
  x: number,
  y: number,
  bounds: ShapeBounds,
  shape: LoaderShape,
): number {
  const dx = (x - bounds.cx) / bounds.half;
  const dy = (y - bounds.cy) / bounds.half;
  if (shape === "circle") {
    return Math.min(1, Math.hypot(dx, dy));
  }
  return Math.min(1, Math.max(Math.abs(dx), Math.abs(dy)));
}

/** Map unit square [0,1]² into shape bounds. */
export function mapUnitToShape(
  u: number,
  v: number,
  bounds: ShapeBounds,
  shape: LoaderShape,
): { x: number; y: number } {
  if (shape === "circle") {
    const r = Math.sqrt(Math.max(0, u)) * bounds.half * 0.98;
    const a = v * Math.PI * 2;
    return {
      x: bounds.cx + Math.cos(a) * r,
      y: bounds.cy + Math.sin(a) * r,
    };
  }
  return {
    x: bounds.inset + u * bounds.size,
    y: bounds.inset + v * bounds.size,
  };
}

export function clipShape(
  ctx: CanvasRenderingContext2D,
  bounds: ShapeBounds,
  shape: LoaderShape,
): void {
  ctx.beginPath();
  if (shape === "circle") {
    ctx.arc(bounds.cx, bounds.cy, bounds.half, 0, Math.PI * 2);
  } else {
    ctx.rect(bounds.inset, bounds.inset, bounds.size, bounds.size);
  }
  ctx.clip();
}

/** Noyes hairline — marks the logo boundary. */
export function strokeShapeMark(
  ctx: CanvasRenderingContext2D,
  bounds: ShapeBounds,
  shape: LoaderShape,
  color = "rgba(0,0,0,0.12)",
  lineWidth = 1,
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  if (shape === "circle") {
    ctx.arc(bounds.cx, bounds.cy, bounds.half, 0, Math.PI * 2);
  } else {
    ctx.rect(bounds.inset, bounds.inset, bounds.size, bounds.size);
  }
  ctx.stroke();
  ctx.restore();
}

export function fillShapeBackdrop(
  ctx: CanvasRenderingContext2D,
  canvasSize: number,
  bounds: ShapeBounds,
  shape: LoaderShape,
  fill: string,
): void {
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, canvasSize, canvasSize);
  ctx.save();
  clipShape(ctx, bounds, shape);
  ctx.fillStyle = fill;
  ctx.fillRect(bounds.inset, bounds.inset, bounds.size, bounds.size);
  ctx.restore();
}

/** Point on shape perimeter, t ∈ [0, 1). */
export function perimeterPoint(
  t: number,
  bounds: ShapeBounds,
  shape: LoaderShape,
): { x: number; y: number } {
  const u = ((t % 1) + 1) % 1;
  if (shape === "circle") {
    const a = u * Math.PI * 2 - Math.PI / 2;
    const r = bounds.half * 0.9;
    return {
      x: bounds.cx + Math.cos(a) * r,
      y: bounds.cy + Math.sin(a) * r,
    };
  }
  const s = bounds.size;
  const i = bounds.inset;
  const p = u * 4;
  if (p < 1) return { x: i + p * s, y: i };
  if (p < 2) return { x: i + s, y: i + (p - 1) * s };
  if (p < 3) return { x: i + s - (p - 2) * s, y: i + s };
  return { x: i, y: i + s - (p - 3) * s };
}

/** Scale factor so content fits inside the logo mark. */
export function shapeFitScale(bounds: ShapeBounds, shape: LoaderShape): number {
  return shape === "circle" ? bounds.half * 1.75 : bounds.size * 0.88;
}
