import { useRef, useState, type DragEvent } from "react";

interface Props {
  onFile: (file: File) => void;
  error: string | null;
}

export function UploadScreen({ onFile, error }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragover, setDragover] = useState(false);

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragover(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  };

  return (
    <div className="upload-screen">
      <div className="wordmark">
        freshdoc<span className="brand-dot">.</span>
      </div>
      <div
        className={`dropzone${dragover ? " dragover" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragover(true);
        }}
        onDragLeave={() => setDragover(false)}
        onDrop={handleDrop}
      >
        <p>
          <strong>Word-Dokument hierher ziehen</strong> oder klicken zum Auswählen
        </p>
        <p className="hint">
          .docx — Überschriften, Markierungen, Fußnoten, Listen und Abbildungen werden
          automatisch ins fresh-Design gebracht. Danach als PDF exportieren.
        </p>
      </div>
      {error && <p className="upload-error">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept=".docx"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
