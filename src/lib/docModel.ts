// Internes Dokumentmodell: Zwischenformat zwischen Parser (DOCX, später ODT)
// und Renderer. Bewusst klein gehalten — nur was freshdoc stylen kann.

/** Ziel-Stile für Markierungen im Text (vereinheitlicht aus fett/kursiv/farbig). */
export type TargetMark = "betonung" | "begriff" | "akzent";

/** Formatierung eines Runs im Quelldokument, vor dem Mapping. */
export interface SourceFlags {
  bold: boolean;
  italic: boolean;
  /** Hex ohne "#", nur gesetzt wenn keine Auto-/Schwarz-Farbe. */
  color?: string;
  /** Word-Highlight-Farbname (yellow, cyan, ...). */
  highlight?: string;
}

export interface Run {
  text: string;
  flags: SourceFlags;
}

export type Inline =
  | { kind: "run"; run: Run }
  | { kind: "footnoteRef"; id: string };

export interface ListItem {
  inlines: Inline[];
  /** Verschachtelungstiefe, 0 = oberste Ebene. */
  level: number;
}

export type Block =
  | { kind: "title"; inlines: Inline[] }
  | { kind: "subtitle"; inlines: Inline[] }
  | { kind: "heading"; level: 1 | 2 | 3; inlines: Inline[] }
  | { kind: "paragraph"; inlines: Inline[] }
  | { kind: "list"; ordered: boolean; items: ListItem[] }
  | { kind: "figure"; src: string; caption: Inline[] };

export interface Doc {
  blocks: Block[];
  /** Fußnoten-Id → Inhalt (Absätze zu Inlines abgeflacht). */
  footnotes: Record<string, Inline[]>;
}

export function plainFlags(): SourceFlags {
  return { bold: false, italic: false };
}

/** Text eines Inline-Arrays ohne Formatierung (für Tests und Heuristiken). */
export function inlineText(inlines: Inline[]): string {
  return inlines.map((i) => (i.kind === "run" ? i.run.text : "")).join("");
}
