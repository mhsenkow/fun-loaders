import type { LoaderBackdrop } from "./loaderTheme";

/** Props backdrop wins, then params, then default. */
export function resolveBackdrop(
  propBackdrop: LoaderBackdrop | undefined,
  params: { backdrop?: LoaderBackdrop } | undefined,
  fallback: LoaderBackdrop = "transparent",
): LoaderBackdrop {
  return propBackdrop ?? params?.backdrop ?? fallback;
}
