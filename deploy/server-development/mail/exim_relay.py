"""Scoped Codentum relay setup. Private DKIM keys never become local mail domains."""
import argparse
import grp
import ipaddress
import os
from pathlib import Path
import re
import stat
import subprocess
import tempfile
import time

MARKER = "# OGGAQ scoped outgoing relay"
OLD_KEY = "DKIM_PRIVATE_KEY = ${if exists{DKIM_FILE}{DKIM_FILE}{0}}"

def validate(domain, subnet):
    if not re.fullmatch(r"[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,63}", domain) or ".." in domain:
        raise ValueError("Geçersiz alan adı")
    network = ipaddress.ip_network(subnet, strict=True)
    private = [ipaddress.ip_network(cidr) for cidr in ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"]]
    if network.version != 4 or network.prefixlen < 24 or not any(network.subnet_of(block) for block in private):
        raise ValueError("Yalnız dar kapsamlı özel Docker IPv4 ağı kabul edilir")

def patch_config(source, domain, subnet, key):
    validate(domain, subnet)
    if key != f"/etc/exim4/oggaq-dkim/{domain}.pem":
        raise ValueError("DKIM anahtarı yalnız proje dizininde olabilir")
    key_line = "DKIM_PRIVATE_KEY = ${if eq{${lc:${domain:$h_from:}}}{"+domain+"}{"+key+"}{${if exists{DKIM_FILE}{DKIM_FILE}{0}}}}"
    strict = "  dkim_strict = ${if eq{${lc:${domain:$h_from:}}}{"+domain+"}{1}{0}}"
    rcpt = ("acl_check_rcpt:\n"+MARKER+"\n"
            "  deny    hosts = "+subnet+"\n"
            "          !senders = *@"+domain+"\n"
            "          message = Application relay sender is not allowed\n")
    data = ("acl_check_data:\n"+MARKER+"\n"
            "  deny    hosts = "+subnet+"\n"
            "          condition = ${if !eq{${lc:${domain:$h_from:}}}{"+domain+"}{yes}{no}}\n"
            "          message = Application From domain is not allowed\n")
    if MARKER in source:
        required = [key_line, strict, rcpt, data]
        if not all(part in source for part in required) or source.count(MARKER) != 2 or source.count(strict) != 2 or not re.search(r"^hostlist relay_from_hosts = .*"+re.escape(subnet)+r"(?: : |$)", source, re.M):
            raise ValueError("Eksik/değişmiş mevcut yama; elle inceleme gerekli")
        return source
    for old, count in [(OLD_KEY, 1), ("acl_check_rcpt:\n", 1), ("acl_check_data:\n", 1), ("  dkim_strict = 0", 2)]:
        if source.count(old) != count:
            raise ValueError("Beklenmeyen Exim şablonu; değişiklik yapılmadı: "+old)
    host = re.findall(r"^hostlist relay_from_hosts = .+$", source, re.M)
    if len(host) != 1:
        raise ValueError("Tek bir relay_from_hosts satırı gerekli")
    if subnet not in host[0].split(" = ", 1)[1].split(" : "):
        source = source.replace(host[0], host[0]+" : "+subnet, 1)
    return source.replace(OLD_KEY, key_line, 1).replace("acl_check_rcpt:\n", rcpt, 1).replace("acl_check_data:\n", data, 1).replace("  dkim_strict = 0", strict)

def spf_with_ip(value, address):
    ipaddress.IPv4Address(address)
    terms = value.split()
    if not terms or terms[0] != "v=spf1" or not terms[-1].endswith("all"):
        raise ValueError("Mevcut tek SPF kaydı gerekli")
    if "ip4:"+address not in terms:
        terms.insert(-1, "ip4:"+address)
    return " ".join(terms)

def prepare_key_directory(directory, group):
    directory.mkdir(mode=0o750, exist_ok=True)
    directory.chmod(0o750)  # umask 077 must not remove Exim's directory traversal permission.
    os.chown(directory, 0, group)

def run(*args):
    return subprocess.run(args, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--domain", default="codentum.net")
    parser.add_argument("--subnet", default="172.30.88.0/24")
    parser.add_argument("--public-ip", default="212.68.34.90")
    parser.add_argument("--existing-spf", required=True)
    args = parser.parse_args()
    validate(args.domain, args.subnet)
    spf = spf_with_ip(args.existing_spf, args.public_ip)
    if os.geteuid() != 0:
        raise RuntimeError("Root gerekli")
    os.umask(0o077)
    template = Path("/etc/exim4/exim4.conf.template")
    if template.is_symlink():
        raise RuntimeError("Symlink şablonu elle incelenmeli")
    if (Path("/etc/exim4/domains")/args.domain).exists():
        raise RuntimeError("Alan adı yerel posta alanı; Cloudflare MX yönlendirmesi önce incelenmeli")
    network = subprocess.check_output(["docker", "network", "inspect", "oggaq-development_default", "--format", "{{range .IPAM.Config}}{{.Subnet}}{{end}}"], text=True).strip()
    if network != args.subnet:
        raise RuntimeError("Canlı Compose alt ağı eşleşmiyor")
    run("exim4", "-bV")
    run("systemctl", "is-active", "--quiet", "exim4")
    source = template.read_text()
    key = Path("/etc/exim4/oggaq-dkim")/(args.domain+".pem")
    candidate = patch_config(source, args.domain, args.subnet, str(key))
    if args.check:
        print("Ön kontrol başarılı; DKIM yerel mail domain'i oluşturmayacak. MX/DMARC değişmez.")
        return
    group = grp.getgrnam("Debian-exim").gr_gid
    if key.parent.is_symlink() or key.is_symlink():
        raise RuntimeError("DKIM symlink kabul edilmez")
    prepare_key_directory(key.parent, group)
    if not key.exists():
        run("openssl", "genrsa", "-out", str(key), "2048")
    os.chown(key, 0, group)
    key.chmod(0o640)
    run("openssl", "rsa", "-in", str(key), "-check", "-noout")
    if source != candidate:
        backup = template.with_name(template.name+".oggaq-"+str(time.time_ns())+".bak")
        backup.write_text(source); backup.chmod(0o600)
        fd, temporary = tempfile.mkstemp(prefix=".oggaq-candidate-", dir=template.parent)
        try:
            with os.fdopen(fd, "w") as stream:
                stream.write(candidate)
            original_stat = template.stat()
            os.chmod(temporary, stat.S_IMODE(original_stat.st_mode))
            os.chown(temporary, original_stat.st_uid, original_stat.st_gid)
            run("exim4", "-C", temporary, "-bV")
            os.replace(temporary, template)
            try:
                run("exim4", "-bV")
                run("systemctl", "reload", "exim4")
                run("systemctl", "is-active", "--quiet", "exim4")
            except subprocess.CalledProcessError:
                template.write_text(source)
                run("systemctl", "reload", "exim4")
                raise RuntimeError("Exim sağlık kontrolü başarısız; önceki yapılandırma geri alındı")
        finally:
            Path(temporary).unlink(missing_ok=True)
        print("Kapsamlı yedek korundu: "+str(backup))
    public = subprocess.check_output(["openssl", "rsa", "-in", str(key), "-pubout"], stderr=subprocess.DEVNULL, text=True)
    public = "".join(line for line in public.splitlines() if not line.startswith("-----"))
    out = Path("/home/harun/oggaq-development/shared/mail-dns-records.txt")
    out.write_text(f"mail._domainkey.{args.domain} TXT \"v=DKIM1; k=rsa; p={public}\"\n{args.domain} TXT \"{spf}\"\n# MX ve mevcut DMARC kaydını KORUYUN; başka kayıt oluşturmayın.\n")
    out.chmod(0o644)
    print("Yalnız herkese açık DNS değerleri: "+str(out))

if __name__ == "__main__":
    main()
