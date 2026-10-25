import type { QueryClient } from "@tanstack/react-query";
import type { ExamAttempt } from "@oggaq/shared-types";

// One-shot handover of a just-created, server-authorized attempt. Never use an
// ordinary detail cache entry for resume: another device may have moved its bookmark.
const launches = new WeakMap<QueryClient, { context: string; data: ExamAttempt }>();
export function stageExamLaunch(cache: QueryClient, context: string, response: { data: ExamAttempt }) {
  cache.setQueryData(["exam", context, response.data.id], response);
  launches.set(cache, { context, data: response.data });
}
export function takeExamLaunch(cache: QueryClient, context: string, id: string) {
  const launch = launches.get(cache);
  launches.delete(cache);
  const cached = cache.getQueryData<{ data: ExamAttempt }>(["exam", context, id]);
  return launch?.context === context && launch.data.id === id && cached?.data === launch.data
    ? launch.data : undefined;
}
