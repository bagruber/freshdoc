import { describe, expect, it } from "vitest";
import type { Doc, Inline } from "./docModel";
import { plainFlags } from "./docModel";
import { buildMapping } from "./mapping";
import { renderHtml } from "./renderHtml";

const run = (text: string, flags = plainFlags()): Inline => ({ kind: "run", run: { text, flags } });

describe("renderHtml", () => {
  it("rendert Titel, Überschriften und Markierungen", () => {
    const doc: Doc = {
      blocks: [
        { kind: "title", inlines: [run("Geschäftsordnung")] },
        { kind: "heading", level: 1, inlines: [run("Anträge")] },
        {
          kind: "paragraph",
          inlines: [
            run("Frist: "),
            run("31. März", { bold: false, italic: false, color: "980000" }),
          ],
        },
      ],
      footnotes: {},
    };
    const html = renderHtml(doc, buildMapping(["color:980000"]));
    expect(html).toContain('<h1 class="doc-title">Geschäftsordnung</h1>');
    expect(html).toContain("<h2>Anträge</h2>");
    expect(html).toContain('<span class="mark-akzent">31. März</span>');
  });

  it("gibt Fußnoten inline als float-footnote-Spans aus", () => {
    const doc: Doc = {
      blocks: [{ kind: "paragraph", inlines: [run("Text"), { kind: "footnoteRef", id: "2" }] }],
      footnotes: { "2": [run("Quelle: Satzung §7")] },
    };
    const html = renderHtml(doc, {});
    expect(html).toContain('Text<span class="footnote">Quelle: Satzung §7</span>');
  });

  it("rendert Listen flach mit Einrück-Klassen", () => {
    const doc: Doc = {
      blocks: [
        {
          kind: "list",
          ordered: false,
          items: [
            { inlines: [run("eins")], level: 0 },
            { inlines: [run("eins-a")], level: 1 },
          ],
        },
      ],
      footnotes: {},
    };
    const html = renderHtml(doc, {});
    expect(html).toContain("<ul><li>eins</li><li class=\"lvl-1\">eins-a</li></ul>");
  });

  it("escaped HTML im Text und entfernt Word-Beschriftungslabels", () => {
    const doc: Doc = {
      blocks: [
        { kind: "paragraph", inlines: [run("a < b & c")] },
        { kind: "figure", src: "data:image/png;base64,x", caption: [run("Abbildung 1: Der Fuchs")] },
      ],
      footnotes: {},
    };
    const html = renderHtml(doc, {});
    expect(html).toContain("a &lt; b &amp; c");
    expect(html).toContain('<span class="figlabel">Abb. 1</span>Der Fuchs');
  });
});
