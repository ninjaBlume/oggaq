import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { NavigationContext, useIsFocused } from "@react-navigation/native";
import { ScreenActive } from "./screenActivity";
import { isTransientReadError, recoverRead } from "./readRecovery";
export function useOnReturn(callback: () => void) {
  const screenFocused = useIsFocused();
  const active = useContext(ScreenActive);
  const focused = screenFocused && active;
  const blurred = useRef(false);
  const ref = useRef(callback);
  ref.current = callback;
  useEffect(() => {
    if (!focused) blurred.current = true;
    else if (blurred.current) {
      blurred.current = false;
      ref.current();
    }
  }, [focused]);
}
export function useResource<T>(
  loader: (signal: AbortSignal) => Promise<T>,
  dependencies: readonly unknown[],
  enabled = true,
  { manageResume = true }: { manageResume?: boolean } = {},
) {
  const active = useRef(enabled);
  active.current = enabled;
  const fn = useRef(loader);
  fn.current = loader;
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const [data, setData] = useState<T | null>(null);
  const retained = useRef<T | null>(null);
  retained.current = data;
  const [error, setError] = useState<unknown>(null);
  const [refreshError, setRefreshError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async (recover = true) => {
    if (!active.current) {
      setLoading(false);
      return;
    }
    controller.current?.abort();
    const next = new AbortController();
    controller.current = next;
    setError(null);
    setRefreshError(null);
    setLoading(true);
    try {
      const read = () => fn.current(next.signal);
      const value = await (recover ? recoverRead(read, next.signal) : read());
      if (mounted.current && !next.signal.aborted) setData(value);
    } catch (e) {
      if (mounted.current && !next.signal.aborted) {
        if (retained.current !== null && isTransientReadError(e)) setRefreshError(e);
        else setError(e);
      }
    } finally {
      if (mounted.current && !next.signal.aborted) setLoading(false);
    }
  }, []);
  const cancel = useCallback(() => {
    controller.current?.abort();
    if (mounted.current) setLoading(retained.current === null);
  }, []);
  // Suspended requests must not publish stale timeout errors after foregrounding.
  useResume(() => { if (manageResume) void reload(); }, () => { if (manageResume) cancel(); });
  useEffect(() => {
    mounted.current = true;
    setData(null);
    retained.current = null;
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
    refreshError,
    loading,
    reload,
    cancel,
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
export function useResume(callback: () => void, background?: () => void) {
  const navigation = useContext(NavigationContext);
  const active = useContext(ScreenActive);
  const ref = useRef(callback);
  ref.current = callback;
  const visible = useRef(active);
  visible.current = active;
  const pause = useRef(background);
  pause.current = background;
  useEffect(() => {
    let wasBackground = AppState.currentState === "background";
    const s = AppState.addEventListener("change", (state) => {
      if (state === "background") {
        wasBackground = true;
        pause.current?.();
      } else if (state === "active" && wasBackground) {
        wasBackground = false;
        if (visible.current && (!navigation || navigation.isFocused())) ref.current();
      }
    });
    return () => s.remove();
  }, [navigation]);
}
