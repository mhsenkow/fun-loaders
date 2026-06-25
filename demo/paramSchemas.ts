import {
  MENGER_PRESETS,
  MENGER_DEFAULT_PARAMS,
} from "../src/loaders/MengerLoader";
import {
  REACTION_DIFFUSION_PRESETS,
  REACTION_DIFFUSION_DEFAULT_PARAMS,
} from "../src/loaders/ReactionDiffusionLoader";
import {
  HILBERT_PRESETS,
  HILBERT_DEFAULT_PARAMS,
} from "../src/loaders/HilbertLoader";
import {
  ATTRACTOR_PRESETS,
  ATTRACTOR_DEFAULT_PARAMS,
} from "../src/loaders/AttractorLoader";
import {
  SPIROGRAPH_PRESETS,
  SPIROGRAPH_DEFAULT_PARAMS,
} from "../src/loaders/SpirographLoader";
import {
  VORONOI_PRESETS,
  VORONOI_DEFAULT_PARAMS,
} from "../src/loaders/VoronoiLoader";
import {
  FLOW_FIELD_PRESETS,
  FLOW_FIELD_DEFAULT_PARAMS,
} from "../src/loaders/FlowFieldLoader";
import {
  LSYSTEM_PRESETS,
  LSYSTEM_DEFAULT_PARAMS,
  type LSystemRuleSet,
} from "../src/loaders/LSystemLoader";
import {
  MAZE_PRESETS,
  MAZE_DEFAULT_PARAMS,
} from "../src/loaders/MazeLoader";
import {
  TORUS_KNOT_PRESETS,
  TORUS_KNOT_DEFAULT_PARAMS,
} from "../src/loaders/TorusKnotLoader";
import type { LoaderId } from "../src";
import type { LoaderControlSchema } from "./controls/types";
import { field, snaps, snapsFromPresets } from "./controls/schemaUtils";

