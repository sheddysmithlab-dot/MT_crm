# VPS 200.97.171.119 — port map (scanned 2026-07-22)

| Port | Status | Project / Service |
|------|--------|-------------------|
| 22 | OPEN | SSH |
| 80 | OPEN | Caddy → HTTPS redirect |
| 443 | OPEN | Caddy (main sites) |
| 8080 | OPEN | **Malwa Solar CRM** (other project — do not touch) |
| 8000 | closed | free |
| 8010 | closed | free (not used) |
| **8015** | reserved | **Malwa Workshop CRM API** (`mt_crm_api`) ← this project |
| 3000,3306,9000… | closed | free |

Rule: Workshop CRM uses **8015 only**. Never reuse 8080 (Solar).
