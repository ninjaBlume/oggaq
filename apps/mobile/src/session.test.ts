import { expect, it } from "vitest";
import { SessionStore, validateApiUrl } from "./session";
function storage() {
  let value: string | null = null;
  return {
    read: async () => value,
    write: async (v: string) => {
      value = v;
    },
    remove: async () => {
      value = null;
    },
  };
}
it("restores an unexpired token and clears it on logout", async () => {
  const s = storage();
  const first = new SessionStore(s);
  await first.save({
    token: "synthetic-token",
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
  });
  const restored = new SessionStore(s);
  expect(await restored.restore()).toBe(true);
  expect(restored.token).toBe("synthetic-token");
  await restored.clear();
  expect(await s.read()).toBeNull();
  expect(restored.token).toBeNull();
});
it("rejects corrupted and expired saved tokens", async () => {
  const s = storage();
  await s.write("{");
  const store = new SessionStore(s);
  expect(await store.restore()).toBe(false);
  expect(await s.read()).toBeNull();
  await s.write(
    JSON.stringify({ token: "synthetic", expiresAt: "2000-01-01T00:00:00Z" }),
  );
  expect(await store.restore()).toBe(false);
  expect(store.token).toBeNull();
});
it("does not keep a token in memory if secure storage fails", async () => {
  const store = new SessionStore({
    read: async () => null,
    remove: async () => {},
    write: async () => {
      throw new Error("Locked keychain");
    },
  });
  await expect(
    store.save({ token: "synthetic", expiresAt: new Date().toISOString() }),
  ).rejects.toThrow("Locked keychain");
  expect(store.token).toBeNull();
});
it("requires HTTPS outside development and rejects credentials in configuration", () => {
  expect(validateApiUrl("http://10.0.2.2:8000", true)).toBe(
    "http://10.0.2.2:8000",
  );
  expect(() => validateApiUrl("http://10.0.2.2:8000", false)).toThrow("HTTPS");
  expect(() =>
    validateApiUrl("https://name:secret@example.test", false),
  ).toThrow();
});
