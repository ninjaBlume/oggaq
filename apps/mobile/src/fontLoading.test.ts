import { expect, it, vi } from "vitest";
import { createBrandFontLoader } from "./fontLoading";

function fontApi() {
  // Intentionally no loadFontFamilyAsync: older Expo Go bridges only expose loadAsync.
  return { isLoaded: vi.fn(() => false), unloadAsync: vi.fn(async () => {}), loadAsync: vi.fn(async (_family: string, _resource: unknown) => {}) };
}

it("rejects missing configuration before passing undefined to the native module", async () => {
  for (const family of [undefined, "", " "]) {
    const api = fontApi();
    const loader = createBrandFontLoader(api, family as unknown as string, 42, false);
    await expect(loader.load()).rejects.toThrow("configuration is missing");
    expect(api.loadAsync).not.toHaveBeenCalled();
    expect(loader.isReady()).toBe(false);
  }
});

it("loads static Bold through the single-font native bridge without family APIs", async () => {
  const api = fontApi();
  const loader = createBrandFontLoader(api, "League Spartan", 42, false);
  await loader.load();
  expect(api.loadAsync).toHaveBeenCalledWith("League Spartan", { uri: 42, weight: 700, style: "normal" });
  expect(api.unloadAsync).not.toHaveBeenCalled();
  expect(loader.isReady()).toBe(true);
  await loader.load();
  expect(api.loadAsync).toHaveBeenCalledTimes(1);
});

it("shares an in-flight load and retries failures instead of caching a false success", async () => {
  const api = fontApi();
  api.loadAsync.mockRejectedValueOnce(new Error("font download failed"));
  const loader = createBrandFontLoader(api, "League Spartan", 42, false);
  const first = loader.load();
  expect(loader.load()).toBe(first);
  await expect(first).rejects.toThrow("font download failed");
  expect(loader.isReady()).toBe(false);
  await loader.load();
  expect(loader.isReady()).toBe(true);
  expect(api.loadAsync).toHaveBeenCalledTimes(2);
});

it("clears a stale web registration and preserves a real 700 CSS face", async () => {
  const api = fontApi();
  api.isLoaded.mockReturnValue(true);
  const loader = createBrandFontLoader(api, "League Spartan", "/font.ttf", true);
  await loader.load();
  expect(api.unloadAsync).toHaveBeenCalledWith("League Spartan");
  expect(api.loadAsync).toHaveBeenCalledWith("League Spartan", { uri: "/font.ttf", weight: 700, style: "normal" });
  expect(api.unloadAsync.mock.invocationCallOrder[0]).toBeLessThan(api.loadAsync.mock.invocationCallOrder[0]!);
});
