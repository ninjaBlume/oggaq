import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { ExamAttempt } from "@oggaq/shared-types";
import { reportNoteLimit, reportReasons } from "@oggaq/study-core";
import type { ReportReason } from "@oggaq/study-core";
import { api } from "./api";
import { useTask } from "./hooks";
import { useTheme } from "./themeContext";
import { Button, ErrorNotice, Field, Sheet, TextLink } from "./ui";

type Row = ExamAttempt["questions"][number];

// "Soruyu bildir" under the result of a question of a finished exam. The sheet asks why and takes an optional note; the
// server keeps one open report per student and question, so a repeated report is harmless.
export function ReportQuestion({
  contextId,
  examId,
  row,
  reported,
}: {
  contextId: string;
  examId: string;
  row: Row;
  reported: (questionId: string) => void;
}) {
  const { palette, styles } = useTheme();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState("");
  const [thanks, setThanks] = useState(false);
  const task = useTask<unknown>();
  function send() {
    if (!reason) return;
    void task.run(
      () =>
        api.request(
          "post",
          "/api/v1/contexts/{context}/exam-attempts/{exam}/answers/{answer}/report",
          {
            params: { context: contextId, exam: examId, answer: row.id },
            body: { reason, note: note.trim() === "" ? null : note.trim() },
          },
        ),
      () => {
        reported(row.question_id);
        setOpen(false);
        setThanks(true);
      },
    );
  }
  return (
    <View style={{ gap: 6 }}>
      {row.reported ? (
        <Text accessibilityState={{ disabled: true }} style={[styles.muted, { fontWeight: "700" }]}>
          Bildirdin
        </Text>
      ) : (
        <TextLink
          onPress={() => {
            task.reset();
            setOpen(true);
          }}
        >
          Soruyu bildir
        </TextLink>
      )}
      {thanks && (
        <Text accessibilityRole="alert" style={styles.muted}>
          Bildirimin alındı, teşekkürler.
        </Text>
      )}
      <Sheet visible={open} title="Soruyu bildir" close={() => setOpen(false)}>
        <Text style={styles.muted}>Bu soruda sorun ne?</Text>
        <View accessibilityRole="radiogroup" style={{ gap: 6 }}>
          {reportReasons.map((item) => {
            const selected = reason === item.value;
            return (
              <Pressable
                key={item.value}
                accessibilityRole="radio"
                accessibilityLabel={item.label}
                accessibilityState={{ selected, disabled: task.pending }}
                disabled={task.pending}
                onPress={() => setReason(item.value)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  minHeight: 48,
                  paddingHorizontal: 14,
                  borderRadius: 16,
                  backgroundColor: selected ? palette.softPrimary : palette.surfaceContainer,
                  borderWidth: 1.5,
                  borderColor: selected ? palette.primary : "transparent",
                }}
              >
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    borderWidth: 2,
                    borderColor: selected ? palette.primary : palette.muted,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {selected && (
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: palette.primary }} />
                  )}
                </View>
                <Text style={[styles.text, { fontSize: 15, flex: 1 }]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Field label="Not (isteğe bağlı)" value={note} onChange={setNote} multiline maxLength={reportNoteLimit} editable={!task.pending} />
        <Text style={[styles.muted, { alignSelf: "flex-end" }]}>{`${note.length}/${reportNoteLimit}`}</Text>
        <ErrorNotice error={task.error} retry={reason ? send : undefined} />
        <Button disabled={!reason || task.pending} onPress={send}>
          {task.pending ? "Gönderiliyor…" : "Bildirimi gönder"}
        </Button>
        <Button secondary disabled={task.pending} onPress={() => setOpen(false)}>
          Vazgeç
        </Button>
      </Sheet>
    </View>
  );
}
