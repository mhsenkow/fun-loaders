export interface ParamFieldSchema {
  key: string;
  label: string;
  hint?: string;
  min: number;
  max: number;
  step: number;
  /** Curated + preset-derived anchor values */
  snapPoints: number[];
  friction?: number;
  decimals?: number;
}

export interface LoaderControlSchema {
  loaderId: string;
  fields: ParamFieldSchema[];
}
