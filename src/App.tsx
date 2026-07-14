import { useMemo, useState } from "react";
import type { Doc } from "./lib/docModel";
import { buildMapping, detectCategories, type Mapping, type MappingTarget } from "./lib/mapping";
import { parseDocx } from "./lib/parseDocx";
import { UploadScreen } from "./components/UploadScreen";
import { PreviewPane } from "./components/PreviewPane";
import { AdvancedPanel } from "./components/AdvancedPanel";

export default function App() {
  const [doc, setDoc] = useState<Doc | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Mapping>({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  const categories = useMemo(() => (doc ? detectCategories(doc) : new Map<string, number>()), [doc]);
  const mapping = useMemo<Mapping>(
    () => ({ ...buildMapping(categories.keys()), ...overrides }),
    [categories, overrides],
  );

  const handleFile = async (file: File) => {
    setError(null);
    if (!file.name.toLowerCase().endsWith(".docx")) {
      setError("Bitte eine .docx-Datei auswählen (ODT folgt später).");
      return;
    }
    try {
      const parsed = await parseDocx(await file.arrayBuffer());
      setDoc(parsed);
      setFileName(file.name);
      setOverrides({});
      setShowAdvanced(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Datei konnte nicht gelesen werden.");
    }
  };

  if (!doc) return <UploadScreen onFile={handleFile} error={error} />;

  return (
    <>
      <header className="toolbar">
        <span className="brand">
          freshdoc<span className="brand-dot">.</span>
        </span>
        <span className="filename">{fileName}</span>
        <button onClick={() => setDoc(null)}>Neues Dokument</button>
        <button
          title="Erweitert: Markierungen zuordnen"
          aria-label="Erweiterte Einstellungen"
          onClick={() => setShowAdvanced((v) => !v)}
        >
          ⋯
        </button>
        <button className="primary" onClick={() => window.print()}>
          PDF erzeugen
        </button>
      </header>
      {showAdvanced && (
        <AdvancedPanel
          categories={categories}
          mapping={mapping}
          onChange={(key: string, target: MappingTarget) =>
            setOverrides((prev) => ({ ...prev, [key]: target }))
          }
        />
      )}
      <PreviewPane doc={doc} mapping={mapping} />
    </>
  );
}
