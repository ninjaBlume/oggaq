import { expect, it, vi } from "vitest";
import { supportsAppUpdates, UpdateManager, type UpdateStatus } from "./updateManager";

it.each([
  { name: 'iOS store build', platform: 'ios', expoGo: false, development: false, localPreview: false, enabled: true, expected: true },
  { name: 'Android store build', platform: 'android', expoGo: false, development: false, localPreview: false, enabled: true, expected: true },
  { name: 'Expo Go with SDK updates enabled', platform: 'ios', expoGo: true, development: true, localPreview: false, enabled: true, expected: false },
  { name: 'Expo Go with production JS', platform: 'android', expoGo: true, development: false, localPreview: false, enabled: true, expected: false },
  { name: 'web with SDK updates enabled', platform: 'web', expoGo: false, development: false, localPreview: false, enabled: true, expected: false },
  { name: 'native debug client', platform: 'ios', expoGo: false, development: true, localPreview: false, enabled: true, expected: false },
  { name: 'local preview', platform: 'android', expoGo: false, development: false, localPreview: true, enabled: true, expected: false },
  { name: 'disabled native updates', platform: 'ios', expoGo: false, development: false, localPreview: false, enabled: false, expected: false },
])('$name uses only supported app update controls', async ({ name: _name, expected, ...environment }) => {
  expect(supportsAppUpdates(environment)).toBe(expected);
  if (!expected) {
    const { driver, changed } = setup();
    driver.enabled = supportsAppUpdates(environment);
    driver.pending.mockReturnValue(true);
    const manager = new UpdateManager(driver, changed);
    await manager.check(true); await manager.apply(true);
    expect(driver.check).not.toHaveBeenCalled();
    expect(driver.fetch).not.toHaveBeenCalled();
    expect(driver.reload).not.toHaveBeenCalled();
    expect(changed).not.toHaveBeenCalled();
  }
});
function setup() {
  const driver = { enabled: true, busy: vi.fn(() => false), pending: vi.fn(() => false),
    check: vi.fn(async () => ({ isAvailable: true, reason: undefined as string | undefined })),
    fetch: vi.fn(async () => ({ isNew: true })), reload: vi.fn(async () => {}) };
  const changed = vi.fn<(status: UpdateStatus) => void>(); let time = 0;
  return { driver, changed, manager: new UpdateManager(driver, changed, () => time), advance: (ms: number) => { time += ms; } };
}
it("downloads on foreground without ever reloading; only a visible profile can apply", async () => {
  const { manager, driver, changed } = setup(); await manager.check();
  expect(changed).toHaveBeenLastCalledWith({ phase: "ready" }); expect(driver.reload).not.toHaveBeenCalled();
  await manager.apply(false); expect(driver.reload).not.toHaveBeenCalled();
  await manager.apply(true); expect(driver.reload).toHaveBeenCalledOnce();
});
it("keeps Expo Go/preview disabled and leaves native startup checks alone", async () => {
  const { manager, driver } = setup(); driver.enabled = false; await manager.check(true); await manager.apply(true);
  expect(driver.check).not.toHaveBeenCalled(); expect(driver.reload).not.toHaveBeenCalled();
  driver.enabled = true; driver.busy.mockReturnValue(true); await manager.check(true); expect(driver.check).not.toHaveBeenCalled();
});
it("coalesces repeated foreground events into one in-flight download", async () => {
  const { manager, driver } = setup(); let release!: (value: { isAvailable: boolean; reason: undefined }) => void;
  driver.check.mockImplementation(() => new Promise(resolve => { release = resolve; }));
  const first = manager.check(); await manager.check(true); expect(driver.check).toHaveBeenCalledOnce();
  release({ isAvailable: true, reason: undefined }); await first; expect(driver.fetch).toHaveBeenCalledOnce();
});
it("throttles automatic checks but permits a deliberate user retry", async () => {
  const { manager, driver, advance } = setup(); driver.check.mockResolvedValue({ isAvailable: false, reason: undefined });
  await manager.check(); await manager.check(); expect(driver.check).toHaveBeenCalledOnce();
  await manager.check(true); expect(driver.check).toHaveBeenCalledTimes(2);
  advance(60_000); await manager.check(); expect(driver.check).toHaveBeenCalledTimes(3);
});
it("reports a download failure, never calls it current, and allows recovery", async () => {
  const { manager, driver, changed } = setup(); const error = new Error("Synthetic download failure");
  driver.fetch.mockRejectedValueOnce(error); await manager.check();
  expect(changed).toHaveBeenLastCalledWith({ phase: "failed", error });
  await manager.apply(true); expect(driver.reload).not.toHaveBeenCalled();
  await manager.check(true); expect(changed).toHaveBeenLastCalledWith({ phase: "ready" });
});
it("offers an already-downloaded native update without downloading again", async () => {
  const { manager, driver, changed } = setup(); driver.pending.mockReturnValue(true); await manager.check();
  expect(driver.check).not.toHaveBeenCalled(); expect(driver.fetch).not.toHaveBeenCalled();
  expect(changed).toHaveBeenLastCalledWith({ phase: "ready" });
});
it("does not describe a previously failed update as up to date", async () => {
  const { manager, driver, changed } = setup(); driver.check.mockResolvedValue({ isAvailable: false, reason: "updatePreviouslyFailed" });
  await manager.check(); expect(changed.mock.lastCall?.[0].phase).toBe("failed");
});
