export type { LoaderProps, LoaderShape, LoaderBackdrop } from "./types";
export { DEFAULT_SIZE } from "./types";
export { LoaderShell } from "./LoaderShell";
export { useCanvasLoop } from "./hooks/useCanvasLoop";
export {
  getShapeBounds,
  clipShape,
  containsShape,
  shapeRadius,
  perimeterPoint,
  type ShapeBounds,
} from "./lib/shape";
export {
  beginLoaderFrame,
  endLoaderFrame,
  warmFeatherMask,
  type BeginLoaderFrameOptions,
  type LoaderFrame,
} from "./lib/loaderFrame";
export {
  LOADER_THEME,
  LOADER_GLOW,
  shouldDrawGuides,
} from "./lib/loaderTheme";
export {
  drawSoftGlow,
  drawSoftComet,
  strokeSegment,
  edgeFeather,
} from "./lib/loaderPaint";
export { resolveShape } from "./lib/resolveShape";
export { resolveBackdrop } from "./lib/resolveBackdrop";
export {
  drawLogoGuides,
  buildSpiralPath,
  buildPolarMazePath,
  radialLoopPhase,
  diagonalLoopPhase,
  drawPathPulseMono,
  drawPulseHead,
} from "./lib/logoGrammar";
export { loopT, loopSin, loopPingPong, loopJustWrapped, cyclicDist, loopHue, loopCrossfade } from "./lib/loop";
export { linearWindow, loopWindow } from "./lib/loopDraw";
export { resolveParams, presetNames, type PresetDefinition } from "./lib/presets";

export {
  MengerLoader,
  MENGER_PRESETS,
  MENGER_DEFAULT_PARAMS,
  type MengerLoaderParams,
  type MengerLoaderProps,
} from "./loaders/MengerLoader";

export {
  ReactionDiffusionLoader,
  REACTION_DIFFUSION_PRESETS,
  REACTION_DIFFUSION_DEFAULT_PARAMS,
  type ReactionDiffusionLoaderParams,
  type ReactionDiffusionLoaderProps,
  type ReactionDiffusionColorMode,
} from "./loaders/ReactionDiffusionLoader";

export {
  HilbertLoader,
  HILBERT_PRESETS,
  HILBERT_DEFAULT_PARAMS,
  type HilbertLoaderParams,
  type HilbertLoaderProps,
} from "./loaders/HilbertLoader";

export {
  AttractorLoader,
  ATTRACTOR_PRESETS,
  ATTRACTOR_DEFAULT_PARAMS,
  type AttractorLoaderParams,
  type AttractorLoaderProps,
} from "./loaders/AttractorLoader";

export {
  SpirographLoader,
  SPIROGRAPH_PRESETS,
  SPIROGRAPH_DEFAULT_PARAMS,
  type SpirographLoaderParams,
  type SpirographLoaderProps,
} from "./loaders/SpirographLoader";

export {
  VoronoiLoader,
  VORONOI_PRESETS,
  VORONOI_DEFAULT_PARAMS,
  type VoronoiLoaderParams,
  type VoronoiLoaderProps,
} from "./loaders/VoronoiLoader";

export {
  FlowFieldLoader,
  FLOW_FIELD_PRESETS,
  FLOW_FIELD_DEFAULT_PARAMS,
  type FlowFieldLoaderParams,
  type FlowFieldLoaderProps,
} from "./loaders/FlowFieldLoader";

export {
  LSystemLoader,
  LSYSTEM_PRESETS,
  LSYSTEM_DEFAULT_PARAMS,
  type LSystemLoaderParams,
  type LSystemLoaderProps,
  type LSystemRuleSet,
} from "./loaders/LSystemLoader";

export {
  MazeLoader,
  MAZE_PRESETS,
  MAZE_DEFAULT_PARAMS,
  type MazeLoaderParams,
  type MazeLoaderProps,
} from "./loaders/MazeLoader";

export {
  TorusKnotLoader,
  TORUS_KNOT_PRESETS,
  TORUS_KNOT_DEFAULT_PARAMS,
  type TorusKnotLoaderParams,
  type TorusKnotLoaderProps,
} from "./loaders/TorusKnotLoader";

import { MengerLoader, MENGER_PRESETS } from "./loaders/MengerLoader";
import {
  ReactionDiffusionLoader,
  REACTION_DIFFUSION_PRESETS,
} from "./loaders/ReactionDiffusionLoader";
import { HilbertLoader, HILBERT_PRESETS } from "./loaders/HilbertLoader";
import { AttractorLoader, ATTRACTOR_PRESETS } from "./loaders/AttractorLoader";
import { SpirographLoader, SPIROGRAPH_PRESETS } from "./loaders/SpirographLoader";
import { VoronoiLoader, VORONOI_PRESETS } from "./loaders/VoronoiLoader";
import { FlowFieldLoader, FLOW_FIELD_PRESETS } from "./loaders/FlowFieldLoader";
import { LSystemLoader, LSYSTEM_PRESETS } from "./loaders/LSystemLoader";
import { MazeLoader, MAZE_PRESETS } from "./loaders/MazeLoader";
import { TorusKnotLoader, TORUS_KNOT_PRESETS } from "./loaders/TorusKnotLoader";

/** Center-screen loaders — transparent monochrome by default. */
export const LOADERS = [
  {
    id: "menger",
    name: "Menger",
    description: "Radial carpet pulse · isometric wireframe",
    Component: MengerLoader,
    presets: MENGER_PRESETS,
    defaultPreset: "loader",
  },
  {
    id: "reaction-diffusion",
    name: "Reaction Diffusion",
    description: "Organic contour bloom",
    Component: ReactionDiffusionLoader,
    presets: REACTION_DIFFUSION_PRESETS,
    defaultPreset: "loader",
  },
  {
    id: "hilbert",
    name: "Hilbert",
    description: "Golden spiral · space-filling tracer",
    Component: HilbertLoader,
    presets: HILBERT_PRESETS,
    defaultPreset: "loader",
  },
  {
    id: "attractor",
    name: "Attractor",
    description: "Comet orbit · quadrant grid",
    Component: AttractorLoader,
    presets: ATTRACTOR_PRESETS,
    defaultPreset: "loader",
  },
  {
    id: "spirograph",
    name: "Spirograph",
    description: "Ink trails · nested square perimeters",
    Component: SpirographLoader,
    presets: SPIROGRAPH_PRESETS,
    defaultPreset: "loader",
  },
  {
    id: "voronoi",
    name: "Voronoi",
    description: "Pulsing cell borders",
    Component: VoronoiLoader,
    presets: VORONOI_PRESETS,
    defaultPreset: "loader",
  },
  {
    id: "flow-field",
    name: "Flow Field",
    description: "Spiral stream · horizontal bands",
    Component: FlowFieldLoader,
    presets: FLOW_FIELD_PRESETS,
    defaultPreset: "loader",
  },
  {
    id: "lsystem",
    name: "L-System",
    description: "Branching growth pulse",
    Component: LSystemLoader,
    presets: LSYSTEM_PRESETS,
    defaultPreset: "loader",
  },
  {
    id: "maze",
    name: "Maze",
    description: "Polar corridors · square grid chase",
    Component: MazeLoader,
    presets: MAZE_PRESETS,
    defaultPreset: "loader",
  },
  {
    id: "torus-knot",
    name: "Torus Knot",
    description: "Trefoil wire · superellipse weave",
    Component: TorusKnotLoader,
    presets: TORUS_KNOT_PRESETS,
    defaultPreset: "loader",
  },
] as const;

export type LoaderId = (typeof LOADERS)[number]["id"];
