export type LoaderBackdrop = "transparent" | "mark";

/** Soft monochrome ink — melts into dark UI backgrounds. */
export const LOADER_THEME = {
  ghost: "rgba(255,255,255,0.05)",
  ghostStrong: "rgba(255,255,255,0.09)",
  pulse: "rgba(255,255,255,0.75)",
  pulseSoft: "rgba(255,255,255,0.38)",
  head: "rgba(255,255,255,0.88)",
  headCore: "rgba(255,255,255,0.98)",
  glow: "rgba(255,255,255,0.45)",
  markBg: "#f4f2ec",
} as const;

/** Bloom radius for bright strokes (px). */
export const LOADER_GLOW = {
  soft: 4,
  pulse: 10,
  head: 14,
} as const;

export function resolveLoaderColors(backdrop: LoaderBackdrop = "transparent") {
  return LOADER_THEME;
}

export function shouldDrawGuides(backdrop: LoaderBackdrop = "transparent"): boolean {
  return backdrop === "mark";
}

export function isTransparentBackdrop(backdrop: LoaderBackdrop = "transparent"): boolean {
  return backdrop === "transparent";
}
