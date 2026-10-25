interface FontApi {
  isLoaded(family: string): boolean;
  unloadAsync(family: string): Promise<void>;
  loadAsync(family: string, resource: { uri: number | string; weight: number; style: "normal" }): Promise<void>;
}

// A single static Bold file only needs Expo Go's established single-font API.
export function createBrandFontLoader(api: FontApi, family: string, source: number | string, web: boolean) {
  let ready = false;
  let pending: Promise<void> | undefined;
  return {
    isReady: () => ready,
    load(): Promise<void> {
      if (ready) return Promise.resolve();
      if (pending) return pending;
      pending = Promise.resolve().then(async () => {
        if (typeof family !== "string" || !family.trim()) {
          throw new Error("Brand font configuration is missing its font family.");
        }
        // Expo web may leave a CSS registration behind after a failed download.
        if (web && api.isLoaded(family)) await api.unloadAsync(family);
        await api.loadAsync(family, { uri: source, weight: 700, style: "normal" });
        ready = true;
      }).finally(() => { pending = undefined; });
      return pending;
    },
  };
}
