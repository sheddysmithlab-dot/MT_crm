# Hostinger VPS Deploy (Phase 10)

## 1. Server packages

```bash
sudo apt update
sudo apt install -y nginx python3 python3-venv python3-pip mysql-server certbot python3-certbot-nginx
```

## 2. App directories

```bash
sudo mkdir -p /var/www/malwa-crm
# upload/clone project here
cd /var/www/malwa-crm/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# edit DATABASE_URL, JWT_SECRET, CORS_ORIGINS
python -m scripts.seed_admin
```

## 3. systemd service

`/etc/systemd/system/malwa-crm-api.service`:

```ini
[Unit]
Description=Malwa CRM API
After=network.target mysql.service

[Service]
User=www-data
WorkingDirectory=/var/www/malwa-crm/backend
Environment="PATH=/var/www/malwa-crm/backend/.venv/bin"
ExecStart=/var/www/malwa-crm/backend/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now malwa-crm-api
```

## 4. Frontend build

```bash
cd /var/www/malwa-crm
# set .env.production:
#   VITE_API_URL=https://crm.malwatrolley.com/api
#   VITE_USE_API=true
npm ci
npm run build
```

## 5. Nginx

```nginx
server {
    server_name crm.malwatrolley.com;

    root /var/www/malwa-crm/dist;
    index index.html;

    # Docker backend-only Compose maps host 8010 → container 8000
    location /api/ {
        proxy_pass http://127.0.0.1:8010/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
sudo certbot --nginx -d crm.malwatrolley.com
```

## 6. Backup cron

```bash
0 2 * * * mysqldump -u crm_user -p'PASSWORD' malwa_crm | gzip > /var/backups/malwa_crm_$(date +\%F).sql.gz
```
