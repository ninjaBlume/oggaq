export type UpdatePhase = "idle" | "checking" | "downloading" | "current" | "ready" | "applying" | "failed";
export type UpdateStatus = { phase: UpdatePhase; error?: unknown };
type UpdateDriver = {
  enabled: boolean;
  busy: () => boolean;
  pending: () => boolean;
  check: () => Promise<{ isAvailable: boolean; isRollBackToEmbedded?: boolean; reason?: string }>;
  fetch: () => Promise<{ isNew: boolean; isRollBackToEmbedded?: boolean }>;
  reload: () => Promise<void>;
};

// One download at a time, bounded automatic checks, and no automatic reload.
// An update must never restart an active exam or block the app's first frame.
export class UpdateManager {
  private running = false;
  private lastAutomaticAttempt = -Infinity;
  private status: UpdateStatus = { phase: "idle" };
  constructor(private readonly driver: UpdateDriver, private readonly changed: (status: UpdateStatus) => void, private readonly now = Date.now) {}
  private set(status: UpdateStatus) { this.status = status; this.changed(status); }
  async check(manual = false): Promise<void> {
    if (!this.driver.enabled || this.running || this.driver.busy()) return;
    if (this.driver.pending()) { this.set({ phase: "ready" }); return; }
    if (!manual && this.now() - this.lastAutomaticAttempt < 60_000) return;
    this.lastAutomaticAttempt = this.now();
    this.running = true;
    this.set({ phase: "checking" });
    try {
      const result = await this.driver.check();
      if (!result.isAvailable && !result.isRollBackToEmbedded) {
        if (result.reason === "updatePreviouslyFailed") throw new Error("Update previously failed");
        this.set({ phase: "current" });
      } else {
        this.set({ phase: "downloading" });
        const downloaded = await this.driver.fetch();
        this.set({ phase: downloaded.isNew || downloaded.isRollBackToEmbedded || this.driver.pending() ? "ready" : "current" });
      }
    } catch (error) { this.set({ phase: "failed", error }); }
    finally { this.running = false; }
  }
  async apply(profileVisible: boolean): Promise<void> {
    if (!profileVisible || !this.driver.enabled || this.running || this.driver.busy() ||
      (this.status.phase !== "ready" && !this.driver.pending())) return;
    this.running = true;
    this.set({ phase: "applying" });
    try { await this.driver.reload(); }
    catch (error) { this.set({ phase: "failed", error }); }
    finally { this.running = false; }
  }
}