export const LOADER_CONTROL_SCHEMAS: Record<LoaderId, LoaderControlSchema> = {
  menger: {
    loaderId: "menger",
    fields: [
      field(
        "cycleDuration",
        "Loop duration",
        1500,
        8000,
        100,
        snapsFromPresets(MENGER_PRESETS, "cycleDuration", [2400, 3200, 4000]),
        "Wave cycle length (ms)",
      ),
      field(
        "waveWidth",
        "Wave width",
        0.08,
        0.55,
        0.01,
        snapsFromPresets(MENGER_PRESETS, "waveWidth", [0.15, 0.22, 0.28, 0.35]),
        "How broad the light sweep is",
      ),
      field(
        "saturation",
        "Saturation",
        10,
        100,
        1,
        snapsFromPresets(MENGER_PRESETS, "saturation", [55, 78, 90]),
      ),
      field(
        "lightness",
        "Lightness",
        30,
        80,
        1,
        snapsFromPresets(MENGER_PRESETS, "lightness", [42, 48, 52, 68]),
      ),
      field(
        "hueBase",
        "Hue base",
        0,
        360,
        1,
        snapsFromPresets(MENGER_PRESETS, "hueBase", [0, 15, 115, 200, 300]),
      ),
      field(
        "hueSpread",
        "Hue spread",
        0,
        360,
        5,
        snapsFromPresets(MENGER_PRESETS, "hueSpread", [20, 55, 120, 360]),
      ),
    ],
  },

  "reaction-diffusion": {
    loaderId: "reaction-diffusion",
    fields: [
      field(
        "cycleDuration",
        "Breathe cycle",
        2000,
        12000,
        100,
        snapsFromPresets(REACTION_DIFFUSION_PRESETS, "cycleDuration"),
        "Visual pulse period (sim keeps running)",
      ),
      field(
        "feed",
        "Feed rate",
        0.03,
        0.058,
        0.0005,
        snapsFromPresets(REACTION_DIFFUSION_PRESETS, "feed", [0.037, 0.0545]),
        "Growth aggressiveness",
        0.5,
        4,
      ),
      field(
        "kill",
        "Kill rate",
        0.055,
        0.068,
        0.0005,
        snapsFromPresets(REACTION_DIFFUSION_PRESETS, "kill", [0.06, 0.062]),
        "Pattern sharpness / death",
        0.5,
        4,
      ),
      field(
        "diffusionA",
        "Diffusion A",
        0.6,
        1.2,
        0.05,
        snaps(0.9, 1.0, 1.1),
      ),
      field(
        "diffusionB",
        "Diffusion B",
        0.3,
        0.7,
        0.05,
        snaps(0.45, 0.5, 0.55),
      ),
      field(
        "seedRadius",
        "Seed size",
        3,
        14,
        1,
        snapsFromPresets(REACTION_DIFFUSION_PRESETS, "seedRadius"),
      ),
      field(
        "threshold",
        "Edge threshold",
        0.06,
        0.18,
        0.005,
        snapsFromPresets(REACTION_DIFFUSION_PRESETS, "threshold"),
        undefined,
        0.45,
        3,
      ),
      field(
        "hueSpeed",
        "Hue drift",
        0,
        0.1,
        0.005,
        snapsFromPresets(REACTION_DIFFUSION_PRESETS, "hueSpeed"),
      ),
      field(
        "feedWobble",
        "Feed wobble",
        0,
        0.01,
        0.0005,
        snapsFromPresets(REACTION_DIFFUSION_PRESETS, "feedWobble"),
        "Keeps sim alive",
        0.55,
        4,
      ),
      field(
        "killWobble",
        "Kill wobble",
        0,
        0.01,
        0.0005,
        snapsFromPresets(REACTION_DIFFUSION_PRESETS, "killWobble"),
        undefined,
        0.55,
        4,
      ),
      field(
        "perturbInterval",
        "Spark interval",
        400,
        2500,
        50,
        snapsFromPresets(REACTION_DIFFUSION_PRESETS, "perturbInterval"),
        "New growth sparks (ms)",
      ),
      field(
        "perturbRadius",
        "Spark size",
        2,
        8,
        1,
        snapsFromPresets(REACTION_DIFFUSION_PRESETS, "perturbRadius"),
      ),
      field(
        "perturbCount",
        "Sparks / burst",
        1,
        8,
        1,
        snapsFromPresets(REACTION_DIFFUSION_PRESETS, "perturbCount"),
      ),
    ],
  },

  hilbert: {
    loaderId: "hilbert",
    fields: [
      field(
        "cycleDuration",
        "Trace cycle",
        1500,
        8000,
        100,
        snapsFromPresets(HILBERT_PRESETS, "cycleDuration"),
      ),
      field(
        "order",
        "Curve order",
        3,
        6,
        1,
        snapsFromPresets(HILBERT_PRESETS, "order", [4, 5]),
        "Higher = denser curve",
        0.6,
        0,
      ),
      field(
        "trailFraction",
        "Trail length",
        0.1,
        0.9,
        0.05,
        snapsFromPresets(HILBERT_PRESETS, "trailFraction"),
      ),
      field(
        "lineWidth",
        "Line width",
        0.5,
        3.5,
        0.1,
        snapsFromPresets(HILBERT_PRESETS, "lineWidth"),
        undefined,
        0.5,
        1,
      ),
      field(
        "hueStart",
        "Hue start",
        0,
        360,
        1,
        snapsFromPresets(HILBERT_PRESETS, "hueStart"),
      ),
      field(
        "hueSpread",
        "Hue spread",
        0,
        180,
        5,
        snapsFromPresets(HILBERT_PRESETS, "hueSpread"),
      ),
      field(
        "headGlow",
        "Head glow",
        4,
        20,
        1,
        snapsFromPresets(HILBERT_PRESETS, "headGlow"),
      ),
    ],
  },

  attractor: {
    loaderId: "attractor",
    fields: [
      field(
        "cycleDuration",
        "Reset cycle",
        2000,
        10000,
        100,
        snapsFromPresets(ATTRACTOR_PRESETS, "cycleDuration"),
      ),
      field(
        "particleCount",
        "Particles",
        40,
        250,
        10,
        snapsFromPresets(ATTRACTOR_PRESETS, "particleCount", [100, 120, 200]),
      ),
      field(
        "trailFade",
        "Trail fade",
        0.04,
        0.28,
        0.01,
        snapsFromPresets(ATTRACTOR_PRESETS, "trailFade"),
        "Lower = longer trails",
      ),
      field(
        "paramA",
        "Attractor A",
        -2,
        -0.8,
        0.05,
        snapsFromPresets(ATTRACTOR_PRESETS, "paramA"),
      ),
      field(
        "paramB",
        "Attractor B",
        1,
        2,
        0.05,
        snapsFromPresets(ATTRACTOR_PRESETS, "paramB"),
      ),
      field(
        "paramC",
        "Attractor C",
        0.6,
        1.4,
        0.05,
        snapsFromPresets(ATTRACTOR_PRESETS, "paramC"),
      ),
      field(
        "paramD",
        "Attractor D",
        0.4,
        1.1,
        0.05,
        snapsFromPresets(ATTRACTOR_PRESETS, "paramD"),
      ),
      field(
        "morphAmount",
        "Morph amount",
        0.05,
        0.6,
        0.05,
        snapsFromPresets(ATTRACTOR_PRESETS, "morphAmount"),
      ),
      field(
        "hueSpeed",
        "Hue speed",
        0.01,
        0.12,
        0.005,
        snapsFromPresets(ATTRACTOR_PRESETS, "hueSpeed"),
      ),
      field(
        "particleSize",
        "Dot size",
        0.6,
        2.2,
        0.1,
        snapsFromPresets(ATTRACTOR_PRESETS, "particleSize"),
        undefined,
        0.5,
        1,
      ),
    ],
  },

  spirograph: {
    loaderId: "spirograph",
    fields: [
      field(
        "cycleDuration",
        "Revolution",
        1200,
        6000,
        100,
        snapsFromPresets(SPIROGRAPH_PRESETS, "cycleDuration"),
      ),
      field(
        "ringRatio",
        "Gear ratio",
        0.15,
        0.5,
        0.01,
        snapsFromPresets(SPIROGRAPH_PRESETS, "ringRatio"),
      ),
      field(
        "penOffset",
        "Pen offset",
        0.25,
        0.95,
        0.01,
        snapsFromPresets(SPIROGRAPH_PRESETS, "penOffset"),
      ),
      field(
        "layers",
        "Layers",
        1,
        6,
        1,
        snapsFromPresets(SPIROGRAPH_PRESETS, "layers", [2, 3, 4]),
        undefined,
        0.55,
        0,
      ),
      field(
        "rotations",
        "Rotations",
        2,
        15,
        1,
        snapsFromPresets(SPIROGRAPH_PRESETS, "rotations"),
      ),
      field(
        "lineWidth",
        "Line width",
        0.6,
        3,
        0.1,
        snapsFromPresets(SPIROGRAPH_PRESETS, "lineWidth"),
        undefined,
        0.5,
        1,
      ),
      field(
        "trailFade",
        "Trail fade",
        0.02,
        0.12,
        0.005,
        snapsFromPresets(SPIROGRAPH_PRESETS, "trailFade"),
        "How fast ink fades",
      ),
      field(
        "hueSpeed",
        "Hue speed",
        0.02,
        0.18,
        0.01,
        snapsFromPresets(SPIROGRAPH_PRESETS, "hueSpeed"),
      ),
    ],
  },

  voronoi: {
    loaderId: "voronoi",
    fields: [
      field(
        "cycleDuration",
        "Pulse cycle",
        1500,
        8000,
        100,
        snapsFromPresets(VORONOI_PRESETS, "cycleDuration"),
      ),
      field(
        "siteCount",
        "Sites",
        8,
        30,
        1,
        snapsFromPresets(VORONOI_PRESETS, "siteCount", [12, 18, 24]),
      ),
      field(
        "resolution",
        "Resolution",
        40,
        120,
        5,
        snapsFromPresets(VORONOI_PRESETS, "resolution", [60, 80, 100]),
      ),
      field(
        "waveWidth",
        "Wave width",
        0.08,
        0.28,
        0.01,
        snapsFromPresets(VORONOI_PRESETS, "waveWidth"),
        "How broad the pulse sweep is",
      ),
      field(
        "hueBase",
        "Hue base",
        0,
        360,
        1,
        snapsFromPresets(VORONOI_PRESETS, "hueBase"),
      ),
      field(
        "hueSpread",
        "Hue spread",
        0,
        60,
        1,
        snapsFromPresets(VORONOI_PRESETS, "hueSpread"),
      ),
      field(
        "saturation",
        "Saturation",
        5,
        95,
        1,
        snapsFromPresets(VORONOI_PRESETS, "saturation"),
      ),
      field(
        "lightness",
        "Lightness",
        30,
        70,
        1,
        snapsFromPresets(VORONOI_PRESETS, "lightness"),
      ),
    ],
  },

  "flow-field": {
    loaderId: "flow-field",
    fields: [
      field(
        "cycleDuration",
        "Reset cycle",
        2000,
        9000,
        100,
        snapsFromPresets(FLOW_FIELD_PRESETS, "cycleDuration"),
      ),
      field(
        "particleCount",
        "Particles",
        80,
        350,
        10,
        snapsFromPresets(FLOW_FIELD_PRESETS, "particleCount"),
      ),
      field(
        "speed",
        "Speed",
        0.4,
        2.0,
        0.05,
        snapsFromPresets(FLOW_FIELD_PRESETS, "speed"),
      ),
      field(
        "tailLength",
        "Tail length",
        8,
        28,
        1,
        snapsFromPresets(FLOW_FIELD_PRESETS, "tailLength"),
      ),
      field(
        "hueBase",
        "Hue base",
        0,
        360,
        1,
        snapsFromPresets(FLOW_FIELD_PRESETS, "hueBase"),
      ),
      field(
        "hueSpread",
        "Hue spread",
        0,
        60,
        1,
        snapsFromPresets(FLOW_FIELD_PRESETS, "hueSpread"),
      ),
      field(
        "saturation",
        "Saturation",
        5,
        95,
        1,
        snapsFromPresets(FLOW_FIELD_PRESETS, "saturation"),
      ),
    ],
  },

  lsystem: {
    loaderId: "lsystem",
    fields: [
      field(
        "cycleDuration",
        "Pulse cycle",
        2000,
        7000,
        100,
        snapsFromPresets(LSYSTEM_PRESETS, "cycleDuration"),
      ),
      field(
        "iterations",
        "Iterations",
        2,
        4,
        1,
        snaps(2, 3, 4),
        "Branch complexity (capped for performance)",
        0.6,
        0,
      ),
      field(
        "angleDeg",
        "Branch angle",
        20,
        60,
        1,
        snaps(25, 30, 36, 45, 51),
        "Degrees between branches",
      ),
      field(
        "step",
        "Step size",
        2,
        6,
        0.5,
        snaps(3, 3.5, 4, 5),
      ),
      field(
        "hueBase",
        "Hue base",
        0,
        360,
        1,
        snapsFromPresets(LSYSTEM_PRESETS, "hueBase"),
      ),
      field(
        "hueSpread",
        "Hue spread",
        10,
        100,
        5,
        snapsFromPresets(LSYSTEM_PRESETS, "hueSpread"),
      ),
      field(
        "trailFraction",
        "Pulse width",
        0.06,
        0.35,
        0.01,
        snapsFromPresets(LSYSTEM_PRESETS, "trailFraction"),
        "Width of traveling glow",
      ),
    ],
  },

  maze: {
    loaderId: "maze",
    fields: [
      field(
        "cycleDuration",
        "Walk cycle",
        2500,
        8000,
        100,
        snapsFromPresets(MAZE_PRESETS, "cycleDuration"),
      ),
      field(
        "mazeSize",
        "Maze size",
        21,
        39,
        2,
        snapsFromPresets(MAZE_PRESETS, "mazeSize", [25, 31, 35]),
        "Must be odd",
        0.55,
        0,
      ),
      field(
        "trailLength",
        "Trail length",
        15,
        60,
        5,
        snapsFromPresets(MAZE_PRESETS, "trailLength"),
      ),
      field(
        "pulseHue",
        "Pulse hue",
        0,
        360,
        1,
        snapsFromPresets(MAZE_PRESETS, "pulseHue"),
      ),
      field(
        "pulseSaturation",
        "Pulse sat",
        0,
        100,
        1,
        snapsFromPresets(MAZE_PRESETS, "pulseSaturation"),
      ),
      field(
        "seed",
        "Seed",
        1,
        500,
        1,
        snapsFromPresets(MAZE_PRESETS, "seed", [7, 42, 88, 123, 256]),
      ),
    ],
  },

  "torus-knot": {
    loaderId: "torus-knot",
    fields: [
      field(
        "cycleDuration",
        "Spin cycle",
        2000,
        8000,
        100,
        snapsFromPresets(TORUS_KNOT_PRESETS, "cycleDuration"),
      ),
      field(
        "p",
        "P windings",
        2,
        4,
        1,
        snapsFromPresets(TORUS_KNOT_PRESETS, "p", [2, 3]),
        undefined,
        0.65,
        0,
      ),
      field(
        "q",
        "Q windings",
        3,
        8,
        1,
        snapsFromPresets(TORUS_KNOT_PRESETS, "q", [3, 4, 5, 7]),
        undefined,
        0.65,
        0,
      ),
      field(
        "lineWidth",
        "Line width",
        0.5,
        2.5,
        0.1,
        snapsFromPresets(TORUS_KNOT_PRESETS, "lineWidth"),
        undefined,
        0.5,
        1,
      ),
      field(
        "hueSpeed",
        "Hue speed",
        0,
        0.15,
        0.005,
        snapsFromPresets(TORUS_KNOT_PRESETS, "hueSpeed"),
      ),
      field(
        "headGlow",
        "Head glow",
        4,
        18,
        1,
        snapsFromPresets(TORUS_KNOT_PRESETS, "headGlow"),
      ),
    ],
  },
};

