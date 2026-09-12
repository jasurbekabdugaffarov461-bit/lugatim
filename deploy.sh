#!/usr/bin/env bash
# Lug'atim loyihasini Docker orqali ishga tushirish/yangilash skripti.
# Ishlatish:  ./deploy.sh

set -euo pipefail
cd "$(dirname "$0")"

info()  { printf '\033[1;34m[i]\033[0m %s\n' "$1"; }
ok()    { printf '\033[1;32m[✓]\033[0m %s\n' "$1"; }
warn()  { printf '\033[1;33m[!]\033[0m %s\n' "$1"; }
fail()  { printf '\033[1;31m[x]\033[0m %s\n' "$1"; exit 1; }

# --- 1) Docker mavjudligini tekshirish ---------------------------------
command -v docker >/dev/null 2>&1 || fail "Docker topilmadi. Avval Docker'ni o'rnating: https://docs.docker.com/engine/install/"

if docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE="docker-compose"
else
  fail "Docker Compose topilmadi. Docker Desktop yoki 'docker-compose-plugin' o'rnating."
fi

docker info >/dev/null 2>&1 || fail "Docker demoni ishlamayapti. 'sudo systemctl start docker' bilan ishga tushiring."

# --- 2) .env faylini tayyorlash -----------------------------------------
if [ ! -f .env ]; then
  info ".env fayli topilmadi, .env.example asosida yaratilmoqda..."
  cp .env.example .env

  # JWT_SECRET ni tasodifiy qiymat bilan avtomatik to'ldiramiz
  RANDOM_SECRET=$(openssl rand -hex 32 2>/dev/null || node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  if [ -n "$RANDOM_SECRET" ]; then
    sed -i.bak "s#^JWT_SECRET=.*#JWT_SECRET=${RANDOM_SECRET}#" .env && rm -f .env.bak
  fi

  ok ".env yaratildi."
fi

# --- 3) Build va ishga tushirish -----------------------------------------
info "Docker image'lar qurilmoqda va konteynerlar ishga tushirilmoqda..."
$COMPOSE up -d --build

echo
ok "Loyiha ishga tushdi!"
$COMPOSE ps

echo
SERVER_PORT=$(grep -E '^SERVER_PORT=' .env | cut -d= -f2 || echo 4000)
info "Backend: http://localhost:${SERVER_PORT:-4000}/api/health"
info "Mobil ilovadagi EXPO_PUBLIC_API_URL ni shu serverning haqiqiy domeni yoki ochiq IP manziliga o'rnating"
info "(masalan http://SIZNING_IP:${SERVER_PORT:-4000}/api yoki https://api.domeningiz.uz/api), so'ng APK'ni qayta quring."
info "Loglarni ko'rish: $COMPOSE logs -f"
info "To'xtatish:       $COMPOSE down"
