import { describe, expect, it } from "vitest";
import { palettes, scoreTone } from "./theme";

describe("score tone", () => {
  it("tints by the 60-point mark and 80 in both schemes", () => {
    for (const scheme of ["light", "dark"] as const) {
      const palette = palettes[scheme];
      expect(scoreTone(59, palette)).toMatchObject({ badge: "red", color: palette.red, backgroundColor: palette.softRed });
      expect(scoreTone(60, palette)).toMatchObject({ badge: "primary", color: palette.primary });
      expect(scoreTone(79.9, palette).badge).toBe("primary");
      expect(scoreTone(80, palette)).toMatchObject({ badge: "success", color: palette.success, backgroundColor: palette.softSuccess });
    }
  });
  it("keeps the dark palette distinct from the light one", () => {
    expect(palettes.dark.paper).not.toBe(palettes.light.paper);
    expect(palettes.dark.onPrimary).not.toBe(palettes.light.onPrimary);
  });
});