const DEFAULTS_BY_LOADER: Record<LoaderId, object> = {
  menger: MENGER_DEFAULT_PARAMS,
  "reaction-diffusion": REACTION_DIFFUSION_DEFAULT_PARAMS,
  hilbert: HILBERT_DEFAULT_PARAMS,
  attractor: ATTRACTOR_DEFAULT_PARAMS,
  spirograph: SPIROGRAPH_DEFAULT_PARAMS,
  voronoi: VORONOI_DEFAULT_PARAMS,
  "flow-field": FLOW_FIELD_DEFAULT_PARAMS,
  lsystem: LSYSTEM_DEFAULT_PARAMS,
  maze: MAZE_DEFAULT_PARAMS,
  "torus-knot": TORUS_KNOT_DEFAULT_PARAMS,
};

export function getFieldBaseValue(
  loaderId: LoaderId,
  presetParams: Record<string, unknown>,
  key: string,
): number {
  if (key === "angleDeg") {
    const ruleSet = presetParams.ruleSet as { angle?: number } | undefined;
    const rad = ruleSet?.angle ?? Math.PI / 6;
    return Math.round((rad * 180) / Math.PI);
  }
  if (key === "iterations") {
    const ruleSet = presetParams.ruleSet as { iterations?: number } | undefined;
    return ruleSet?.iterations ?? 4;
  }
  if (key === "step") {
    const ruleSet = presetParams.ruleSet as { step?: number } | undefined;
    return ruleSet?.step ?? 4;
  }
  const v = presetParams[key];
  if (typeof v === "number") return v;
  const defaults = DEFAULTS_BY_LOADER[loaderId] as Record<string, unknown>;
  const d = defaults[key];
  return typeof d === "number" ? d : 0;
}

