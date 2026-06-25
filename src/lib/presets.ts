export interface PresetDefinition<P> {
  name: string;
  description: string;
  params: P;
}

export function resolveParams<P extends object>(
  defaults: P,
  presets: Record<string, PresetDefinition<P>>,
  preset?: string,
  overrides?: Partial<P>,
): P {
  const fromPreset =
    preset && presets[preset] ? presets[preset].params : undefined;
  return {
    ...defaults,
    ...fromPreset,
    ...overrides,
  };
}

export function presetNames<P>(
  presets: Record<string, PresetDefinition<P>>,
): string[] {
  return Object.keys(presets);
}
