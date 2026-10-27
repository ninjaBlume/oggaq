import { ApiError } from "@oggaq/api-client";

export function isTransientReadError(error: unknown): boolean {
  return error instanceof TypeError || (error instanceof ApiError &&
    (error.status === 0 || error.status === 408 || error.status >= 500));
}

function waitForRetry(signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const cancel = () => { clearTimeout(timer); reject(signal.reason); };
    const timer = setTimeout(() => { signal.removeEventListener("abort", cancel); resolve(); }, 800);
    if (signal.aborted) cancel();
    else signal.addEventListener("abort", cancel, { once: true });
  });
}

// Only read-only foreground revalidation uses this bounded recovery. Writes are
// never replayed; auth/validation failures must reach their normal handlers.
export async function recoverRead<T>(read: () => Promise<T>, signal: AbortSignal): Promise<T> {
  signal.throwIfAborted();
  try { return await read(); }
  catch (error) {
    if (signal.aborted || !isTransientReadError(error)) throw error;
    await waitForRetry(signal);
    signal.throwIfAborted();
    return read();
  }
}
