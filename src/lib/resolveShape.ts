import type { LoaderShape } from "./shape";

/** Props shape wins, then params, then default. */
export function resolveShape(
  propShape: LoaderShape | undefined,
  params: { shape?: LoaderShape } | undefined,
  fallback: LoaderShape = "circle",
): LoaderShape {
  return propShape ?? params?.shape ?? fallback;
}
