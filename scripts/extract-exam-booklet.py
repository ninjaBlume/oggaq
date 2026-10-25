#!/usr/bin/env python3
"""Extract red-key, two-column EGM booklets into review-only JSON. Never writes a database."""

import argparse
import hashlib
import json
import re
import unicodedata
from datetime import date
from pathlib import Path


def split_colored_line(spans):
    text = "".join(s["text"] for s in spans)
    colors = [s["color"] for s in spans for _ in s["text"]]
    starts = [m.start() for m in re.finditer(r"(?<!\S)[A-E]\)", text)]
    cuts = starts if starts and not text[:starts[0]].strip() else [0]
    for start, end in zip(cuts, cuts[1:] + [len(text)]):
        part = text[start:end]
        yield part.strip(), any((c >> 16) >= 180 and ((c >> 8) & 255) <= 64 and (c & 255) <= 64 and ch.strip() for ch, c in zip(part, colors[start:end]))


def exam_date(header):
    months = {name: i + 1 for i, name in enumerate(['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'])}
    dates = set()
    for day, month, year in re.findall(r'\b(\d{2})[./](\d{2})[./](\d{4})\b', header):
        dates.add(date(int(year), int(month), int(day)).isoformat())
    for day, month, year in re.findall(r'\b(\d{1,2})\s+(' + '|'.join(months) + r')\s+(\d{4})\b', header):
        dates.add(date(int(year), months[month], int(day)).isoformat())
    if len(dates) != 1:
        raise ValueError('Missing or ambiguous exam date')
    return dates.pop()


def parse_lines(lines):
    questions = []
    current = None
    option = None
    for text, red, page in lines:
        text = " ".join(text.split())
        if not text or "ÖZEL GÜVENLİK" in text or "Diğer sayfaya" in text:
            continue
        notice = text.upper().replace('İ', 'I').replace(' ', '')
        letters = [char for char in text if char.isalpha()]
        notice_style = letters and sum(char.isupper() for char in letters) / len(letters) >= .8
        if current is not None and current["position"] == 100 and len(current["options"]) == 5 and notice_style and any(token in notice for token in ["ADAYLAR", "CEVAPLARINIZI", "KONTROLEDINIZ", "SORULARINI", "CEVAPLAYINIZ", "SILAHBILGISISORULARI"]):
            continue
        match = re.match(r"^(\d{1,3})\.(?:\s+|$)(.*)$", text)
        if match and (current is None or len(current["options"]) == 5):
            expected = len(questions) + 1
            printed = expected if expected <= 100 else expected - 100
            if int(match[1]) != printed:
                raise ValueError(f"Unexpected question number at page {page}: {match[1]}, expected {printed}")
            current = {"position": expected, "printed_number": printed, "section": "general" if expected <= 100 else "weapon",
                       "stem": match[2], "options": [], "source_pages": [page], "visual_review_required": True}
            questions.append(current)
            option = None
        elif current is not None:
            if page not in current["source_pages"]:
                current["source_pages"].append(page)
            choice = re.match(r"^([A-E])\)\s*(.*)$", text)
            if choice:
                option = {"letter": choice[1], "text": choice[2], "marked_correct": red}
                current["options"].append(option)
            elif option is None:
                current["stem"] += " " + text
            elif text not in {"TEST BİTTİ", "CEVAPLARINIZI", "KONTROL EDİNİZ.", "SİLAH BİLGİSİ VE ATIŞ"}:
                option["text"] += " " + text
                option["marked_correct"] |= red
    if len(questions) != 125:
        raise ValueError(f"Expected 100 general + 25 weapon questions, found {len(questions)}")
    for question in questions:
        if not question["stem"].strip() or [o["letter"] for o in question["options"]] != list("ABCDE"):
            raise ValueError(f"Incomplete stem/options at question {question['position']}")
        if any(not o["text"].strip() for o in question["options"]):
            raise ValueError(f"Empty option at question {question['position']}")
        answers = [o["letter"] for o in question["options"] if o["marked_correct"]]
        if len(answers) != 1:
            raise ValueError(f"Expected one red answer at question {question['position']}, found {answers}")
        question["correct_option"] = answers[0]
    return questions


