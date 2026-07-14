// Vereinheitlichung von Quell-Formatierungen (fett/kursiv/farbig/highlight)
// auf die drei freshdoc-Stile. Auto-Heuristik + Overrides fürs Advanced-Panel.

import type { Doc, Inline, SourceFlags, TargetMark } from "./docModel";

/** "none" = Markierung bewusst fallen lassen (nur via Advanced-Panel). */
export type MappingTarget = TargetMark | "none";

/** Kategorie-Schlüssel → Zielstil. Schlüssel siehe flagKey(). */
export type Mapping = Record<string, MappingTarget>;

/**
 * Stabiler Schlüssel für eine Formatierungs-Kombination,
 * z. B. "bold", "italic", "bold+color:980000", "highlight:yellow".
 * null = unformatierter Text.
 */
export function flagKey(flags: SourceFlags): string | null {
  const parts: string[] = [];
  if (flags.bold) parts.push("bold");
  if (flags.italic) parts.push("italic");
  if (flags.color) parts.push(`color:${flags.color.toLowerCase()}`);
  if (flags.highlight) parts.push(`highlight:${flags.highlight}`);
  return parts.length ? parts.join("+") : null;
}

/** Auto-Heuristik: farbig/highlight → Akzent, fett → Betonung, kursiv → Begriff. */
export function defaultTarget(key: string): TargetMark {
  if (key.includes("color:") || key.includes("highlight:")) return "akzent";
  if (key.includes("bold")) return "betonung";
  return "begriff";
}

/** Alle im Dokument vorkommenden Kategorien mit Zeichen-Anzahl (für das Panel). */
export function detectCategories(doc: Doc): Map<string, number> {
  const counts = new Map<string, number>();
  const scan = (inlines: Inline[]) => {
    for (const inline of inlines) {
      if (inline.kind !== "run") continue;
      const key = flagKey(inline.run.flags);
      if (key) counts.set(key, (counts.get(key) ?? 0) + inline.run.text.length);
    }
  };
  for (const block of doc.blocks) {
    if (block.kind === "list") block.items.forEach((i) => scan(i.inlines));
    else if (block.kind === "figure") scan(block.caption);
    else scan(block.inlines);
  }
  Object.values(doc.footnotes).forEach(scan);
  return counts;
}

/** Auto-Mapping für alle erkannten Kategorien. */
export function buildMapping(keys: Iterable<string>): Mapping {
  const mapping: Mapping = {};
  for (const key of keys) mapping[key] = defaultTarget(key);
  return mapping;
}

/** Zielstil für einen konkreten Run unter gegebenem Mapping. */
export function targetFor(flags: SourceFlags, mapping: Mapping): TargetMark | null {
  const key = flagKey(flags);
  if (!key) return null;
  const target = mapping[key] ?? defaultTarget(key);
  return target === "none" ? null : target;
}

/** Menschenlesbares Label für einen Kategorie-Schlüssel (Advanced-Panel). */
export function keyLabel(key: string): string {
  return key
    .split("+")
    .map((part) => {
      if (part === "bold") return "fett";
      if (part === "italic") return "kursiv";
      if (part.startsWith("color:")) return `Farbe #${part.slice(6)}`;
      if (part.startsWith("highlight:")) return `Marker (${part.slice(10)})`;
      return part;
    })
    .join(" + ");
}
