import { Pressable, View } from "react-native";
import type { ExamAttempt } from "@oggaq/shared-types";
import { Check, X } from "./icons";
import { Text } from "./text";
import { useTheme } from "./themeContext";

// Shared by the question sheet and wide-screen panel. Only saved server feedback
// determines correctness; a pending selection must never receive a result mark.
export function QuestionMap({ questions, index, blocked, choose }: {
  questions: ExamAttempt["questions"];
  index: number;
  blocked: boolean;
  choose: (index: number) => void;
}) {
  const { palette, styles } = useTheme();
  return <View style={styles.row}>
    {questions.map((question, i) => {
      const outcome = question.feedback?.outcome;
      const correct = outcome === "correct";
      const incorrect = outcome === "incorrect";
      const answered = question.selected_option_id !== null;
      const color = correct ? palette.success : incorrect ? palette.red : answered ? palette.primary : palette.muted;
      const backgroundColor = correct ? palette.softSuccess : incorrect ? palette.softRed : answered ? palette.softPrimary : palette.surfaceContainer;
      const Mark = correct ? Check : incorrect ? X : null;
      const status = correct ? "doğru" : incorrect ? "yanlış" : answered ? "cevaplandı" : "yanıtlanmadı";
      return <Pressable key={question.id}
        testID={`question-map-${i + 1}`}
        accessibilityRole="button"
        accessibilityLabel={`Soru ${i + 1}${answered || Mark ? `, ${status}` : ""}`}
        accessibilityHint="Bu soruya git"
        accessibilityState={{ selected: i === index, disabled: blocked }}
        aria-selected={i === index}
        disabled={blocked}
        onPress={() => choose(i)}
        style={[styles.smallButton, { backgroundColor, borderWidth: 2, borderColor: i === index ? palette.primary : "transparent", paddingHorizontal: 8, paddingVertical: 8 }]}
      >
        <Text style={{ color, fontSize: 14, lineHeight: 20, fontWeight: "700" }}>{i + 1}</Text>
        {Mark && <View testID={`question-map-${i + 1}-${outcome}`} pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
          style={{ position: "absolute", top: 2, right: 2 }}>
          <Mark size={11} color={color} strokeWidth={2.5} />
        </View>}
      </Pressable>;
    })}
  </View>;
}