def compare_booklets(first, second):
    for key in ["education_type", "exam_number", "exam_date"]:
        if first[key] != second[key]:
            raise ValueError("Different exam identities cannot be compared")
    if first["booklet_group"] == second["booklet_group"]:
        raise ValueError("Comparison requires different booklet groups")
    normalize = lambda text: re.sub(r"\s+", "", unicodedata.normalize("NFC", text))
    def signature(question):
        return normalize(question["stem"]), tuple(sorted(normalize(o["text"]) for o in question["options"]))
    def answer(question):
        return next(normalize(o["text"]) for o in question["options"] if o["marked_correct"])
    index = {}
    for question in second["questions"]:
        key = signature(question)
        if key in index:
            raise ValueError("Ambiguous duplicate questions in the comparison booklet")
        index[key] = question
    matches, missing, conflicts = [], [], []
    for question in first["questions"]:
        other = index.get(signature(question))
        if other is None:
            missing.append(question["position"])
            continue
        matches.append({"first": question["position"], "second": other["position"]})
        if answer(question) != answer(other):
            conflicts.append(question["position"])
    return {"normalization": "Unicode NFC; only whitespace removed; punctuation, digits and case preserved",
            "text_option_matches": len(matches), "unmatched_positions": missing, "answer_conflicts": conflicts,
            "matches": matches, "complete": len(matches) == 125 and not missing and not conflicts,
            "primary_source_verified": False, "publishable": False}


def extract(path, education, number, group):
    import fitz  # PyMuPDF is a local document-analysis dependency, not an application dependency.

    if path.stat().st_size > 20 * 1024 * 1024:
        raise ValueError("Booklet exceeds the 20 MiB analysis limit")
    lines = []
    document = fitz.open(path)
    if not 1 <= len(document) <= 40:
        raise ValueError("Expected between 1 and 40 pages")
    header = document[0].get_text()
    expected = "TEMEL" if education == "basic" else "YENİLEME"
    if not re.search(rf"{number}\.\s*{expected}", header) or f"({group} GRUBU)" not in header:
        raise ValueError("Booklet heading does not match the requested education, number and group")
    found_date = exam_date(header)
    for page_index, page in enumerate(document):
        for left, right in [(0, page.rect.width / 2), (page.rect.width / 2, page.rect.width)]:
            found = []
            for block in page.get_text("dict")["blocks"]:
                for line in block.get("lines", []):
                    x0, y0, x1, y1 = line["bbox"]
                    # Some archived question numbers hang just left of the central gutter.
                    if line["dir"] != (1.0, 0.0) or not left <= (x0 + x1) / 2 < right:
                        continue
                    text = "".join(span["text"] for span in line["spans"]).strip()
                    if y0 < 90 or y1 > page.rect.height - 90:
                        continue
                    if (re.fullmatch(r"\d+", text) and y0 > page.rect.height - 150 and page.rect.width * .4 < x0 < page.rect.width * .6) or "Diğer sayfaya" in text:
                        continue
                    for index, (part, red) in enumerate(split_colored_line(line["spans"])):
                        found.append((round(y0, 1), x0 + index / 1000, part, red, page_index + 1))
            for _, _, text, red, page_number in sorted(found):
                lines.append((text, red, page_number))
    return {"education_type": education, "exam_number": number, "booklet_group": group,
            "exam_date": found_date,
            "pdf_sha256": hashlib.sha256(path.read_bytes()).hexdigest(), "page_count": len(document),
            "status": "awaiting_source_and_editor_review", "publishable": False,
            "questions": parse_lines(lines)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pdf", type=Path)
    parser.add_argument("--education", choices=["basic", "renewal"], required=True)
    parser.add_argument("--number", type=int, required=True)
    parser.add_argument("--group", choices=["A", "B"], required=True)
    parser.add_argument("--source-url", required=True)
    parser.add_argument("--announcement-url", required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--compare-json", type=Path, help="Previously extracted other booklet group; only NFC/whitespace is normalized")
    args = parser.parse_args()
    result = extract(args.pdf, args.education, args.number, args.group)
    result.update({"download_url": args.source_url, "announcement_url": args.announcement_url})
    if args.compare_json:
        result["comparison"] = compare_booklets(result, json.loads(args.compare_json.read_text()))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(f"{len(result['questions'])} questions extracted; publication disabled pending source and editor review.")


if __name__ == "__main__":
    main()
