import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ExamAttempt } from "@oggaq/shared-types";
import { reportNoteLimit, reportReasons } from "@oggaq/study-core";
import type { ReportReason } from "@oggaq/study-core";
import { api } from "./api";
import { ErrorNotice, Field } from "./ui";

type Row = ExamAttempt["questions"][number];

// "Soruyu bildir" under the result of a question of a finished exam: why, an optional note, and a confirmation.
// The server keeps one open report per student and question, so a repeated report is harmless.
export function ReportQuestion({ contextId, examId, row }: { contextId: string; examId: string; row: Row }) {
  const cache = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState("");
  const [thanks, setThanks] = useState(false);
  const report = useMutation({
    mutationFn: () =>
      api.request("post", "/api/v1/contexts/{context}/exam-attempts/{exam}/answers/{answer}/report", {
        params: { context: contextId, exam: examId, answer: row.id },
        body: { reason: reason!, note: note.trim() === "" ? null : note.trim() },
      }),
    onSuccess: () => {
      cache.setQueryData<{ data: ExamAttempt }>(["exam", contextId, examId], (old) =>
        old && { data: { ...old.data, questions: old.data.questions.map((item) => (item.question_id === row.question_id ? { ...item, reported: true } : item)) } });
      setOpen(false);
      setThanks(true);
    },
  });
  if (row.reported && !open) {
    return <div className="report-state">
      <button type="button" className="text-button" disabled>Bildirdin</button>
      {thanks && <p role="status" className="muted">Bildirimin alındı, teşekkürler.</p>}
    </div>;
  }
  if (!open) return <div className="report-state"><button type="button" className="text-button" aria-expanded={false} onClick={() => { report.reset(); setOpen(true); }}>Soruyu bildir</button></div>;
  return <form className="report-form" onSubmit={(event) => { event.preventDefault(); if (reason && !report.isPending) report.mutate(); }}>
    <fieldset disabled={report.isPending}>
      <legend>Bu soruda sorun ne?</legend>
      <div className="report-options">{reportReasons.map((item) => <label key={item.value} className="report-option"><input type="radio" name={`report-reason-${row.id}`} checked={reason === item.value} onChange={() => setReason(item.value)} />{item.label}</label>)}</div>
      <Field label="Not (isteğe bağlı)" hint={`${note.length}/${reportNoteLimit}`}>{(props) => <textarea {...props} rows={3} maxLength={reportNoteLimit} value={note} onChange={(event) => setNote(event.target.value)} />}</Field>
      <div className="actions">
        <button type="submit" className="button primary" disabled={!reason || report.isPending}>{report.isPending ? "Gönderiliyor…" : "Bildirimi gönder"}</button>
        <button type="button" className="button secondary" onClick={() => setOpen(false)}>Vazgeç</button>
      </div>
    </fieldset>
    {report.isError && <ErrorNotice error={report.error} retry={() => report.mutate()} />}
  </form>;
}
