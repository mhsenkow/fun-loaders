import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { LOADERS, type LoaderId, type LoaderShape } from "../src";
import { ControlsPanel } from "./components/ControlsPanel";
import { PathwayNav } from "./components/PathwayNav";
import { buildLoaderParams } from "./paramSchemas";
import "./styles.css";

function App() {
  const [active, setActive] = useState<LoaderId>(LOADERS[0].id);
  const [shape, setShape] = useState<LoaderShape>("circle");
  const current = LOADERS.find((l) => l.id === active) ?? LOADERS[0];
  const presetKeys = Object.keys(current.presets);
  const [preset, setPreset] = useState<string>(current.defaultPreset);
  const [overrides, setOverrides] = useState<Record<string, number>>({});

  useEffect(() => {
    setPreset(current.defaultPreset);
    setOverrides({});
  }, [active, current.defaultPreset]);

  const resolvedPreset = current.presets[preset]
    ? preset
    : current.defaultPreset;
  const presetMeta =
    current.presets[resolvedPreset] ??
    current.presets[current.defaultPreset];
  const presetParams = presetMeta?.params ?? {};

  const selectPreset = (key: string) => {
    setPreset(key);
    setOverrides({});
  };

  const { Component } = current;

  const loaderParams = useMemo(
    () =>
      buildLoaderParams(
        active,
        presetParams as unknown as Record<string, unknown>,
        overrides,
      ),
    [active, presetParams, overrides],
  );

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">fun-loaders</h1>
        <p className="app-subtitle">
          Center-screen loaders — transparent ink on dark UI. Toggle circle or square.
        </p>
      </header>

      <div className="app-grid">
        <PathwayNav active={active} onSelect={setActive} />

        <main className="stage gulley gulley--stage">
          <div className="gulley__rim" aria-hidden />

          <div className="shape-toggle" role="group" aria-label="Mark shape">
            <span className="gulley__label gulley__label--inline">Mark</span>
            <div className="shape-toggle__track">
              <button
                type="button"
                className={`shape-chip${shape === "circle" ? " is-active" : ""}`}
                onClick={() => setShape("circle")}
              >
                <span className="shape-chip__icon shape-chip__icon--circle" />
                Circle
              </button>
              <button
                type="button"
                className={`shape-chip${shape === "square" ? " is-active" : ""}`}
                onClick={() => setShape("square")}
              >
                <span className="shape-chip__icon shape-chip__icon--square" />
                Square
              </button>
            </div>
          </div>

          <div className="preset-gulley">
            <p className="gulley__label gulley__label--inline">Presets</p>
            <div className="preset-track">
              {presetKeys.map((key) => {
                const meta = current.presets[key];
                return (
                  <button
                    key={key}
                    type="button"
                    className={`preset-chip${resolvedPreset === key ? " is-active" : ""}`}
                    onClick={() => selectPreset(key)}
                    title={meta.description}
                  >
                    <span className="preset-chip__line" aria-hidden />
                    {meta.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="preview-well">
            <Component
              key={`${active}-${shape}`}
              size={240}
              shape={shape}
              preset={resolvedPreset}
              params={{ ...loaderParams, shape }}
              label={presetMeta?.description ?? current.description}
            />
          </div>
        </main>

        <ControlsPanel
          loaderId={active}
          preset={resolvedPreset}
          overrides={overrides}
          onOverridesChange={setOverrides}
        />
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
