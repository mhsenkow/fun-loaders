import {
  cyclicDist,
  loopCrossfade,
  loopPingPong,
  loopSin,
  loopT,
} from "./loop";

export interface LoopState {
  progress: number;
  phase: number;
  ping: number;
  sin: number;
  crossfade: number;
}

export function getLoopState(t: number, duration: number): LoopState {
  const progress = loopT(t, duration);
  return {
    progress,
    phase: progress * Math.PI * 2,
    ping: loopPingPong(t, duration),
    sin: loopSin(t, duration),
    crossfade: loopCrossfade(t, duration),
  };
}

/** Progress for open paths — ping-pong so ends match for seamless loops. */
export function openProgress(t: number, duration: number): number {
  return loopPingPong(t, duration);
}

/**
 * Self-similar waves at 1×, 3×, 9× … scales on a closed ring.
 * Reads as recursive depth without changing geometry.
 */
export function nestedWave(
  position: number,
  center: number,
  halfWidth: number,
  depth = 3,
): number {
  let sum = 0;
  let weight = 1;
  let total = 0;
  for (let i = 0; i < depth; i++) {
    const freq = Math.pow(3, i);
    const scaledPos = (position * freq) % 1;
    const scaledCenter = (center * freq) % 1;
    const d = cyclicDist(scaledPos, scaledCenter);
    const hw = halfWidth * (0.85 + i * 0.08);
    const raw = hw > 0 ? 1 - Math.min(1, d / hw) : 0;
    const w = raw * raw * (3 - 2 * raw);
    sum += w * weight;
    total += weight;
    weight *= 0.5;
  }
  return total > 0 ? sum / total : 0;
}

/** Same as nestedWave but on an open 0–1 segment (no wrap). */
export function nestedWaveOpen(
  position: number,
  center: number,
  halfWidth: number,
  depth = 3,
): number {
  let sum = 0;
  let weight = 1;
  let total = 0;
  for (let i = 0; i < depth; i++) {
    const freq = Math.pow(3, i);
    const scaledPos = Math.max(0, Math.min(1, position * freq - Math.floor(position * freq)));
    const scaledCenter = Math.max(0, Math.min(1, center * freq - Math.floor(center * freq)));
    const d = Math.abs(scaledPos - scaledCenter);
    const hw = halfWidth * (0.85 + i * 0.08);
    const raw = hw > 0 ? 1 - Math.min(1, d / hw) : 0;
    const w = raw * raw * (3 - 2 * raw);
    sum += w * weight;
    total += weight;
    weight *= 0.5;
  }
  return total > 0 ? sum / total : 0;
}

/** Comet tail sample positions along a loop. */
export function cometChain(
  head: number,
  count: number,
  spacing: number,
  closed: boolean,
): number[] {
  const pts: number[] = [];
  for (let i = 0; i < count; i++) {
    const p = head - i * spacing;
    if (closed) {
      pts.push(((p % 1) + 1) % 1);
    } else {
      pts.push(Math.max(0, Math.min(1, p)));
    }
  }
  return pts;
}

export function smoothBright(v: number): number {
  const x = Math.max(0, Math.min(1, v));
  return x * x * (3 - 2 * x);
}
