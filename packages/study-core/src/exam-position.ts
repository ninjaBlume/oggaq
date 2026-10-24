// Old attempts have saved answers but no navigation bookmark. Resume at the first unanswered question;
// completed results always open from question one for review.
export function resumeQuestionIndex(exam: { status: string; resume_position?: number | null; questions: readonly { selected_option_id: string | null }[] }): number {
  if (exam.status !== 'active') return 0;
  if (Number.isInteger(exam.resume_position) && exam.resume_position! >= 1 && exam.resume_position! <= exam.questions.length) return exam.resume_position! - 1;
  const unanswered = exam.questions.findIndex((question) => question.selected_option_id === null);
  return unanswered >= 0 ? unanswered : Math.max(0, exam.questions.length - 1);
}

export interface ExamPositionState { pending: boolean; error: unknown }
// Navigation stays immediate. One request at a time, with intermediate positions coalesced, prevents a slow older
// request from overwriting the last viewed question. Failed writes remain visible and can be retried explicitly.
export class ExamPositionSaver {
  private next: number | null = null;
  private last = 1;
  private running = false;
  constructor(private save: (position: number) => Promise<void>, private changed: (state: ExamPositionState) => void) {}
  request(position: number): void {
    this.last = position;
    this.next = position;
    if (!this.running) void this.drain();
  }
  retry(): void { this.request(this.last); }
  listen(changed: (state: ExamPositionState) => void): void { this.changed = changed; }
  detach(): void { this.changed = () => {}; }
  private async drain(): Promise<void> {
    this.running = true;
    this.changed({ pending: true, error: null });
    while (this.next !== null) {
      const position = this.next;
      this.next = null;
      try { await this.save(position); }
      catch (error) {
        if (this.next !== null) continue;
        this.running = false;
        this.changed({ pending: false, error });
        return;
      }
    }
    this.running = false;
    this.changed({ pending: false, error: null });
  }
}
