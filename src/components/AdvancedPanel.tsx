import type { Mapping, MappingTarget } from "../lib/mapping";
import { keyLabel } from "../lib/mapping";

interface Props {
  categories: Map<string, number>;
  mapping: Mapping;
  onChange: (key: string, target: MappingTarget) => void;
}

const TARGET_LABELS: Record<MappingTarget, string> = {
  betonung: "Betonung (fett)",
  begriff: "Begriff (kursiv)",
  akzent: "Akzent (Rose)",
  none: "keine Markierung",
};

/** Verstecktes Mapping-UI: Quell-Formatierungen manuell den Zielstilen zuordnen. */
export function AdvancedPanel({ categories, mapping, onChange }: Props) {
  return (
    <aside className="advanced-panel">
      <h2>Markierungen zuordnen</h2>
      <p className="panel-hint">
        Formatierungen aus dem Quelldokument und ihr Zielstil im fresh-Design.
      </p>
      {categories.size === 0 && (
        <p className="panel-hint">Keine Markierungen im Dokument gefunden.</p>
      )}
      {[...categories.entries()].map(([key, count]) => (
        <div className="mapping-row" key={key}>
          <span className="cat">
            {keyLabel(key)} <span className="count">({count} Zeichen)</span>
          </span>
          <select
            value={mapping[key]}
            onChange={(e) => onChange(key, e.target.value as MappingTarget)}
          >
            {Object.entries(TARGET_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      ))}
    </aside>
  );
}
