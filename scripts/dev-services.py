#!/usr/bin/env python3
"""Manage isolated, loopback-only development services; never production data."""

import argparse
import base64
import getpass
import json
import os
from pathlib import Path
import secrets
import shutil
import socket
import subprocess
import time

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "infrastructure" / "data"
PGDATA = DATA / "postgres"
SOCKETS = DATA / "sockets"
PGPORT = 55432
REDISPORT = 56379


def executable(name, formula=None):
    for prefix in ["/opt/homebrew", "/usr/local"]:
        candidate = Path(prefix) / "opt" / (formula or name) / "bin" / name
        if candidate.is_file():
            return str(candidate)
    path = shutil.which(name)
    if path:
        return path
    raise RuntimeError(f"Eksik araç: {name}. Kurulum için docs/DEVELOPMENT.md belgesini okuyun.")


def run(args, **kwargs):
    return subprocess.run(args, check=True, capture_output=True, text=True, **kwargs)


def listening(port):
    with socket.socket() as connection:
        connection.settimeout(0.2)
        return connection.connect_ex(("127.0.0.1", port)) == 0


def private_write(path, content):
    path.write_text(content)
    path.chmod(0o600)


def credentials():
    path = DATA / "local.json"
    if not path.exists():
        private_write(path, json.dumps({
            "database_password": secrets.token_hex(24),
            "redis_password": secrets.token_hex(24),
            "app_key": "base64:" + base64.b64encode(secrets.token_bytes(32)).decode(),
        }))
    return json.loads(path.read_text())


def write_environments(values):
    template = (ROOT / "backend" / ".env.example").read_text()
    replacements = {"DB_PASSWORD": values["database_password"],
                    "REDIS_PASSWORD": values["redis_password"], "APP_KEY": values["app_key"]}
    for line in template.splitlines():
        key = line.partition("=")[0]
        if key in replacements:
            template = template.replace(line, key + "=" + replacements[key])
    for name, database in [(".env", "oggaq"), (".env.testing", "oggaq_test")]:
        path = ROOT / "backend" / name
        if not path.exists():
            private_write(path, template.replace("DB_DATABASE=oggaq\n", f"DB_DATABASE={database}\n"))


def start():
    DATA.mkdir(parents=True, exist_ok=True)
    DATA.chmod(0o700)
    SOCKETS.mkdir(exist_ok=True)
    values = credentials()
    pg_ctl = executable("pg_ctl", "postgresql@18")
    if not PGDATA.exists():
        run([executable("initdb", "postgresql@18"), "-D", str(PGDATA),
             "--encoding=UTF8", "--locale=C", "--auth-local=trust", "--auth-host=scram-sha-256"])
    running = subprocess.run([pg_ctl, "-D", str(PGDATA), "status"], capture_output=True).returncode == 0
    if not running:
        if listening(PGPORT):
            raise RuntimeError(f"{PGPORT} portu başka bir servis tarafından kullanılıyor.")
        run([pg_ctl, "-D", str(PGDATA), "-l", str(DATA / "postgres.log"), "-o",
             f"-p {PGPORT} -h 127.0.0.1 -k {SOCKETS}", "-w", "start"])
    psql = [executable("psql", "postgresql@18"), "-h", str(SOCKETS), "-p", str(PGPORT),
            "-U", getpass.getuser(), "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-tAc"]
    if run(psql + ["SELECT 1 FROM pg_roles WHERE rolname='oggaq'"]).stdout.strip() != "1":
        sql = "CREATE ROLE oggaq LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD '" + values["database_password"] + "';"
        run(psql[:-1], input=sql)
    for database in ["oggaq", "oggaq_test"]:
        if run(psql + [f"SELECT 1 FROM pg_database WHERE datname='{database}'"]).stdout.strip() != "1":
            run([executable("createdb", "postgresql@18"), "-h", str(SOCKETS), "-p", str(PGPORT),
                 "-U", getpass.getuser(), "--owner=oggaq", database])
    redis_config = DATA / "redis.conf"
    private_write(redis_config, f"bind 127.0.0.1\nport {REDISPORT}\nprotected-mode yes\n"
                  f"requirepass {values['redis_password']}\ndir {DATA}\nappendonly yes\n"
                  f"daemonize yes\npidfile {DATA / 'redis.pid'}\nlogfile {DATA / 'redis.log'}\n")
    if not listening(REDISPORT):
        run([executable("redis-server", "redis"), str(redis_config)])
    redis_env = {**os.environ, "REDISCLI_AUTH": values["redis_password"]}
    run([executable("redis-cli", "redis"), "-p", str(REDISPORT), "PING"], env=redis_env)
    if not listening(51025):
        log = (DATA / "mailpit.log").open("a")
        process = subprocess.Popen([executable("mailpit"), "--listen", "127.0.0.1:58025",
                                    "--smtp", "127.0.0.1:51025", "--database", str(DATA / "mailpit.db")],
                                   stdout=log, stderr=log, start_new_session=True)
        (DATA / "mailpit.pid").write_text(str(process.pid))
        log.close()
        for _ in range(30):
            if listening(51025):
                break
            time.sleep(0.1)
        if not listening(51025):
            raise RuntimeError("Mailpit başlayamadı; infrastructure/data/mailpit.log dosyasını inceleyin.")
    write_environments(values)
    print("PostgreSQL :55432, Redis :56379 ve Mailpit :58025 hazır. Gizli değerler yerelde tutuluyor.")


def stop():
    if not DATA.exists():
        return
    if (PGDATA / "postmaster.pid").exists():
        run([executable("pg_ctl", "postgresql@18"), "-D", str(PGDATA), "-m", "fast", "-w", "stop"])
    if (DATA / "redis.pid").exists():
        values = credentials()
        run([executable("redis-cli", "redis"), "-p", str(REDISPORT), "SHUTDOWN"],
            env={**os.environ, "REDISCLI_AUTH": values["redis_password"]})
    pid = DATA / "mailpit.pid"
    if pid.exists():
        process_command = subprocess.run(["ps", "-p", pid.read_text().strip(), "-o", "command="],
                                         capture_output=True, text=True).stdout.strip()
        if process_command and ("mailpit" not in process_command or str(DATA / "mailpit.db") not in process_command):
            raise RuntimeError("Mailpit PID'si başka bir sürece ait; güvenlik nedeniyle durdurulmadı.")
        try:
            os.kill(int(pid.read_text()), 15)
        except ProcessLookupError:
            pass
        for _ in range(50):
            if not listening(51025) and not listening(58025):
                break
            time.sleep(0.1)
        if listening(51025) or listening(58025):
            raise RuntimeError("Mailpit henüz kapanmadı; yeniden başlatmadan önce durumu kontrol edin.")
        pid.unlink()
    print("Projeye ait servisler durduruldu; geliştirme verileri korundu.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["start", "stop", "status"])
    action = parser.parse_args().action
    if action == "start":
        start()
    elif action == "stop":
        stop()
    else:
        for name, port in [("PostgreSQL", PGPORT), ("Redis", REDISPORT), ("Mailpit", 58025)]:
            print(f"{name}: {'açık' if listening(port) else 'kapalı'} ({port})")
