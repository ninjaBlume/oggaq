import { describe, expect, it } from "vitest";
import { anchorClock, remainingSeconds, timeLabel } from "./index";
describe("server deadline display", () => {
  it("uses server time instead of a wrong device date", () => {
    const c = anchorClock("2026-10-09T10:01:00Z", "2026-10-09T10:00:00Z", 700);
    expect(remainingSeconds(c, 700)).toBe(60);
    expect(remainingSeconds(c, 15700)).toBe(45);
  });
  it("clamps an expired deadline and a suspended view", () => {
    expect(
      remainingSeconds(
        anchorClock("2026-10-09T10:00:00Z", "2026-10-09T10:01:00Z", 0),
        1,
      ),
    ).toBe(0);
    expect(
      remainingSeconds({ remainingMs: 60000, receivedAt: 0 }, 300000),
    ).toBe(0);
  });
  it("rounds fractions up without showing a negative countdown", () => {
    expect(remainingSeconds({ remainingMs: 1001, receivedAt: 0 }, 1)).toBe(1);
    expect(remainingSeconds({ remainingMs: 1001, receivedAt: 0 }, 1002)).toBe(
      0,
    );
    expect(timeLabel(125)).toBe("02:05");
  });
});
