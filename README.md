# fun-loaders

A library of complex, canvas-based React loading animations.

Inspired by fractals, reaction-diffusion, strange attractors, space-filling curves, and more.

## Loaders

| Loader | Description |
|--------|-------------|
| **MengerLoader** | Isometric Menger sponge (from trashcanAI) |
| **ReactionDiffusionLoader** | Gray-Scott coral / labyrinth growth |
| **HilbertLoader** | Space-filling curve with glowing tracer |
| **AttractorLoader** | Clifford strange attractor particles |
| **SpirographLoader** | Hypotrochoid gear traces |
| **VoronoiLoader** | Pulsing Voronoi tessellation |
| **FlowFieldLoader** | Particles in a noise vector field |
| **LSystemLoader** | Branching L-system plant growth |
| **MazeLoader** | Pulse traveling a recursive maze |
| **TorusKnotLoader** | Rotating 3D torus knot wireframe |

## Usage

```tsx
import { MengerLoader, ReactionDiffusionLoader, LOADERS } from "fun-loaders";

// Named preset
<MengerLoader preset="sunset" label="Building mesh…" size={220} />

// Labyrinth-style reaction-diffusion (matches organic maze imagery)
<ReactionDiffusionLoader preset="labyrinth" label="Growing…" />

// Custom params override
<MengerLoader
  preset="rainbow"
  params={{ cycleDuration: 5000, waveWidth: 0.15 }}
/>
```

Or pick from the registry:

```tsx
const loader = LOADERS.find(l => l.id === "menger")!;
const { Component } = loader;
<Component preset="matrix" label="Loading…" />
```

## Presets

Every loader exports a `*_PRESETS` map and accepts `preset` + optional `params` overrides:

| Loader | Presets |
|--------|---------|
| MengerLoader | rainbow, sunset, matrix, ice, candy |
| ReactionDiffusionLoader | coral, labyrinth, mitosis, ink, neon |
| HilbertLoader | tracer, ghost, neon, minimal, fire |
| AttractorLoader | swarm, galaxy, ember, ice, binary |
| SpirographLoader | classic, tight, wild, rose, hypno |
| VoronoiLoader | stained-glass, bubble, neon-grid, muted, disco |
| FlowFieldLoader | aurora, smoke, embers, ocean, static |
| LSystemLoader | fern, bush, alien, winter, neon-vine |
| MazeLoader | classic, neon, blueprint, ink, retro |
| TorusKnotLoader | trefoil, cinquifoil, wild, wire, prism |

## Props

All loaders accept:

- `size` — canvas size in CSS pixels (default `220`)
- `label` — optional caption below the canvas
- `className` — wrapper class name
- `preset` — named style preset (see above)
- `params` — partial override of preset/default parameters

Each loader loops on `cycleDuration` (ms). Reaction-diffusion runs continuously — `cycleDuration` only drives a subtle visual breathe; growth sparks keep the pattern alive forever.
