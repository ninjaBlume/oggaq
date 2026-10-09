export interface ExamClock {
  remainingMs: number;
  receivedAt: number;
}
// Device wall-clock changes never alter the server deadline. Presentation only;
// the API independently rejects late answers and returns the final result.
export function anchorClock(
  deadline: string,
  serverTime: string,
  monotonicNow: number,
): ExamClock {
  return {
    remainingMs: Math.max(0, Date.parse(deadline) - Date.parse(serverTime)),
    receivedAt: monotonicNow,
  };
}
export function remainingSeconds(
  clock: ExamClock,
  monotonicNow: number,
): number {
  return Math.max(
    0,
    Math.ceil(
      (clock.remainingMs - Math.max(0, monotonicNow - clock.receivedAt)) / 1000,
    ),
  );
}
export function timeLabel(seconds: number): string {
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}
