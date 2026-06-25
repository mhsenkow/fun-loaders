import { cyclicDist } from "./loop";

/** Brightness 0–1 for a traveling band on a 0–1 open segment. */
export function linearWindow(
  position: number,
  center: number,
  halfWidth: number,
): number {
  if (halfWidth <= 0) return 0;
  const d = Math.abs(position - center);
  if (d >= halfWidth) return 0;
  return 1 - d / halfWidth;
}

/** Brightness 0–1 for a traveling band on a closed 0–1 ring. */
export function loopWindow(
  position: number,
  center: number,
  halfWidth: number,
): number {
  if (halfWidth <= 0) return 0;
  const d = cyclicDist(position, center);
  if (d >= halfWidth) return 0;
  const raw = 1 - d / halfWidth;
  return raw * raw * (3 - 2 * raw);
}
