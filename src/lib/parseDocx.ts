// DOCX → internes Dokumentmodell. Liest word/document.xml plus footnotes,
// numbering und Bilder. Bewusst nur direkte Run-Formatierung (kein Auflösen
// von Zeichen-Formatvorlagen) — reicht für typische Dokumente.

import JSZip from "jszip";
import type { Block, Doc, Inline, ListItem, SourceFlags } from "./docModel";

const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const A = "http://schemas.openxmlformats.org/drawingml/2006/main";
const R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

const MIME_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
};

function parseXml(text: string): Document {
  return new DOMParser().parseFromString(text, "application/xml");
}

function first(el: Element | Document, name: string): Element | null {
  return el.getElementsByTagNameNS(W, name)[0] ?? null;
}

function wVal(el: Element | null): string | null {
  return el?.getAttributeNS(W, "val") ?? null;
}

/** Toggle-Properties wie <w:b/> sind true, außer w:val sagt explizit nein. */
function boolProp(rPr: Element | null, name: string): boolean {
  if (!rPr) return false;
  const el = rPr.getElementsByTagNameNS(W, name)[0];
  if (!el) return false;
  const val = wVal(el);
  return val === null || !["0", "false", "none"].includes(val);
}

function runFlags(run: Element): SourceFlags {
  const rPr = first(run, "rPr");
  const flags: SourceFlags = { bold: boolProp(rPr, "b"), italic: boolProp(rPr, "i") };
  const color = wVal(rPr ? first(rPr, "color") : null);
  if (color && color !== "auto" && color.toLowerCase() !== "000000") {
    flags.color = color.toLowerCase();
  }
  const highlight = wVal(rPr ? first(rPr, "highlight") : null);
  if (highlight && highlight !== "none") flags.highlight = highlight;
  return flags;
}

/** Formatvorlagen-Id normalisieren: "Heading1", "berschrift2", "Titel", ... */
function normalizeStyle(
  styleId: string | null,
): { kind: "title" | "subtitle" | "caption" } | { kind: "heading"; level: 1 | 2 | 3 } | null {
  if (!styleId) return null;
  const id = styleId.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (id === "title" || id === "titel") return { kind: "title" };
  if (id === "subtitle" || id === "untertitel") return { kind: "subtitle" };
  if (id === "caption" || id === "beschriftung") return { kind: "caption" };
  const m = id.match(/^(?:heading|berschrift|ueberschrift)([1-9])$/);
  if (m) {
    const level = Math.min(3, Number(m[1])) as 1 | 2 | 3;
    return { kind: "heading", level };
  }
  return null;
}

interface ParseContext {
  /** rel-Id → Data-URL des Bilds. */
  images: Map<string, string>;
  /** numId → ordered? */
  numFormats: Map<string, boolean>;
}

/** Inlines und Bild-Quellen eines Absatzes einsammeln. */
function parseParagraphContent(
  p: Element,
  ctx: ParseContext,
): { inlines: Inline[]; imageSrcs: string[] } {
  const inlines: Inline[] = [];
  const imageSrcs: string[] = [];
  const runs = p.getElementsByTagNameNS(W, "r");
  for (const run of Array.from(runs)) {
    // Runs innerhalb von w:drawing (Textboxen) überspringen
    if (run.parentElement?.namespaceURI === W && run.parentElement.localName === "p" && run.parentElement !== p) {
      continue;
    }
    const flags = runFlags(run);
    let text = "";
    for (const child of Array.from(run.children)) {
      if (child.namespaceURI !== W && child.localName !== "drawing") continue;
      switch (child.localName) {
        case "t":
          text += child.textContent ?? "";
          break;
        case "tab":
          text += " ";
          break;
        case "br":
          text += " ";
          break;
        case "footnoteReference": {
          if (text) {
            inlines.push({ kind: "run", run: { text, flags } });
            text = "";
          }
          const id = child.getAttributeNS(W, "id");
          if (id) inlines.push({ kind: "footnoteRef", id });
          break;
        }
        case "drawing": {
          const blip = child.getElementsByTagNameNS(A, "blip")[0];
          const relId = blip?.getAttributeNS(R, "embed");
          const src = relId ? ctx.images.get(relId) : undefined;
          if (src) imageSrcs.push(src);
          break;
        }
      }
    }
    if (text) inlines.push({ kind: "run", run: { text, flags } });
  }
  return { inlines, imageSrcs };
}

function parseNumbering(xml: Document): Map<string, boolean> {
  const abstractOrdered = new Map<string, boolean>();
  for (const abs of Array.from(xml.getElementsByTagNameNS(W, "abstractNum"))) {
    const id = abs.getAttributeNS(W, "abstractNumId");
    const lvl0 = Array.from(abs.getElementsByTagNameNS(W, "lvl")).find(
      (l) => l.getAttributeNS(W, "ilvl") === "0",
    );
    const fmt = wVal(lvl0 ? first(lvl0, "numFmt") : null);
    if (id) abstractOrdered.set(id, fmt !== "bullet");
  }
  const numFormats = new Map<string, boolean>();
  for (const num of Array.from(xml.getElementsByTagNameNS(W, "num"))) {
    const numId = num.getAttributeNS(W, "numId");
    const absId = wVal(first(num, "abstractNumId"));
    if (numId && absId !== null) numFormats.set(numId, abstractOrdered.get(absId) ?? true);
  }
  return numFormats;
}

