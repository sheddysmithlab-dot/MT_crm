#!/usr/bin/env python3
from pathlib import Path

p = Path("/docker/shared-edge/Caddyfile")
text = p.read_text()
marker = "handle_path /mt-crm-api/*"
if marker in text:
    print("already patched")
else:
    old = "crm.ecomalwa.com {\n\treverse_proxy 172.17.0.1:8080\n}"
    new = (
        "crm.ecomalwa.com {\n"
        "\thandle_path /mt-crm-api/* {\n"
        "\t\treverse_proxy 172.17.0.1:8015\n"
        "\t}\n"
        "\thandle {\n"
        "\t\treverse_proxy 172.17.0.1:8080\n"
        "\t}\n"
        "}"
    )
    if old not in text:
        raise SystemExit("crm.ecomalwa.com block not found as expected")
    p.write_text(text.replace(old, new, 1))
    print("patched crm.ecomalwa.com")
print(p.read_text())
