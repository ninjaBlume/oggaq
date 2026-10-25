import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location("booklet", Path(__file__).with_name("extract-exam-booklet.py"))
booklet = importlib.util.module_from_spec(spec)
spec.loader.exec_module(booklet)


def sample():
    lines = []
    for position in range(1, 126):
        number = position if position <= 100 else position - 100
        lines.append((f"{number}. Synthetic question {position}", False, 1))
        lines += [(f"{letter}) Synthetic option {letter}", letter == "C", 1) for letter in "ABCDE"]
    return lines


class BookletTest(unittest.TestCase):
    def test_sections_and_printed_number_restart_preserve_original_order(self):
        questions = booklet.parse_lines(sample())
        self.assertEqual([q["position"] for q in questions], list(range(1, 126)))
        self.assertEqual(questions[100]["printed_number"], 1)
        self.assertEqual(questions[100]["section"], "weapon")
        self.assertTrue(all(q["visual_review_required"] for q in questions))
        self.assertTrue(all(q["correct_option"] == "C" for q in questions))

    def test_missing_question_is_rejected(self):
        with self.assertRaises(ValueError):
            booklet.parse_lines(sample()[:-6])

    def test_reordered_number_is_rejected(self):
        lines = sample()
        lines[6] = ("3. Synthetic skipped question", False, 1)
        with self.assertRaisesRegex(ValueError, "Unexpected question"):
            booklet.parse_lines(lines)

    def test_missing_or_ambiguous_answer_is_rejected(self):
        for red in [False, True]:
            lines = sample()
            lines[3] = (lines[3][0], red, 1)
            if red:
                lines[4] = (lines[4][0], True, 1)
            with self.assertRaisesRegex(ValueError, "one red answer"):
                booklet.parse_lines(lines)

    def test_empty_option_is_rejected(self):
        lines = sample()
        lines[1] = ("A)", False, 1)
        with self.assertRaisesRegex(ValueError, "Empty option"):
            booklet.parse_lines(lines)

    def test_horizontal_options_keep_each_option_color(self):
        spans = [{"text": "A) One B) Two ", "color": 0}, {"text": "C) Three", "color": 0xFF0000}, {"text": " D) Four E) Five", "color": 0}]
        self.assertEqual(list(booklet.split_colored_line(spans)), [("A) One", False), ("B) Two", False), ("C) Three", True), ("D) Four", False), ("E) Five", False)])

    def test_number_in_stem_and_section_notice_are_not_questions_or_answers(self):
        lines = sample()
        lines.insert(600, ("SİLAHSIZ ADAYLAR İÇİN TEST BİTMİŞTİR.", False, 10))
        lines.insert(1, ("12. madde", False, 1))
        questions = booklet.parse_lines(lines)
        self.assertIn("12. madde", questions[0]["stem"])
        self.assertNotIn("ADAYLAR", questions[99]["options"][-1]["text"])

    def test_booklet_comparison_uses_answer_text_and_rejects_conflicting_keys(self):
        first = {"education_type": "basic", "exam_number": 1, "exam_date": "2026-01-01", "booklet_group": "A", "questions": booklet.parse_lines(sample())}
        second = {**first, "booklet_group": "B", "questions": booklet.parse_lines(sample())[::-1]}
        result = booklet.compare_booklets(first, second)
        self.assertTrue(result["complete"])
        self.assertFalse(result["publishable"])
        second["questions"][0]["options"][2]["marked_correct"] = False
        second["questions"][0]["options"][3]["marked_correct"] = True
        result = booklet.compare_booklets(first, second)
        self.assertEqual(result["answer_conflicts"], [125])
        self.assertFalse(result["complete"])

    def test_comparison_preserves_numeric_punctuation_and_checks_exam_identity(self):
        first = {"education_type": "basic", "exam_number": 1, "exam_date": "2026-01-01", "booklet_group": "A", "questions": booklet.parse_lines(sample())}
        second = {**first, "booklet_group": "B", "questions": booklet.parse_lines(sample())}
        first["questions"][0]["stem"] = "Synthetic 1,5"
        second["questions"][0]["stem"] = "Synthetic 15"
        self.assertEqual(booklet.compare_booklets(first, second)["unmatched_positions"], [1])
        second["education_type"] = "renewal"
        with self.assertRaisesRegex(ValueError, "Different exam identities"):
            booklet.compare_booklets(first, second)


if __name__ == "__main__":
    unittest.main()
