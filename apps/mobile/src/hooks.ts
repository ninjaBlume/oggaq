import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
export function useResource<T>(
  loader: (signal: AbortSignal) => Promise<T>,
  dependencies: readonly unknown[],
  enabled = true,
) {
  const active = useRef(enabled);
  active.current = enabled;
  const fn = useRef(loader);
  fn.current = loader;
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    if (!active.current) {
      setLoading(false);
      return;
    }
    controller.current?.abort();
    const next = new AbortController();
    controller.current = next;
    setError(null);
    setLoading(true);
    try {
      const value = await fn.current(next.signal);
      if (mounted.current && !next.signal.aborted) setData(value);
    } catch (e) {
      if (mounted.current && !next.signal.aborted) setError(e);
    } finally {
      if (mounted.current && !next.signal.aborted) setLoading(false);
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    setData(null);
    void reload();
    return () => {
      mounted.current = false;
      controller.current?.abort();
    };
  }, dependencies);
  return {
    data,
    setData,
    error,
    loading,
    reload,
    cancel: () => controller.current?.abort(),
  };
}
export function useTask<T>() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const running = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  async function run(work: () => Promise<T>, success: (value: T) => void) {
    if (running.current) return;
    running.current = true;
    setPending(true);
    setError(null);
    try {
      const value = await work();
      if (mounted.current) success(value);
    } catch (e) {
      if (mounted.current) setError(e);
    } finally {
      running.current = false;
      if (mounted.current) setPending(false);
    }
  }
  return { pending, error, run, reset: () => setError(null) };
}
export function useResume(callback: () => void) {
  const ref = useRef(callback);
  ref.current = callback;
  useEffect(() => {
    const s = AppState.addEventListener("change", (state) => {
      if (state === "active") ref.current();
    });
    return () => s.remove();
  }, []);
}