function parseFootnotes(xml: Document, ctx: ParseContext): Record<string, Inline[]> {
  const footnotes: Record<string, Inline[]> = {};
  for (const fn of Array.from(xml.getElementsByTagNameNS(W, "footnote"))) {
    const type = fn.getAttributeNS(W, "type");
    if (type === "separator" || type === "continuationSeparator") continue;
    const id = fn.getAttributeNS(W, "id");
    if (!id) continue;
    const inlines: Inline[] = [];
    for (const p of Array.from(fn.getElementsByTagNameNS(W, "p"))) {
      const { inlines: pInlines } = parseParagraphContent(p, ctx);
      if (inlines.length && pInlines.length) {
        inlines.push({ kind: "run", run: { text: " ", flags: { bold: false, italic: false } } });
      }
      inlines.push(...pInlines);
    }
    footnotes[id] = inlines;
  }
  return footnotes;
}

async function loadImages(zip: JSZip): Promise<Map<string, string>> {
  const images = new Map<string, string>();
  const relsFile = zip.file("word/_rels/document.xml.rels");
  if (!relsFile) return images;
  const rels = parseXml(await relsFile.async("text"));
  for (const rel of Array.from(rels.getElementsByTagName("Relationship"))) {
    const target = rel.getAttribute("Target") ?? "";
    if (!/\bmedia\//.test(target)) continue;
    const ext = target.split(".").pop()?.toLowerCase() ?? "";
    const mime = MIME_BY_EXT[ext];
    if (!mime) continue;
    const path = target.startsWith("/") ? target.slice(1) : `word/${target}`;
    const file = zip.file(path);
    if (!file) continue;
    const b64 = await file.async("base64");
    const id = rel.getAttribute("Id");
    if (id) images.set(id, `data:${mime};base64,${b64}`);
  }
  return images;
}

export async function parseDocx(data: ArrayBuffer): Promise<Doc> {
  const zip = await JSZip.loadAsync(data);
  const docFile = zip.file("word/document.xml");
  if (!docFile) throw new Error("Keine gültige DOCX-Datei (word/document.xml fehlt).");
  const docXml = parseXml(await docFile.async("text"));

  const ctx: ParseContext = { images: await loadImages(zip), numFormats: new Map() };
  const numberingFile = zip.file("word/numbering.xml");
  if (numberingFile) ctx.numFormats = parseNumbering(parseXml(await numberingFile.async("text")));

  let footnotes: Record<string, Inline[]> = {};
  const footnotesFile = zip.file("word/footnotes.xml");
  if (footnotesFile) footnotes = parseFootnotes(parseXml(await footnotesFile.async("text")), ctx);

  const body = first(docXml, "body");
  if (!body) throw new Error("DOCX ohne Dokument-Body.");

  const blocks: Block[] = [];
  const hasText = (inlines: Inline[]) =>
    inlines.some((i) => i.kind === "footnoteRef" || i.run.text.trim() !== "");

  for (const child of Array.from(body.children)) {
    if (child.namespaceURI !== W || child.localName !== "p") continue; // Tabellen etc.: V1 überspringt sie
    const pPr = first(child, "pPr");
    const style = normalizeStyle(wVal(pPr ? first(pPr, "pStyle") : null));
    const numPr = pPr ? first(pPr, "numPr") : null;
    const { inlines, imageSrcs } = parseParagraphContent(child, ctx);

    // Bilder werden eigene Figure-Blöcke; eine folgende Beschriftung docken wir an.
    for (const src of imageSrcs) blocks.push({ kind: "figure", src, caption: [] });

    if (!hasText(inlines)) continue;

    if (style?.kind === "caption") {
      const last = blocks[blocks.length - 1];
      if (last?.kind === "figure" && last.caption.length === 0) {
        last.caption = inlines;
        continue;
      }
      blocks.push({ kind: "paragraph", inlines });
      continue;
    }
    if (style?.kind === "title") {
      blocks.push({ kind: "title", inlines });
      continue;
    }
    if (style?.kind === "subtitle") {
      blocks.push({ kind: "subtitle", inlines });
      continue;
    }
    if (style?.kind === "heading") {
      blocks.push({ kind: "heading", level: style.level, inlines });
      continue;
    }
    if (numPr) {
      const numId = wVal(first(numPr, "numId"));
      const ilvl = Number(wVal(first(numPr, "ilvl")) ?? "0");
      const ordered = numId ? (ctx.numFormats.get(numId) ?? true) : true;
      const item: ListItem = { inlines, level: Number.isFinite(ilvl) ? ilvl : 0 };
      const last = blocks[blocks.length - 1];
      if (last?.kind === "list" && last.ordered === ordered) last.items.push(item);
      else blocks.push({ kind: "list", ordered, items: [item] });
      continue;
    }
    blocks.push({ kind: "paragraph", inlines });
  }

  return { blocks, footnotes };
}
