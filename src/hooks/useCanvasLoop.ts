import { useEffect, useRef } from "react";

export function useCanvasLoop(
  draw: (
    ctx: CanvasRenderingContext2D,
    size: number,
    t: number,
    dt: number,
  ) => void,
  deps: unknown[] = [],
  size = 220,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef(draw);
  drawRef.current = draw;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio ?? 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let raf = 0;
    let last = performance.now();

    const frame = (t: number) => {
      const dt = t - last;
      last = t;
      drawRef.current(ctx, size, t, dt);
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [size, ...deps]);

  return canvasRef;
}
