# Deploying to the DigitalOcean droplet

One-time setup (Ubuntu droplet, as root or sudo):

```bash
# 1. Docker
curl -fsSL https://get.docker.com | sh

# 2. Clone the repo
git clone https://github.com/notsatoshii/innovlabs.git /opt/funnel
cd /opt/funnel

# 3. Environment (never committed)
cp .env.example .env
nano .env   # fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, ANTHROPIC_API_KEY

# 4. Build + run
docker compose up -d --build

# 5. nginx + TLS
apt install -y nginx certbot python3-certbot-nginx
cp deploy/nginx.conf /etc/nginx/sites-available/funnel   # edit YOUR_DOMAIN first
ln -s /etc/nginx/sites-available/funnel /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d YOUR_DOMAIN
```

Each release:

```bash
cd /opt/funnel && git pull && docker compose up -d --build
```

After the first deploy, update Supabase (Authentication -> URL Configuration):
- Site URL: https://YOUR_DOMAIN
- Additional redirect URLs: https://YOUR_DOMAIN/auth/callback
(keep http://localhost:3000 entries for local dev)
