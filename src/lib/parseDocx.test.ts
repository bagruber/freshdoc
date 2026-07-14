// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { inlineText } from "./docModel";
import { detectCategories } from "./mapping";
import { parseDocx } from "./parseDocx";

// Reales Referenzdokument: Title, Heading 1–3, Fußnoten, Listen, Farbe 980000
const EXAMPLE = resolve(process.cwd(), "example/GeschO_Aenderungsantraege.docx");

function loadExample(): ArrayBuffer {
  // Kopie in einen ArrayBuffer der Test-Realm — Node-Buffer.buffer stammt aus
  // einer anderen Realm, dessen instanceof-Check schlägt in jsdom/JSZip fehl.
  const buf = readFileSync(EXAMPLE);
  const ab = new ArrayBuffer(buf.byteLength);
  new Uint8Array(ab).set(buf);
  return ab;
}

describe("parseDocx (Beispieldokument)", () => {
  it("erkennt Titel, Überschriften, Listen und Fußnoten", async () => {
    const doc = await parseDocx(loadExample());

    const kinds = doc.blocks.map((b) => b.kind);
    expect(kinds).toContain("title");
    expect(kinds).toContain("heading");
    expect(kinds).toContain("list");

    const title = doc.blocks.find((b) => b.kind === "title");
    expect(title && inlineText(title.inlines).length).toBeGreaterThan(0);

    // Alle Fußnoten-Referenzen müssen aufgelöst werden können
    const refIds: string[] = [];
    for (const block of doc.blocks) {
      if (block.kind === "list" || block.kind === "figure") continue;
      for (const inline of block.inlines) {
        if (inline.kind === "footnoteRef") refIds.push(inline.id);
      }
    }
    expect(refIds.length).toBe(6);
    for (const id of refIds) {
      expect(doc.footnotes[id], `Fußnote ${id} fehlt`).toBeDefined();
      expect(inlineText(doc.footnotes[id]).length).toBeGreaterThan(0);
    }
  });

  it("erkennt die farbige Markierung als Kategorie", async () => {
    const doc = await parseDocx(loadExample());
    const categories = detectCategories(doc);
    expect([...categories.keys()].some((k) => k.includes("color:980000"))).toBe(true);
  });

  it("wirft bei Nicht-DOCX-Daten einen verständlichen Fehler", async () => {
    await expect(parseDocx(new ArrayBuffer(8))).rejects.toThrow();
  });
});
