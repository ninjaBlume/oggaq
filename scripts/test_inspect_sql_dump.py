import json
import tempfile
import unittest
from pathlib import Path

from inspect_sql_dump import count_tuples, inspect, parse_create, statements

DUMP = """-- synthetic dump
/*!40101 SET NAMES utf8mb4 */;
DROP TABLE IF EXISTS `questions`;
CREATE TABLE `questions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `body` text,
  `answer` char(1) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_answer` (`answer`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT INTO `questions` VALUES (1,'Soru; (a) ''tırnak''','A'),(2,'it\\'s fine','B');
INSERT INTO `questions` VALUES (3,'Üçüncü','C');
GRANT ALL ON *.* TO 'x'@'%';
"""


class InspectSqlDumpTest(unittest.TestCase):
    def test_statements_respect_quotes_and_comments(self):
        import io
        found = list(statements(io.StringIO(DUMP)))
        self.assertEqual(5, len(found))
        self.assertTrue(found[2].startswith("INSERT INTO `questions` VALUES (1,'Soru; (a)"))

    def test_tuple_counter_ignores_parentheses_inside_strings(self):
        self.assertEqual(2, len(count_tuples("(1,'a),(b'),(2,'c')")))

    def test_create_table_columns_keys_and_options(self):
        name, table = parse_create("CREATE TABLE `t` (`a` int NOT NULL, `b` varchar(10), PRIMARY KEY (`a`)) ENGINE=MyISAM DEFAULT CHARSET=latin5")
        self.assertEqual("t", name)
        self.assertEqual(["a", "b"], [column["name"] for column in table["columns"]])
        self.assertEqual(["PRIMARY KEY (`a`)"], table["keys"])
        self.assertEqual(("MyISAM", "latin5"), (table["engine"], table["charset"]))

    def test_report_counts_rows_flags_risk_and_hides_samples_by_default(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "dump.sql"
            path.write_text(DUMP, encoding="utf-8")
            report = inspect(path)
            self.assertEqual(3, report["inserts"]["questions"])
            self.assertEqual(3, len(report["tables"]["questions"]["columns"]))
            self.assertEqual(1, len(report["risky_statements"]))
            self.assertNotIn("samples", report)
            self.assertEqual(64, len(report["sha256"]))
            self.assertEqual(1, len(inspect(path, samples=1)["samples"]["questions"]))
            json.dumps(report)


if __name__ == "__main__":
    unittest.main()
