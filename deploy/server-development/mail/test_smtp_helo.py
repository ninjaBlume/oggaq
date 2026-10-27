"""No mail or live writes: verify that only one application's SMTP identity changes."""
import importlib.util
from pathlib import Path
import stat
import sys
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("smtp_helo", Path(__file__).with_name("fix-smtp-helo.py"))
helo = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helo)

SOURCE = "\n".join([
    "begin transports", "remote_smtp:", "  driver = smtp", "  helo_data = " + helo.OLD_HELO,
    "  dkim_selector = mail", "remote_forwarded_smtp:", "  driver = smtp", "  helo_data = " + helo.OLD_HELO, "",
])


class SmtpHeloTest(unittest.TestCase):
    def test_only_regular_transport_and_exact_sender_domain_change(self):
        result = helo.patch_helo(SOURCE, "sender.example", "smtp.example.net")
        expected = helo.expression("sender.example", "smtp.example.net")
        self.assertEqual(result, SOURCE.replace("  helo_data = " + helo.OLD_HELO, "  helo_data = " + expected, 1))
        self.assertIn("{sender.example}{smtp.example.net}{" + helo.OLD_HELO + "}", result)
        self.assertIn("remote_forwarded_smtp:\n  driver = smtp\n  helo_data = " + helo.OLD_HELO, result)
        self.assertEqual(result.count("{"), result.count("}"))

    def test_reapplication_does_not_nest_or_duplicate_rules(self):
        result = helo.patch_helo(SOURCE, "sender.example", "smtp.example.net")
        self.assertEqual(helo.patch_helo(result, "sender.example", "smtp.example.net"), result)

    def test_unknown_missing_and_duplicate_transport_values_fail_closed(self):
        for source in [SOURCE.replace(helo.OLD_HELO, "$primary_hostname", 1), SOURCE.replace("remote_smtp:", "other_smtp:"), SOURCE + SOURCE]:
            with self.assertRaises(ValueError):
                helo.patch_helo(source, "sender.example", "smtp.example.net")

    def test_domain_and_hostname_injection_are_rejected(self):
        for value in ["bad\n.example", "a..example", "-bad.example", "x.${run{bad}}.example", "example."]:
            with self.assertRaises(ValueError):
                helo.expression(value, "smtp.example.net")
            with self.assertRaises(ValueError):
                helo.expression("sender.example", value)

    def test_failed_generated_config_verification_restores_original_template(self):
        with tempfile.TemporaryDirectory() as directory:
            template = Path(directory) / "template"
            generated = Path(directory) / "generated"
            template.write_text(SOURCE)
            template.chmod(0o640)
            generated.write_text(SOURCE)
            # The mocked reload does not regenerate the config: verification must fail.
            with patch.object(helo, "TEMPLATE", template), patch.object(helo, "GENERATED", generated), \
                    patch.object(helo, "check_public_dns"), patch.object(helo.os, "geteuid", return_value=0), \
                    patch.object(helo, "run", return_value="") as run, \
                    patch.object(sys, "argv", ["fix-smtp-helo.py", "--domain", "sender.example", "--hostname", "smtp.example.net", "--public-ip", "192.0.2.10", "--apply"]):
                with self.assertRaisesRegex(RuntimeError, "geri yüklendi"):
                    helo.main()
            self.assertEqual(template.read_text(), SOURCE)
            self.assertEqual(stat.S_IMODE(template.stat().st_mode), 0o640)
            backups = list(Path(directory).glob("*.bak"))
            self.assertEqual(len(backups), 1)
            self.assertEqual(backups[0].read_text(), SOURCE)
            self.assertEqual(stat.S_IMODE(backups[0].stat().st_mode), 0o600)
            self.assertEqual(run.call_args_list.count(unittest.mock.call("systemctl", "reload", "exim4")), 2)
            self.assertEqual(list(Path(directory).glob(".oggsor-helo-*")), [])

    def test_config_parser_rejection_does_not_replace_template_or_reload(self):
        with tempfile.TemporaryDirectory() as directory:
            template = Path(directory) / "template"
            template.write_text(SOURCE)
            with patch.object(helo, "TEMPLATE", template), patch.object(helo, "check_public_dns"), \
                    patch.object(helo.os, "geteuid", return_value=0), \
                    patch.object(helo, "run", side_effect=RuntimeError("invalid config")) as run, \
                    patch.object(sys, "argv", ["fix-smtp-helo.py", "--domain", "sender.example", "--hostname", "smtp.example.net", "--public-ip", "192.0.2.10", "--apply"]):
                with self.assertRaisesRegex(RuntimeError, "invalid config"):
                    helo.main()
            self.assertEqual(template.read_text(), SOURCE)
            self.assertEqual(run.call_count, 1)
            self.assertEqual(list(Path(directory).glob("*.bak")), [])
            self.assertEqual(list(Path(directory).glob(".oggsor-helo-*")), [])


if __name__ == "__main__":
    unittest.main()
