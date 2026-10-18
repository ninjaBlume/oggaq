#!/usr/bin/env python3
"""Read-only structure report for a MySQL/MariaDB dump. Never executes SQL or connects to a database.

Usage: python3 scripts/inspect_sql_dump.py DUMP.sql [--samples N]

The report lists tables, columns, keys, INSERT row counts and risky statements so the real
source schema can be reviewed before any import adapter is written. Row samples are off by
default because a dump can contain personal data; --samples N prints at most N truncated rows
per table to the terminal only.
"""

import argparse
import hashlib
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

RISKY = re.compile(r"^\s*(DROP|GRANT|REVOKE|CREATE\s+(USER|DATABASE|SCHEMA|TRIGGER|PROCEDURE|FUNCTION|EVENT|DEFINER)|"
                   r"ALTER\s+USER|SET\s+GLOBAL|LOAD\s+DATA|CALL|DELIMITER|USE)\b|INTO\s+(OUTFILE|DUMPFILE)", re.I)
TABLE_NAME = r"`?([A-Za-z0-9_$]+)`?"


def statements(stream, chunk=1 << 20):
    """Yield top-level statements, honouring quotes, backtick names and -- / # / /* */ comments."""
    buffer, quote, escaped, line_comment, block_comment = [], None, False, False, False
    previous = ""
    while True:
        text = stream.read(chunk)
        if not text:
            break
        for char in text:
            if line_comment:
                if char == "\n":
                    line_comment = False
                continue
            if block_comment:
                if previous == "*" and char == "/":
                    block_comment = False
                previous = char
                continue
            if quote:
                buffer.append(char)
                if escaped:
                    escaped = False
                elif char == "\\" and quote != "`":
                    escaped = True
                elif char == quote:
                    quote = None
                continue
            if char in "'\"`":
                quote = char
            elif char == "#" or (char == "-" and previous == "-"):
                if char == "-":
                    buffer.pop()
                line_comment = True
                previous = ""
                continue
            elif char == "*" and previous == "/":
                if buffer and buffer[-1] == "/":
                    buffer.pop()
                block_comment = True
                previous = ""
                continue
            elif char == ";":
                statement = "".join(buffer).strip()
                buffer = []
                previous = ""
                if statement:
                    yield statement
                continue
            buffer.append(char)
            previous = char
    tail = "".join(buffer).strip()
    if tail:
        yield tail


def count_tuples(values):
    """Count top-level (...) groups in a VALUES list and return up to the raw text of each tuple."""
    depth, quote, escaped, start, rows = 0, None, False, 0, []
    for index, char in enumerate(values):
        if quote:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == quote:
                quote = None
            continue
        if char in "'\"":
            quote = char
        elif char == "(":
            if depth == 0:
                start = index
            depth += 1
        elif char == ")" and depth:
            depth -= 1
            if depth == 0:
                rows.append(values[start:index + 1])
    return rows


def parse_create(statement):
    name = re.match(r"CREATE\s+(?:TEMPORARY\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?" + TABLE_NAME, statement, re.I)
    if not name:
        return None
    body_start, body_end = statement.find("("), statement.rfind(")")
    columns, keys = [], []
    parts, depth, current = [], 0, []
    for char in statement[body_start + 1:body_end]:
        depth += char == "("
        depth -= char == ")"
        if char == "," and depth == 0:
            parts.append("".join(current).strip())
            current = []
        else:
            current.append(char)
    parts.append("".join(current).strip())
    for part in filter(None, parts):
        if re.match(r"(PRIMARY|UNIQUE|KEY|INDEX|FULLTEXT|CONSTRAINT|FOREIGN)\b", part, re.I):
            keys.append(re.sub(r"\s+", " ", part))
        else:
            column = re.match(TABLE_NAME + r"\s+(.+)", part, re.S)
            if column:
                columns.append({"name": column.group(1), "definition": re.sub(r"\s+", " ", column.group(2))})
    options = statement[body_end + 1:]
    engine = re.search(r"ENGINE\s*=\s*(\w+)", options, re.I)
    charset = re.search(r"CHARSET\s*=\s*(\w+)", options, re.I)
    return name.group(1), {"columns": columns, "keys": keys, "engine": engine and engine.group(1), "charset": charset and charset.group(1)}


def inspect(path, samples=0):
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for block in iter(lambda: handle.read(1 << 20), b""):
            digest.update(block)
    report = {"file": Path(path).name, "bytes": Path(path).stat().st_size, "sha256": digest.hexdigest(),
              "statement_counts": Counter(), "tables": {}, "inserts": defaultdict(int), "risky_statements": [], "samples": {}}
    with open(path, "r", encoding="utf-8", errors="replace", newline="") as stream:
        report["invalid_utf8_replacements"] = 0
        for statement in statements(stream):
            report["invalid_utf8_replacements"] += statement.count("�")
            kind = " ".join(statement.split()[:2]).upper()
            report["statement_counts"][kind] += 1
            if RISKY.search(statement) and not statement.upper().startswith("DROP TABLE IF EXISTS"):
                report["risky_statements"].append(statement[:120])
            if kind.startswith("CREATE"):
                created = parse_create(statement)
                if created:
                    report["tables"][created[0]] = created[1]
            insert = re.match(r"(?:INSERT|REPLACE)\s+(?:IGNORE\s+)?(?:INTO\s+)?" + TABLE_NAME + r".*?\bVALUES\b(.*)", statement, re.I | re.S)
            if insert:
                rows = count_tuples(insert.group(2))
                report["inserts"][insert.group(1)] += len(rows)
                bucket = report["samples"].setdefault(insert.group(1), [])
                bucket.extend(row[:200] for row in rows[:max(0, samples - len(bucket))])
    report["statement_counts"] = dict(report["statement_counts"])
    report["inserts"] = dict(report["inserts"])
    if not samples:
        del report["samples"]
    return report


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("dump")
    parser.add_argument("--samples", type=int, default=0)
    arguments = parser.parse_args(argv)
    print(json.dumps(inspect(arguments.dump, arguments.samples), ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
