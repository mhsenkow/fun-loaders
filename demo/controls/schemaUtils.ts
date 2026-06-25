import type { PresetDefinition } from "../../src/lib/presets";

/** Collect unique numeric values for a param key across presets. */
export function snapsFromPresets<P extends object>(
  presets: Record<string, PresetDefinition<P>>,
  key: keyof P,
  extra: number[] = [],
): number[] {
  const vals = new Set<number>(extra);
  for (const preset of Object.values(presets)) {
    const v = preset.params[key];
    if (typeof v === "number" && Number.isFinite(v)) {
      vals.add(v);
    }
  }
  return [...vals].sort((a, b) => a - b);
}

export function snaps(...values: number[]): number[] {
  return [...new Set(values)].sort((a, b) => a - b);
}

export function field(
  key: string,
  label: string,
  min: number,
  max: number,
  step: number,
  snapPoints: number[],
  hint?: string,
  friction?: number,
  decimals?: number,
): import("./types").ParamFieldSchema {
  return {
    key,
    label,
    hint,
    min,
    max,
    step,
    snapPoints,
    friction,
    decimals,
  };
}
