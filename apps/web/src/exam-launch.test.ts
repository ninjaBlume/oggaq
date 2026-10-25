import { expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import type { ExamAttempt } from "@oggaq/shared-types";
import { stageExamLaunch, takeExamLaunch } from "./exam-launch";

const response = { data: { id: "new-exam", status: "active" } as ExamAttempt };
it("hands a successful start to the first opening only; resumes must fetch the server", () => {
  const cache = new QueryClient();
  stageExamLaunch(cache, "personal", response);
  expect(takeExamLaunch(cache, "personal", "new-exam")).toBe(response.data);
  expect(takeExamLaunch(cache, "personal", "new-exam")).toBeUndefined();
  cache.clear();
});
it("never treats an ordinary cached attempt as a fresh start", () => {
  const cache = new QueryClient();
  cache.setQueryData(["exam", "personal", "new-exam"], response);
  expect(takeExamLaunch(cache, "personal", "new-exam")).toBeUndefined();
  cache.clear();
});
it("does not hand data across contexts or query clients", () => {
  const cache = new QueryClient();
  stageExamLaunch(cache, "personal", response);
  expect(takeExamLaunch(new QueryClient(), "personal", "new-exam")).toBeUndefined();
  expect(takeExamLaunch(cache, "company", "new-exam")).toBeUndefined();
  cache.clear();
});
it("drops the handover when logout clears the session cache", () => {
  const cache = new QueryClient();
  stageExamLaunch(cache, "personal", response);
  cache.clear();
  expect(takeExamLaunch(cache, "personal", "new-exam")).toBeUndefined();
});
