import type { LoaderShape } from "./lib/shape";
import type { LoaderBackdrop } from "./lib/loaderTheme";

export type { LoaderShape } from "./lib/shape";
export type { LoaderBackdrop } from "./lib/loaderTheme";

export interface LoaderProps {
  /** Canvas size in CSS pixels (default 220) */
  size?: number;
  /** Logo frame — circle or square */
  shape?: LoaderShape;
  /** Transparent motion-only (default) or cream logo-mark card */
  backdrop?: LoaderBackdrop;
  /** Optional caption below the loader */
  label?: string;
  /** Extra class on the wrapper */
  className?: string;
  /** Named preset — each loader exports its own preset map */
  preset?: string;
}

export const DEFAULT_SIZE = 220;
