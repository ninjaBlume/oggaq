/** A read-only probe may choose the local library; it never retries a write. */
export async function checkReachability(fetcher: (signal: AbortSignal) => Promise<{ status: number }>, timeoutMs = 3000): Promise<boolean> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      fetcher(controller.signal).then(({ status }) => status > 0 && status < 500, () => false),
      new Promise<boolean>(resolve => { timer = setTimeout(() => { controller.abort(); resolve(false); }, timeoutMs); }),
    ]);
  } catch { return false; }
  finally { if (timer) clearTimeout(timer); }
}
