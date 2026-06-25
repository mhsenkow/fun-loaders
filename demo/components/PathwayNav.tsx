import type { LoaderId } from "../../src";
import { LOADERS } from "../../src";

interface PathwayNavProps {
  active: LoaderId;
  onSelect: (id: LoaderId) => void;
}

export function PathwayNav({ active, onSelect }: PathwayNavProps) {
  return (
    <nav className="gulley gulley--pathways" aria-label="Loader pathways">
      <div className="gulley__rim" aria-hidden />
      <p className="gulley__label">Pathways</p>
      <ul className="pathway-list">
        {LOADERS.map((loader) => {
          const isActive = loader.id === active;
          return (
            <li key={loader.id}>
              <button
                type="button"
                className={`pathway-item${isActive ? " is-active" : ""}`}
                onClick={() => onSelect(loader.id)}
              >
                <span className="pathway-item__groove" aria-hidden />
                <span className="pathway-item__text">
                  <span className="pathway-item__name">{loader.name}</span>
                  <span className="pathway-item__desc">{loader.description}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
