/** Normalized loop position 0 (start) → 1 (end, wraps to 0). */
export function loopT(t: number, duration: number): number {
  if (duration <= 0) return 0;
  return (t % duration) / duration;
}

/** Sine wave that completes one full cycle per duration. */
export function loopSin(t: number, duration: number): number {
  return Math.sin(loopT(t, duration) * Math.PI * 2);
}

/** Ping-pong 0 → 1 → 0 over one cycle. */
export function loopPingPong(t: number, duration: number): number {
  const p = loopT(t, duration);
  return p < 0.5 ? p * 2 : 2 - p * 2;
}

/** True on the frame the loop wraps (within dt tolerance). */
export function loopJustWrapped(
  t: number,
  dt: number,
  duration: number,
): boolean {
  if (duration <= 0) return false;
  const prev = t - dt;
  return Math.floor(prev / duration) < Math.floor(t / duration);
}

/** Shortest distance on a 0–1 ring (for seamless loops). */
export function cyclicDist(a: number, b: number): number {
  const d = Math.abs(a - b);
  return Math.min(d, 1 - d);
}

/** Fade in/out at loop boundaries for seamless restarts. */
export function loopCrossfade(
  t: number,
  duration: number,
  margin = 0.06,
): number {
  const p = loopT(t, duration);
  const fadeIn = p < margin ? p / margin : 1;
  const fadeOut = p > 1 - margin ? (1 - p) / margin : 1;
  return Math.min(fadeIn, fadeOut);
}

/** Hue tied to loop phase (0–360). */
export function loopHue(
  t: number,
  duration: number,
  turns = 1,
  offset = 0,
): number {
  return (loopT(t, duration) * 360 * turns + offset) % 360;
}
