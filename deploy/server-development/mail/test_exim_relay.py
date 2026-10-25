"""Pure configuration tests; no mail, root, DNS or live service is used."""
import unittest
from unittest.mock import patch
import os
from pathlib import Path
import stat
import tempfile

from exim_relay import OLD_KEY, patch_config, prepare_key_directory, spf_with_ip

DOMAIN = "codentum.net"
SUBNET = "172.30.88.0/24"
KEY = "/etc/exim4/oggaq-dkim/codentum.net.pem"
SOURCE = "\n".join([
    "domainlist local_domains = dsearch;/etc/exim4/domains/",
    "hostlist relay_from_hosts = 127.0.0.1",
    "DKIM_FILE = /etc/exim4/domains/${domain:$h_from:}/dkim.pem",
    OLD_KEY,
    "begin acl", "acl_check_rcpt:", "  accept hosts = +relay_from_hosts",
    "acl_check_data:", "  accept",
    "begin transports", "remote_smtp:", "  dkim_strict = 0",
    "remote_forwarded_smtp:", "  dkim_strict = 0", "",
])


class EximRelayTest(unittest.TestCase):
    def test_brand_domain_migration_preserves_previous_signature_and_other_domains(self):
        initial = patch_config(SOURCE, DOMAIN, SUBNET, KEY)
        result = patch_config(initial, "oggsor.com", SUBNET, "/etc/exim4/oggaq-dkim/oggsor.com.pem", DOMAIN)
        self.assertIn("!senders = *@oggsor.com : *@codentum.net", result)
        self.assertIn("/etc/exim4/oggaq-dkim/oggsor.com.pem", result)
        self.assertIn(KEY, result)
        self.assertIn("${if exists{DKIM_FILE}{DKIM_FILE}{0}}", result)
        self.assertEqual(result.count("dkim_strict = ${if match_domain{${lc:${domain:$h_from:}}}{oggsor.com : codentum.net}{1}{0}}"), 2)
        self.assertIn("domainlist local_domains = dsearch;/etc/exim4/domains/", result)
        self.assertEqual(patch_config(result, "oggsor.com", SUBNET, "/etc/exim4/oggaq-dkim/oggsor.com.pem", DOMAIN), result)

    def test_domain_migration_rejects_unexpected_or_incomplete_acl(self):
        initial = patch_config(SOURCE, DOMAIN, SUBNET, KEY).replace("!senders", "senders")
        with self.assertRaises(ValueError):
            patch_config(initial, "oggsor.com", SUBNET, "/etc/exim4/oggaq-dkim/oggsor.com.pem", DOMAIN)
        with self.assertRaises(ValueError):
            patch_config(SOURCE, "oggsor.com", SUBNET, "/etc/exim4/oggaq-dkim/oggsor.com.pem", DOMAIN)

    def test_private_umask_still_allows_exim_to_traverse_the_key_directory(self):
        with tempfile.TemporaryDirectory() as root, patch("exim_relay.os.chown"):
            previous = os.umask(0o077)
            try:
                directory = Path(root)/"dkim"
                prepare_key_directory(directory, 123)
                self.assertEqual(stat.S_IMODE(directory.stat().st_mode), 0o750)
            finally:
                os.umask(previous)

    def test_domain_delivery_stays_remote_and_other_domains_keep_their_key_lookup(self):
        result = patch_config(SOURCE, DOMAIN, SUBNET, KEY)
        self.assertIn("domainlist local_domains = dsearch;/etc/exim4/domains/\n", result)
        self.assertNotIn("/etc/exim4/domains/codentum.net", result)
        self.assertIn("{"+KEY+"}{${if exists{DKIM_FILE}{DKIM_FILE}{0}}}", result)

    def test_only_project_network_can_relay_and_both_sender_identities_are_restricted(self):
        result = patch_config(SOURCE, DOMAIN, SUBNET, KEY)
        self.assertIn("hostlist relay_from_hosts = 127.0.0.1 : "+SUBNET, result)
        self.assertIn("!senders = *@codentum.net", result)
        self.assertIn("condition = ${if !eq{${lc:${domain:$h_from:}}}{codentum.net}{yes}{no}}", result)
        self.assertLess(result.index("Application relay sender"), result.index("accept hosts"))

    def test_unsigned_our_domain_fails_while_other_transports_preserve_old_strictness(self):
        result = patch_config(SOURCE, DOMAIN, SUBNET, KEY)
        self.assertEqual(result.count("dkim_strict = ${if eq{${lc:${domain:$h_from:}}}{codentum.net}{1}{0}}"), 2)

    def test_idempotence_and_existing_other_relay_hosts_survive(self):
        source = SOURCE.replace("= 127.0.0.1", "= 127.0.0.1 : 10.1.1.1")
        result = patch_config(source, DOMAIN, SUBNET, KEY)
        self.assertEqual(patch_config(result, DOMAIN, SUBNET, KEY), result)
        self.assertIn("127.0.0.1 : 10.1.1.1 : "+SUBNET, result)

    def test_unexpected_or_partially_patched_config_fails_closed(self):
        for source in [SOURCE.replace(OLD_KEY, "UNKNOWN"), SOURCE.replace("acl_check_data:", "UNKNOWN:"), patch_config(SOURCE, DOMAIN, SUBNET, KEY).replace("!senders", "senders")]:
            with self.assertRaises(ValueError):
                patch_config(source, DOMAIN, SUBNET, KEY)

    def test_untrusted_domain_network_or_key_path_is_rejected(self):
        for domain, subnet, key in [("bad\n", SUBNET, KEY), (DOMAIN, "0.0.0.0/0", KEY), (DOMAIN, "172.30.0.0/16", KEY), (DOMAIN, "203.0.113.0/24", KEY), (DOMAIN, SUBNET, "/etc/exim4/domains/codentum.net/dkim.pem")]:
            with self.assertRaises(ValueError):
                patch_config(SOURCE, domain, subnet, key)

    def test_spf_preserves_existing_includes_and_restrictive_policy_without_duplicates(self):
        initial = "v=spf1 include:_spf.mx.cloudflare.net include:other.example -all"
        result = spf_with_ip(initial, "212.68.34.90")
        self.assertEqual(result, "v=spf1 include:_spf.mx.cloudflare.net include:other.example ip4:212.68.34.90 -all")
        self.assertEqual(spf_with_ip(result, "212.68.34.90"), result)

    def test_missing_spf_or_invalid_ip_does_not_produce_a_dns_record(self):
        for value, address in [("", "212.68.34.90"), ("v=spf1", "212.68.34.90"), ("v=spf1 ~all", "bad")]:
            with self.assertRaises(ValueError):
                spf_with_ip(value, address)


if __name__ == "__main__":
    unittest.main()