export function buildLoaderParams(
  loaderId: LoaderId,
  presetParams: Record<string, unknown>,
  overrides: Record<string, number>,
): Record<string, unknown> {
  const params: Record<string, unknown> = { ...overrides };

  if (loaderId === "lsystem") {
    const fallback = DEFAULTS_BY_LOADER.lsystem as {
      ruleSet: LSystemRuleSet;
    };
    const ruleSet = {
      ...fallback.ruleSet,
      ...(presetParams.ruleSet as object),
    } as Record<string, unknown>;
    if (overrides.iterations !== undefined) {
      ruleSet.iterations = Math.min(4, Math.round(overrides.iterations));
    }
    if (overrides.angleDeg !== undefined) {
      ruleSet.angle = (overrides.angleDeg * Math.PI) / 180;
    }
    if (overrides.step !== undefined) {
      ruleSet.step = overrides.step;
    }
    params.ruleSet = ruleSet;
    delete params.iterations;
    delete params.angleDeg;
    delete params.step;
  }

  if (loaderId === "hilbert" && overrides.order !== undefined) {
    params.order = Math.round(overrides.order);
  }
  if (loaderId === "maze" && overrides.mazeSize !== undefined) {
    const s = Math.round(overrides.mazeSize);
    params.mazeSize = s % 2 === 0 ? s + 1 : s;
  }
  if (loaderId === "torus-knot") {
    if (overrides.p !== undefined) params.p = Math.round(overrides.p);
    if (overrides.q !== undefined) params.q = Math.round(overrides.q);
  }
  if (loaderId === "spirograph" && overrides.layers !== undefined) {
    params.layers = Math.round(overrides.layers);
  }
  if (loaderId === "voronoi" && overrides.siteCount !== undefined) {
    params.siteCount = Math.round(overrides.siteCount);
  }
  if (loaderId === "attractor" && overrides.particleCount !== undefined) {
    params.particleCount = Math.round(overrides.particleCount);
  }
  if (loaderId === "flow-field" && overrides.particleCount !== undefined) {
    params.particleCount = Math.round(overrides.particleCount);
  }
  if (
    loaderId === "reaction-diffusion" &&
    overrides.perturbCount !== undefined
  ) {
    params.perturbCount = Math.round(overrides.perturbCount);
  }

  return params;
}
