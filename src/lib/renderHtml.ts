// Dokumentmodell → HTML-String für die paged.js-Vorschau.
// Fußnoten werden inline als <span class="footnote"> ausgegeben —
// paged.js floatet sie ans Seitenende (CSS: float: footnote).

import type { Block, Doc, Inline, ListItem } from "./docModel";
import { targetFor, type Mapping } from "./mapping";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderInlines(inlines: Inline[], doc: Doc, mapping: Mapping): string {
  let html = "";
  for (const inline of inlines) {
    if (inline.kind === "footnoteRef") {
      const content = doc.footnotes[inline.id];
      if (content) {
        html += `<span class="footnote">${renderInlines(content, doc, mapping)}</span>`;
      }
      continue;
    }
    const text = escapeHtml(inline.run.text);
    const target = targetFor(inline.run.flags, mapping);
    html += target ? `<span class="mark-${target}">${text}</span>` : text;
  }
  return html;
}

/**
 * Flache Liste mit Einrück-Klassen pro Ebene (bewusst nicht echt verschachtelt —
 * einfach und robust; echte Verschachtelung erst, wenn ein Dokument sie braucht).
 */
function renderList(ordered: boolean, items: ListItem[], doc: Doc, mapping: Mapping): string {
  const tag = ordered ? "ol" : "ul";
  const lis = items
    .map((item) => {
      const level = Math.max(0, Math.min(item.level, 5));
      const cls = level > 0 ? ` class="lvl-${level}"` : "";
      return `<li${cls}>${renderInlines(item.inlines, doc, mapping)}</li>`;
    })
    .join("");
  return `<${tag}>${lis}</${tag}>`;
}

/** Führende Word-Labels wie "Abbildung 3:" entfernen — freshdoc setzt eigene. */
function stripCaptionLabel(inlines: Inline[]): Inline[] {
  const result = inlines.map((i) =>
    i.kind === "run" ? { ...i, run: { ...i.run } } : i,
  );
  const firstRun = result.find((i) => i.kind === "run");
  if (firstRun && firstRun.kind === "run") {
    firstRun.run.text = firstRun.run.text.replace(/^\s*(Abbildung|Abb\.?|Figure)\s*\d*\s*[:.–-]?\s*/i, "");
  }
  return result;
}

function renderBlock(block: Block, doc: Doc, mapping: Mapping, figureNo: () => number): string {
  switch (block.kind) {
    case "title":
      return `<header class="doc-titleblock"><h1 class="doc-title">${renderInlines(block.inlines, doc, mapping)}</h1></header>`;
    case "subtitle":
      return `<p class="doc-subtitle">${renderInlines(block.inlines, doc, mapping)}</p>`;
    case "heading": {
      const tag = ["h2", "h3", "h4"][block.level - 1];
      return `<${tag}>${renderInlines(block.inlines, doc, mapping)}</${tag}>`;
    }
    case "paragraph":
      return `<p>${renderInlines(block.inlines, doc, mapping)}</p>`;
    case "list":
      return renderList(block.ordered, block.items, doc, mapping);
    case "figure": {
      const n = figureNo();
      const caption = block.caption.length
        ? `<figcaption><span class="figlabel">Abb. ${n}</span>${renderInlines(stripCaptionLabel(block.caption), doc, mapping)}</figcaption>`
        : "";
      return `<figure><img src="${block.src}" alt="Abbildung ${n}" />${caption}</figure>`;
    }
  }
}

export function renderHtml(doc: Doc, mapping: Mapping): string {
  let figureCount = 0;
  const figureNo = () => ++figureCount;
  const body = doc.blocks.map((b) => renderBlock(b, doc, mapping, figureNo)).join("\n");
  return `<article class="doc">${body}</article>`;
}
