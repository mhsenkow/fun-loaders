/** Apply magnetic friction toward nearby snap points. */
export function applySnapFriction(
  value: number,
  snapPoints: number[],
  min: number,
  max: number,
  friction = 0.42,
  thresholdFraction = 0.045,
): number {
  if (snapPoints.length === 0) return value;
  const range = max - min || 1;
  const threshold = range * thresholdFraction;
  let nearest = snapPoints[0];
  let nearestDist = Math.abs(value - nearest);
  for (let i = 1; i < snapPoints.length; i++) {
    const d = Math.abs(value - snapPoints[i]);
    if (d < nearestDist) {
      nearestDist = d;
      nearest = snapPoints[i];
    }
  }
  if (nearestDist < threshold) {
    const pull = 1 - nearestDist / threshold;
    return value + (nearest - value) * pull * friction;
  }
  return value;
}

/** Hard snap on release if close enough. */
export function snapOnRelease(
  value: number,
  snapPoints: number[],
  min: number,
  max: number,
  thresholdFraction = 0.025,
): number {
  if (snapPoints.length === 0) return value;
  const range = max - min || 1;
  const threshold = range * thresholdFraction;
  let nearest = snapPoints[0];
  let nearestDist = Math.abs(value - nearest);
  for (let i = 1; i < snapPoints.length; i++) {
    const d = Math.abs(value - snapPoints[i]);
    if (d < nearestDist) {
      nearestDist = d;
      nearest = snapPoints[i];
    }
  }
  return nearestDist < threshold ? nearest : value;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function roundToStep(value: number, step: number): number {
  if (step <= 0) return value;
  const inv = 1 / step;
  return Math.round(value * inv) / inv;
}
