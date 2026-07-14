import { useEffect, useRef, useState } from "react";
import { Previewer } from "pagedjs";
import type { Doc } from "../lib/docModel";
import type { Mapping } from "../lib/mapping";
import { renderHtml } from "../lib/renderHtml";
// Als String importieren und als Blob-URL übergeben: paged.js muss das CSS
// selbst fetchen und parsen — ein ?url-Import liefert im Vite-Dev-Modus ein
// JS-Modul statt CSS.
import documentCss from "../styles/document.css?raw";

const documentCssUrl = URL.createObjectURL(new Blob([documentCss], { type: "text/css" }));

interface Props {
  doc: Doc;
  mapping: Mapping;
}

/** Paginierte Vorschau via paged.js — die Seiten sind zugleich die Druckvorlage. */
export function PreviewPane({ doc, mapping }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rendering, setRendering] = useState(true);
  // Serialisiert Re-Renders: paged.js verträgt keine parallelen preview()-Läufe.
  const jobRef = useRef<Promise<unknown>>(Promise.resolve());

  useEffect(() => {
    let cancelled = false;
    const html = renderHtml(doc, mapping);

    jobRef.current = jobRef.current.then(async () => {
      if (cancelled || !containerRef.current) return;
      setRendering(true);
      // Von früheren Läufen injizierte paged.js-Styles entfernen (sonst doppeln sie sich)
      document.head
        .querySelectorAll("style[data-pagedjs-inserted-styles]")
        .forEach((s) => s.remove());
      containerRef.current.innerHTML = "";
      try {
        await new Previewer().preview(html, [documentCssUrl], containerRef.current);
      } finally {
        if (!cancelled) setRendering(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [doc, mapping]);

  return (
    <div className="preview-wrap">
      {rendering && <div className="preview-status">Seiten werden gesetzt …</div>}
      <div ref={containerRef} />
    </div>
  );
}
