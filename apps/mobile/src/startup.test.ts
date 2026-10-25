import { expect, it, vi } from "vitest";
import { restoreApplication, type Prepared } from "./startup";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
it("reads storage in parallel, then overlaps identity and contexts instead of waiting twice", async () => {
  const probe = deferred<void>(); const session = deferred<boolean>();
  const identity = deferred<void>(); const contexts = deferred<string[]>();
  const steps = { probe: vi.fn(() => probe.promise), restore: vi.fn(() => session.promise),
    identity: vi.fn(() => identity.promise), contexts: vi.fn(() => contexts.promise), prepared: vi.fn() };
  const result = restoreApplication(steps);
  expect(steps.probe).toHaveBeenCalledOnce(); expect(steps.restore).toHaveBeenCalledOnce();
  expect(steps.identity).not.toHaveBeenCalled();
  probe.resolve(); session.resolve(true);
  await vi.waitFor(() => expect(steps.identity).toHaveBeenCalledOnce());
  expect(steps.contexts).toHaveBeenCalledOnce();
  identity.resolve(); await result; // Contexts are deliberately still unresolved.
  contexts.resolve(["personal"]);
  await expect(steps.prepared.mock.calls[0]![0]).resolves.toEqual({data:["personal"]});
});
it("keeps a contexts failure retryable without losing successful identity verification", async () => {
  const error = new Error("contexts unavailable");
  let prepared!: Prepared<string[]>;
  const identity = vi.fn(async () => {});
  await restoreApplication({probe: async () => {}, restore: async () => true,
    contexts: async () => {throw error;}, prepared: value => {prepared = value;}, identity});
  await expect(prepared).resolves.toEqual({error});
  expect(identity).toHaveBeenCalledOnce();
});
it("does not fetch private data without a restored session", async () => {
  const contexts = vi.fn(async () => []); const identity = vi.fn(async () => {});
  await restoreApplication({probe: async () => {}, restore: async () => false, contexts, identity, prepared: vi.fn()});
  expect(contexts).not.toHaveBeenCalled(); expect(identity).not.toHaveBeenCalled();
});
it("surfaces secure storage failures before starting authenticated requests", async () => {
  const contexts = vi.fn(async () => []); const identity = vi.fn(async () => {});
  await expect(restoreApplication({probe: async () => {}, restore: async () => {throw new Error("keychain locked");}, contexts, identity, prepared: vi.fn()})).rejects.toThrow("keychain locked");
  expect(contexts).not.toHaveBeenCalled(); expect(identity).not.toHaveBeenCalled();
});
