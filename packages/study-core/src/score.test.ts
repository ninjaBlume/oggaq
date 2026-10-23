import { describe, expect, it } from "vitest";
import { scoreBand } from "./index";
describe("score bands", () => {
  it("split at the 60-point mark and at 80", () => {
    expect([0, 59.9, 60, 79.9, 80, 100].map(scoreBand)).toEqual(["weak", "weak", "steady", "steady", "strong", "strong"]);
  });
});
