import { useEffect, useRef, useState } from 'react';
import type { ExamAttempt, ExamSummary } from '@oggaq/shared-types';
import { ExamTimerSession, randomId } from '@oggaq/study-core';
import { api } from './api';
const signOutPauses = new Set<() => Promise<void>>();
export async function pauseExamBeforeSignOut(): Promise<void> {
  if (signOutPauses.size === 0) return;
  // Logout must still succeed when the network is gone; the server lease is the fallback.
  await new Promise<void>(resolve => {
    const timeout = setTimeout(resolve, 1500);
    void Promise.allSettled([...signOutPauses].map(pause => pause())).then(() => {clearTimeout(timeout);resolve();});
  });
}
export function useExamTimer(exam: ExamAttempt, update: (summary: ExamSummary) => void) {
  const sessionId = useRef(randomId());
  const callback = useRef(update);callback.current = update;
  const controller = useRef<ExamTimerSession | null>(null);
  const [state, setState] = useState<{pending: boolean; error: unknown}>({pending: false, error: null});
  if (!controller.current) controller.current = new ExamTimerSession(async action => {
    if (action === 'resume') sessionId.current = randomId();
    const response = await api.request('post', '/api/v1/contexts/{context}/exam-attempts/{exam}/timer', {
      params: {context: exam.context_id, exam: exam.id}, body: {action, session_id: sessionId.current}, keepalive: action === 'pause',
    });callback.current(response.data);
  });
  const enabled = exam.status === 'active' && exam.timer_policy === 'pause_on_exit';
  useEffect(() => {
    if (!enabled) return;
    const current = controller.current!;current.listen(setState);
    const visibility = () => { void current.setVisible(document.visibilityState === 'visible'); };
    const leave = () => { void current.setVisible(false); };
    const beforeSignOut = () => current.pause();signOutPauses.add(beforeSignOut);
    visibility();document.addEventListener('visibilitychange', visibility);window.addEventListener('pagehide', leave);
    const timer = window.setInterval(() => { void current.heartbeat(); }, 15000);
    return () => { signOutPauses.delete(beforeSignOut);document.removeEventListener('visibilitychange', visibility);window.removeEventListener('pagehide', leave);window.clearInterval(timer);current.listen(null);void current.setVisible(false); };
  }, [enabled]);
  return {sessionId: sessionId.current, ...state, resume: () => controller.current!.resume(), pause: () => controller.current!.pause()};
}
