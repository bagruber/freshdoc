import { describe, expect, it } from "vitest";
import { buildMapping, defaultTarget, flagKey, keyLabel, targetFor } from "./mapping";
import { plainFlags } from "./docModel";

describe("flagKey", () => {
  it("liefert null für unformatierten Text", () => {
    expect(flagKey(plainFlags())).toBeNull();
  });

  it("baut stabile Schlüssel aus Kombinationen", () => {
    expect(flagKey({ bold: true, italic: false })).toBe("bold");
    expect(flagKey({ bold: false, italic: true })).toBe("italic");
    expect(flagKey({ bold: true, italic: true })).toBe("bold+italic");
    expect(flagKey({ bold: true, italic: false, color: "980000" })).toBe("bold+color:980000");
    expect(flagKey({ bold: false, italic: false, highlight: "yellow" })).toBe("highlight:yellow");
  });
});

describe("defaultTarget (Auto-Heuristik)", () => {
  it("farbig/highlight → akzent, auch kombiniert mit fett", () => {
    expect(defaultTarget("color:980000")).toBe("akzent");
    expect(defaultTarget("bold+color:980000")).toBe("akzent");
    expect(defaultTarget("highlight:yellow")).toBe("akzent");
  });

  it("fett → betonung (auch fett+kursiv)", () => {
    expect(defaultTarget("bold")).toBe("betonung");
    expect(defaultTarget("bold+italic")).toBe("betonung");
  });

  it("kursiv → begriff", () => {
    expect(defaultTarget("italic")).toBe("begriff");
  });
});

describe("targetFor", () => {
  it("respektiert Overrides inkl. 'none'", () => {
    const mapping = { ...buildMapping(["bold", "italic"]), bold: "none" as const };
    expect(targetFor({ bold: true, italic: false }, mapping)).toBeNull();
    expect(targetFor({ bold: false, italic: true }, mapping)).toBe("begriff");
  });

  it("fällt für unbekannte Schlüssel auf die Heuristik zurück", () => {
    expect(targetFor({ bold: false, italic: false, color: "ff0000" }, {})).toBe("akzent");
  });
});

describe("keyLabel", () => {
  it("übersetzt Schlüssel in lesbare Labels", () => {
    expect(keyLabel("bold+color:980000")).toBe("fett + Farbe #980000");
    expect(keyLabel("highlight:yellow")).toBe("Marker (yellow)");
  });
});
