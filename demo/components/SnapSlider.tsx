import { useCallback, useEffect, useId, useState } from "react";
import type { ParamFieldSchema } from "../controls/types";
import {
  applySnapFriction,
  clamp,
  roundToStep,
  snapOnRelease,
} from "../controls/snapMath";

interface SnapSliderProps {
  schema: ParamFieldSchema;
  value: number;
  onChange: (value: number) => void;
}

function formatValue(value: number, decimals = 2): string {
  if (Number.isInteger(value) && decimals === 0) return String(value);
  const d = decimals ?? (Math.abs(value) < 0.1 ? 4 : 2);
  return value.toFixed(d).replace(/\.?0+$/, "");
}

export function SnapSlider({ schema, value, onChange }: SnapSliderProps) {
  const id = useId();
  const [dragging, setDragging] = useState(false);
  const [focused, setFocused] = useState(false);
  const [inputText, setInputText] = useState(() =>
    formatValue(value, schema.decimals),
  );

  useEffect(() => {
    if (!focused) setInputText(formatValue(value, schema.decimals));
  }, [value, focused, schema.decimals]);

  const emit = useCallback(
    (raw: number, snap: boolean) => {
      let v = clamp(raw, schema.min, schema.max);
      v = roundToStep(v, schema.step);
      if (dragging && !snap) {
        v = applySnapFriction(
          v,
          schema.snapPoints,
          schema.min,
          schema.max,
          schema.friction ?? 0.42,
        );
        v = roundToStep(v, schema.step);
      }
      if (snap) {
        v = snapOnRelease(v, schema.snapPoints, schema.min, schema.max);
        v = roundToStep(v, schema.step);
      }
      onChange(v);
      if (!focused) setInputText(formatValue(v, schema.decimals));
    },
    [schema, onChange, dragging, focused],
  );

  const pct = ((value - schema.min) / (schema.max - schema.min)) * 100;
  const active = dragging || focused;

  return (
    <div className={`setting-line${active ? " is-lit" : ""}`}>
      <div className="setting-line__meta">
        <label htmlFor={id} className="setting-line__label">
          {schema.label}
        </label>
        <input
          type="text"
          inputMode="decimal"
          className="setting-line__value"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            const parsed = Number.parseFloat(inputText);
            if (Number.isFinite(parsed)) emit(parsed, true);
            else setInputText(formatValue(value, schema.decimals));
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          aria-label={`${schema.label} value`}
        />
      </div>

      <div className="setting-line__gulley">
        <div className="setting-line__groove">
          {schema.snapPoints.map((snap) => {
            const snapPct =
              ((snap - schema.min) / (schema.max - schema.min)) * 100;
            return (
              <button
                key={snap}
                type="button"
                className="setting-line__tick"
                style={{ left: `${snapPct}%` }}
                title={formatValue(snap, schema.decimals)}
                onClick={() => emit(snap, true)}
                aria-label={`Snap to ${formatValue(snap, schema.decimals)}`}
              />
            );
          })}
          <div className="setting-line__beam" style={{ width: `${pct}%` }} />
        </div>
        <input
          id={id}
          type="range"
          className="setting-line__range"
          min={schema.min}
          max={schema.max}
          step={schema.step}
          value={value}
          onPointerDown={() => setDragging(true)}
          onPointerUp={(e) => {
            setDragging(false);
            emit(Number((e.target as HTMLInputElement).value), true);
          }}
          onChange={(e) => emit(Number(e.target.value), false)}
        />
      </div>
    </div>
  );
}
