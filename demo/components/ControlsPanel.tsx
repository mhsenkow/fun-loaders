import { useMemo } from "react";
import { LOADERS, type LoaderId } from "../../src";
import {
  LOADER_CONTROL_SCHEMAS,
  buildLoaderParams,
  getFieldBaseValue,
} from "../paramSchemas";
import { SnapSlider } from "./SnapSlider";

interface ControlsPanelProps {
  loaderId: LoaderId;
  preset: string;
  overrides: Record<string, number>;
  onOverridesChange: (next: Record<string, number>) => void;
}

export function ControlsPanel({
  loaderId,
  preset,
  overrides,
  onOverridesChange,
}: ControlsPanelProps) {
  const loader = LOADERS.find((l) => l.id === loaderId)!;
  const schema = LOADER_CONTROL_SCHEMAS[loaderId];
  const presetParams = loader.presets[preset]?.params ?? {};

  const values = useMemo(() => {
    const out: Record<string, number> = {};
    for (const field of schema.fields) {
      out[field.key] =
        overrides[field.key] ??
        getFieldBaseValue(
          loaderId,
          presetParams as unknown as Record<string, unknown>,
          field.key,
        );
    }
    return out;
  }, [schema.fields, overrides, loaderId, presetParams]);

  return (
    <aside className="settings-panel">
      <header className="settings-panel__head">
        <p className="settings-panel__title">Settings</p>
        {Object.keys(overrides).length > 0 && (
          <button
            type="button"
            className="settings-panel__reset"
            onClick={() => onOverridesChange({})}
          >
            Reset
          </button>
        )}
      </header>

      <div className="settings-panel__lines">
        {schema.fields.map((field) => (
          <SnapSlider
            key={field.key}
            schema={field}
            value={values[field.key]}
            onChange={(v) =>
              onOverridesChange({ ...overrides, [field.key]: v })
            }
          />
        ))}
      </div>
    </aside>
  );
}
