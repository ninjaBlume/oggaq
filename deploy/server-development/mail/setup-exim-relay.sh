#!/usr/bin/env bash
# Root: scoped application relay and DKIM; existing MX and DMARC are preserved.
# sudo bash setup-exim-relay.sh --check --existing-spf 'v=spf1 include:_spf.mx.cloudflare.net ~all'
# Remove --check only after the preflight. The neighbouring Python file must be present.
set -Eeuo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec python3 "$here/exim_relay.py" "$@"
