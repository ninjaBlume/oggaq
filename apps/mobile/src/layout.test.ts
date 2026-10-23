import { describe, expect, it } from "vitest";
import { layoutFor } from "./layout";

describe("window class layout", () => {
  it("keeps phones compact: bottom tabs, one column, 14px gutter", () => {
    for (const width of [320, 390, 599]) {
      const layout = layoutFor(width);
      expect(layout).toMatchObject({ cls: "compact", gutter: 14, cardPadding: 14, railed: false, columns: 1 });
    }
  });
  it("gives small tablets a rail and a 720 reading column", () => {
    const layout = layoutFor(834);
    expect(layout).toMatchObject({ cls: "medium", gutter: 24, railed: true, columns: 1 });
    expect(layout.maxWidth - 2 * layout.gutter).toBe(720);
  });
  it("gives large windows a rail, two columns and a 1120 content area", () => {
    const layout = layoutFor(1024);
    expect(layout).toMatchObject({ cls: "expanded", gutter: 32, railed: true, columns: 2 });
    expect(layout.maxWidth - 2 * layout.gutter).toBe(1120);
    expect(layout.readingWidth - 2 * layout.gutter).toBe(720);
  });
  it("switches at 600 and 840", () => {
    expect([599, 600, 839, 840].map((width) => layoutFor(width).cls)).toEqual(["compact", "medium", "medium", "expanded"]);
  });
});
