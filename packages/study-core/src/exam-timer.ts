import type { ExamAttempt, ExamSummary } from '@oggaq/shared-types';
export const examTimerChoices = [
  { value: 'continuous', label: 'Çıkınca süre devam etsin' },
  { value: 'pause_on_exit', label: 'Çıkınca süre dursun' },
] as const;
export type ExamTimerPolicy = typeof examTimerChoices[number]['value'];
export type TimerAction = 'resume' | 'pause' | 'heartbeat';
export function mergeExamTimer(exam: ExamAttempt, summary: ExamSummary): ExamAttempt {
  if (exam.id !== summary.id || exam.context_id !== summary.context_id || summary.status !== 'active') throw new Error('Sınav yeniden yüklenmeli.');
  return summary.revision < exam.revision ? exam : { ...exam, ...summary };
}
// Serialize leave/return requests, so a slow pause can never overtake a later resume.
export class ExamTimerSession {
  private chain: Promise<void> = Promise.resolve();
  private visible = false;
  private pending = 0;
  private error: unknown = null;
  private listener: ((value: { pending: boolean; error: unknown }) => void) | null = null;
  constructor(private send: (action: TimerAction) => Promise<void>) {}
  listen(listener: ((value: { pending: boolean; error: unknown }) => void) | null) { this.listener = listener; }
  setVisible(visible: boolean) {
    if (this.visible === visible) return;
    this.visible = visible;
    return this.request(visible ? 'resume' : 'pause');
  }
  resume() { this.visible = true; return this.request('resume'); }
  pause() { this.visible = false; return this.request('pause'); }
  heartbeat() { if (this.visible && this.pending === 0) return this.request('heartbeat'); }
  private notify() { this.listener?.({ pending: this.pending > 0, error: this.error }); }
  private request(action: TimerAction) {
    if (action !== 'heartbeat') { this.pending++; this.error = null; this.notify(); }
    this.chain = this.chain.then(() => this.send(action)).then(() => { this.error = null; }).catch(error => { this.error = error; }).finally(() => {
      if (action !== 'heartbeat') this.pending--;
      this.notify();
    });
    return this.chain;
  }
}
