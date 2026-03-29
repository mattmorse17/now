#!/bin/bash
set -e

# ============================================
# Now Platform — Deploy Script
# ============================================
# Prerequisites:
#   - Node.js 18+ on VPS
#   - nginx installed
#   - SSL cert (certbot/letsencrypt)
#   - Supabase project created
#   - .env file configured from .env.example
# ============================================

DOMAIN="${DOMAIN:-yourdomain.com}"
APP_DIR="/opt/now-platform"
NGINX_CONF="/etc/nginx/sites-available/now-platform"

echo "==> Now Platform Deploy"
echo "    Domain: $DOMAIN"
echo ""

# ---- 1. System dependencies ----
echo "==> Installing system dependencies..."
apt-get update -qq
apt-get install -y -qq nginx certbot python3-certbot-nginx nodejs npm 2>/dev/null || true

# Install Node.js 20 if not present
if ! node -v 2>/dev/null | grep -q "v20\|v21\|v22"; then
  echo "==> Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

# ---- 2. Deploy app ----
echo "==> Deploying application..."
mkdir -p $APP_DIR
cp -r . $APP_DIR/
cd $APP_DIR

# Install & build
echo "==> Installing dependencies..."
npm install

echo "==> Building application..."
npm run build

# ---- 3. Supabase migrations ----
echo "==> Running database migrations..."
echo "    Run these in your Supabase SQL editor:"
echo "    1. supabase/migrations/001_schema.sql"
echo "    2. supabase/migrations/002_rls.sql"
echo "    3. supabase/migrations/003_functions.sql"
echo ""
echo "    Or use Supabase CLI:"
echo "    npx supabase db push"
echo ""

# ---- 4. Create Supabase storage buckets ----
echo "==> Storage buckets to create in Supabase dashboard:"
echo "    - org-assets (public)"
echo "    - org-content (private)"
echo "    - voice-intros (private)"
echo ""

# ---- 5. Nginx config ----
echo "==> Configuring nginx..."
cat > $NGINX_CONF << 'NGINX'
server {
    listen 80;
    server_name DOMAIN_PLACEHOLDER;

    root /opt/now-platform/dist;
    index index.html;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;

    # Cache static assets
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Service worker - no cache
    location /sw.js {
        expires off;
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }

    # API proxy to Supabase Edge Functions (if using)
    location /api/ {
        proxy_pass https://YOUR_SUPABASE_PROJECT.supabase.co/functions/v1/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://js.stripe.com https://www.gstatic.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.deepgram.com wss://api.deepgram.com https://*.stripe.com https://fcm.googleapis.com; img-src 'self' data: blob: https://*.supabase.co; style-src 'self' 'unsafe-inline' https://api.fontshare.com; font-src 'self' https://cdn.fontshare.com; frame-src https://js.stripe.com https://hooks.stripe.com;" always;
}
NGINX

# Replace domain placeholder
sed -i "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" $NGINX_CONF

# Enable site
ln -sf $NGINX_CONF /etc/nginx/sites-enabled/now-platform
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

# Test & reload nginx
nginx -t
systemctl reload nginx

# ---- 6. SSL ----
echo "==> Setting up SSL..."
certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN 2>/dev/null || {
  echo "    SSL setup failed. Run manually:"
  echo "    certbot --nginx -d $DOMAIN"
}

# ---- 7. Summary ----
echo ""
echo "============================================"
echo "  Now Platform deployed!"
echo "============================================"
echo ""
echo "  URL: https://$DOMAIN"
echo ""
echo "  Next steps:"
echo "  1. Run Supabase migrations (SQL files in supabase/migrations/)"
echo "  2. Create storage buckets: org-assets, org-content, voice-intros"
echo "  3. Configure Supabase Auth providers (Google, email)"
echo "  4. Set up Stripe products & webhooks"
echo "  5. Configure Firebase Cloud Messaging"
echo "  6. Set up Supabase Edge Functions for /api/ endpoints"
echo ""
echo "  Supabase Edge Functions needed:"
echo "    - stripe/create-checkout"
echo "    - stripe/create-member-checkout"
echo "    - stripe/create-portal"
echo "    - stripe/webhook"
echo "    - notifications/send-push"
echo ""
echo "  OpenClaw API should be running at:"
echo "    $VITE_OPENCLAW_API_URL"
echo ""
echo "============================================"
