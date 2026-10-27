import { afterEach, expect, it, vi } from "vitest";
import { ApiError } from "@oggaq/api-client";
import { recoverRead } from "./readRecovery";

afterEach(() => vi.useRealTimers());
it("recovers a transient foreground read once without rejecting to the UI", async () => {
  vi.useFakeTimers();
  const read = vi.fn().mockRejectedValueOnce(new ApiError(0, { code: "request_timeout" })).mockResolvedValue("ready");
  const result = recoverRead(read, new AbortController().signal);
  const failed = vi.fn(); void result.catch(failed);
  await vi.advanceTimersByTimeAsync(799); expect(read).toHaveBeenCalledTimes(1); expect(failed).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1); await expect(result).resolves.toBe("ready");
  expect(read).toHaveBeenCalledTimes(2);
});
it.each([401, 403, 422, 429])("never replays a %s auth/validation/rate-limit failure", async status => {
  const error = new ApiError(status, {}); const read = vi.fn().mockRejectedValue(error);
  await expect(recoverRead(read, new AbortController().signal)).rejects.toBe(error);
  expect(read).toHaveBeenCalledOnce();
});
it("surfaces persistent network errors after exactly one recovery attempt", async () => {
  vi.useFakeTimers();
  const error = new ApiError(503, {}); const read = vi.fn().mockRejectedValue(error);
  const result = expect(recoverRead(read, new AbortController().signal)).rejects.toBe(error);
  await vi.advanceTimersByTimeAsync(800); await result; expect(read).toHaveBeenCalledTimes(2);
});
it("cancels a pending retry when the app backgrounds or the account changes", async () => {
  vi.useFakeTimers(); const controller = new AbortController();
  const read = vi.fn().mockRejectedValue(new TypeError("offline"));
  const result = recoverRead(read, controller.signal); const failure = expect(result).rejects.toBeDefined();
  await vi.advanceTimersByTimeAsync(100); controller.abort(); await failure;
  await vi.advanceTimersByTimeAsync(2000); expect(read).toHaveBeenCalledOnce();
});
it("does not start a read that was already cancelled", async () => {
  const controller = new AbortController(); controller.abort(); const read = vi.fn();
  await expect(recoverRead(read, controller.signal)).rejects.toBeDefined(); expect(read).not.toHaveBeenCalled();
});
