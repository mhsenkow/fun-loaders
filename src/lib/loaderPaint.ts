import type { LoaderShape, ShapeBounds } from "./shape";

const FEATHER = 0.28;
const maskCache = new Map<string, HTMLCanvasElement>();

function maskKey(
  canvasSize: number,
  shape: LoaderShape,
  bounds: ShapeBounds,
): string {
  return `${canvasSize}-${shape}-${bounds.inset}-${bounds.size}`;
}

/** Soft alpha mask — content dissolves at edges instead of hard clip. */
export function buildShapeFeatherMask(
  canvasSize: number,
  bounds: ShapeBounds,
  shape: LoaderShape,
  feather = FEATHER,
): HTMLCanvasElement {
  const key = `${maskKey(canvasSize, shape, bounds)}-${feather}-a`;
  const cached = maskCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(canvasSize, canvasSize);
  const data = img.data;
  const { cx, cy, half } = bounds;

  for (let y = 0; y < canvasSize; y++) {
    for (let x = 0; x < canvasSize; x++) {
      const idx = (y * canvasSize + x) * 4;
      const dx = (x - cx) / half;
      const dy = (y - cy) / half;
      const edge =
        shape === "circle"
          ? Math.hypot(dx, dy)
          : Math.max(Math.abs(dx), Math.abs(dy));
      let a = 0;
      if (edge <= 1 - feather) {
        a = 1;
      } else if (edge < 1) {
        const t = (1 - edge) / feather;
        a = t * t * (3 - 2 * t);
      }
      const v = Math.round(a * 255);
      data[idx] = 255;
      data[idx + 1] = 255;
      data[idx + 2] = 255;
      data[idx + 3] = v;
    }
  }

  ctx.putImageData(img, 0, 0);
  maskCache.set(key, canvas);
  return canvas;
}

/** Feather drawn pixels so the loader melts into the page background. */
export function applyShapeFeather(
  ctx: CanvasRenderingContext2D,
  canvasSize: number,
  bounds: ShapeBounds,
  shape: LoaderShape,
): void {
  const mask = buildShapeFeatherMask(canvasSize, bounds, shape);
  ctx.save();
  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(mask, 0, 0, canvasSize, canvasSize);
  ctx.restore();
}

/** Radial glow dot — soft head / pulse anchor. */
export function drawSoftGlow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  core = "rgba(255,255,255,0.92)",
): void {
  const r = Math.max(2, radius);
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.2);
  g.addColorStop(0, core);
  g.addColorStop(0.35, core.replace(/[\d.]+\)$/, "0.32)"));
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r * 2.2, 0, Math.PI * 2);
  ctx.fill();
}

/** Soft stroke with optional bloom on bright segments. */
export function strokeSegment(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: string,
  width: number,
  alpha: number,
  glow = 0,
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (glow > 0) {
    ctx.shadowBlur = glow;
    ctx.shadowColor = "rgba(255,255,255,0.5)";
  }
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.restore();
}

/** Soft comet dot with radial falloff. */
export function drawSoftComet(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  alpha: number,
  glow = false,
): void {
  const r = Math.max(0.5, radius);
  if (glow) {
    drawSoftGlow(
      ctx,
      x,
      y,
      r * 1.4,
      `rgba(255,255,255,${Math.min(0.95, alpha + 0.25)})`,
    );
    return;
  }
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 1.8);
  g.addColorStop(0, `rgba(255,255,255,${alpha})`);
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r * 1.8, 0, Math.PI * 2);
  ctx.fill();
}

/** Edge falloff multiplier for per-element nuance (0–1). */
export function edgeFeather(
  x: number,
  y: number,
  bounds: ShapeBounds,
  shape: LoaderShape,
  feather = FEATHER,
): number {
  const dx = (x - bounds.cx) / bounds.half;
  const dy = (y - bounds.cy) / bounds.half;
  const edge =
    shape === "circle"
      ? Math.hypot(dx, dy)
      : Math.max(Math.abs(dx), Math.abs(dy));
  if (edge <= 1 - feather) return 1;
  if (edge >= 1) return 0;
  const t = (1 - edge) / feather;
  return t * t * (3 - 2 * t);
}
