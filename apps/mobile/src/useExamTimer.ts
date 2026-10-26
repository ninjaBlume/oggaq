import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import type { ExamAttempt, ExamSummary } from '@oggaq/shared-types';
import { ExamTimerSession } from '@oggaq/study-core';
import { api } from './api';
import { newId } from './ids';
export function useExamTimer(exam: ExamAttempt | undefined, update: (summary: ExamSummary) => void) {
  const sessionId = useRef(newId());
  const callback = useRef(update);callback.current = update;
  const currentExam = useRef(exam);currentExam.current = exam;
  const target = useRef<{context_id: string; id: string} | null>(null);
  const controller = useRef<ExamTimerSession | null>(null);
  const [state, setState] = useState<{pending: boolean; error: unknown}>({pending: false, error: null});
  const focused = useIsFocused();
  if (!controller.current) controller.current = new ExamTimerSession(async action => {
    if (!target.current && currentExam.current) target.current = {context_id: currentExam.current.context_id, id: currentExam.current.id};
    const e = target.current;if (!e) return;
    if (action === 'resume') sessionId.current = newId();
    const response = await api.request('post', '/api/v1/contexts/{context}/exam-attempts/{exam}/timer', {
      params: {context: e.context_id, exam: e.id}, body: {action, session_id: sessionId.current}, keepalive: action === 'pause',
    });callback.current(response.data);
  });
  const enabled = exam?.status === 'active' && exam.timer_policy === 'pause_on_exit';
  useEffect(() => {
    if (!enabled) return;
    const current = controller.current!;current.listen(setState);
    const visibility = (value: string) => { void current.setVisible(focused && value === 'active'); };
    visibility(AppState.currentState ?? 'active');
    const subscription = AppState.addEventListener('change', visibility);
    const timer = setInterval(() => { void current.heartbeat(); }, 15000);
    return () => { subscription.remove();clearInterval(timer);current.listen(null);void current.setVisible(false); };
  }, [enabled, focused]);
  return {sessionId: sessionId.current, ...state, resume: () => controller.current!.resume(), pause: () => controller.current!.pause()};
}
