import { clipShape, getShapeBounds, strokeShapeMark, type LoaderShape } from "./shape";
import {
  applyShapeFeather,
  buildShapeFeatherMask,
} from "./loaderPaint";
import {
  isTransparentBackdrop,
  LOADER_THEME,
  type LoaderBackdrop,
} from "./loaderTheme";

export interface LoaderFrame {
  bounds: ReturnType<typeof getShapeBounds>;
  shape: LoaderShape;
  backdrop: LoaderBackdrop;
  canvasSize: number;
}

export interface BeginLoaderFrameOptions {
  markColor?: string;
  backdrop?: LoaderBackdrop;
}

/** Begin a loader frame. Call `endLoaderFrame` when done drawing. */
export function beginLoaderFrame(
  ctx: CanvasRenderingContext2D,
  canvasSize: number,
  shape: LoaderShape,
  background: string,
  options: BeginLoaderFrameOptions | string = {},
): LoaderFrame {
  const opts: BeginLoaderFrameOptions =
    typeof options === "string" ? { markColor: options } : options;
  const backdrop = opts.backdrop ?? "transparent";
  const bounds = getShapeBounds(canvasSize);

  if (isTransparentBackdrop(backdrop)) {
    ctx.clearRect(0, 0, canvasSize, canvasSize);
    return { bounds, shape, backdrop, canvasSize };
  }

  const bg =
    background === "transparent" ? LOADER_THEME.markBg : background;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvasSize, canvasSize);
  ctx.save();
  clipShape(ctx, bounds, shape);
  ctx.fillStyle = bg;
  ctx.fillRect(bounds.inset, bounds.inset, bounds.size, bounds.size);
  if (opts.markColor) {
    ctx.restore();
    strokeShapeMark(ctx, bounds, shape, opts.markColor, 1);
    ctx.save();
    clipShape(ctx, bounds, shape);
  }
  return { bounds, shape, backdrop, canvasSize };
}

export function endLoaderFrame(
  ctx: CanvasRenderingContext2D,
  frame?: LoaderFrame,
): void {
  if (!frame) {
    try {
      ctx.restore();
    } catch {
      /* no active clip */
    }
    return;
  }

  if (isTransparentBackdrop(frame.backdrop)) {
    applyShapeFeather(
      ctx,
      frame.canvasSize,
      frame.bounds,
      frame.shape,
    );
    return;
  }

  ctx.restore();
}

/** Pre-warm feather mask for a size/shape pair. */
export function warmFeatherMask(
  canvasSize: number,
  shape: LoaderShape,
): void {
  const bounds = getShapeBounds(canvasSize);
  buildShapeFeatherMask(canvasSize, bounds, shape);
}
