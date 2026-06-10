#!/usr/bin/env bash
# Lokal .env dosyalarından Render/Vercel için kopyala-yapıştır env listesi üretir.
# Kullanım: ./scripts/print-deploy-env.sh [VERCEL_URL] [RENDER_URL]
# Örnek:    ./scripts/print-deploy-env.sh https://zerdali-app.vercel.app https://zerdali-api.onrender.com

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERCEL_URL="${1:-https://SENIN-APP.vercel.app}"
RENDER_URL="${2:-https://SENIN-API.onrender.com}"

if [[ ! -f "$ROOT/backend/.env" ]]; then
  echo "Hata: backend/.env bulunamadı" >&2
  exit 1
fi

# shellcheck disable=SC1091
source "$ROOT/backend/.env"

echo "=== RENDER (backend) — Environment Variables ==="
echo "SUPABASE_URL=$SUPABASE_URL"
echo "SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY"
echo "SUPABASE_SERVICE_KEY=$SUPABASE_SERVICE_KEY"
echo "SUPABASE_JWT_SECRET=$SUPABASE_JWT_SECRET"
echo "SECRET_KEY=$SECRET_KEY"
echo "CORS_ORIGINS=$VERCEL_URL"
echo "PASSWORD_RESET_REDIRECT_URL=$VERCEL_URL/reset-password"
echo ""
echo "=== VERCEL (frontend) — Environment Variables ==="
echo "NEXT_PUBLIC_API_URL=$RENDER_URL"
echo "NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL"
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY"
echo ""
echo "=== SUPABASE — Authentication → URL Configuration ==="
echo "Site URL: $VERCEL_URL"
echo "Redirect URLs: $VERCEL_URL/reset-password"
