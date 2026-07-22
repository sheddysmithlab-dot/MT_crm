# Docker — Hostinger Compose (BACKEND + own MySQL)

## Paste this URL

```
https://raw.githubusercontent.com/sheddysmithlab-dot/MT_crm/main/docker-compose.yml
```

Project name: `mt-crm-api`

## Critical (your current crash)

Hostinger Environment se **DELETE** karo:

```
DATABASE_URL=...@host.docker.internal...
```

Wo value API crash karti hai. Is compose me MySQL **khud Docker ke andar** hai (`mt_crm_mysql`) — Solar CRM / dusre projects touch nahi hote.

## Environment (sirf ye rakho)

```
JWT_SECRET=long-random-secret-here
CORS_ORIGINS=https://crm.malwatrolley.com
SEED_ADMIN_EMAIL=admin@malwatrolley.com
SEED_ADMIN_PASSWORD=Malwa#8224
MTCRM_API_PORT=8010
```

Phir **Redeploy / Rebuild** (naya image `mt-crm-api:20260722b`).

## Firewall

VPS firewall me TCP **8010** allow.

## Check

```
http://200.97.171.119:8010/api/health/live
http://200.97.171.119:8010/api/health
https://crm.malwatrolley.com/api/health/live
```

Login: `admin@malwatrolley.com` / `Malwa#8224`

## Containers (isolated)

| Name | Role |
|------|------|
| `mt_crm_api` | FastAPI :8010 |
| `mt_crm_mysql` | MySQL (internal only, no host port) |
| network `mt_crm_net` | private |
| volume `mt_crm_mysql_data` | DB data |
