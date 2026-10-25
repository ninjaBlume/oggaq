import { expect, it, vi } from "vitest";
import { isTextSize, preferenceWriter, scaledTextMetrics, type TextSize } from "./textSize";

it.each([["small", 15.3, 24.3], ["standard", 17, 27], ["large", 20.4, 32.4]] as const)(
  "%s scales the original font and line height together", (size, font, line) => {
    const metrics = scaledTextMetrics({fontSize:17, lineHeight:27}, size);
    expect(metrics.fontSize).toBeCloseTo(font); expect(metrics.lineHeight).toBeCloseTo(line);
  },
);
it("only accepts the three stored values", () => {
  for (const value of ["small", "standard", "large"]) expect(isTextSize(value)).toBe(true);
  for (const value of [null, undefined, "", "huge", 1, {}]) expect(isTextSize(value)).toBe(false);
});
it("inherits nested text without multiplying it twice and preserves native default metrics", () => {
  expect(scaledTextMetrics({fontWeight:"700"}, "large", true)).toEqual({});
  expect(scaledTextMetrics({fontSize:20}, "large", true).fontSize).toBe(24);
  expect(scaledTextMetrics(undefined, "standard")).toEqual({fontSize:14});
});
it("serializes rapid writes so the latest setting remains the saved value", async () => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => {release = resolve;});
  const write = vi.fn(async (_value: TextSize) => {await gate;});
  const save = preferenceWriter(write);
  const first = save("small"); const second = save("large");
  await vi.waitFor(() => expect(write).toHaveBeenCalledTimes(1));
  release(); await Promise.all([first, second]);
  expect(write.mock.calls.map(call => call[0])).toEqual(["small", "large"]);
});
it("allows saving again after a rejected native write", async () => {
  const write = vi.fn(async (_value: TextSize) => {}).mockRejectedValueOnce(new Error("storage unavailable"));
  const save = preferenceWriter(write);
  await expect(save("small")).rejects.toThrow("storage unavailable");
  await save("large"); expect(write).toHaveBeenLastCalledWith("large");
});
