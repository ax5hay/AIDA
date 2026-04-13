#!/bin/sh
set -e
cd /app/packages/db
echo "==> Prisma: db push"
npx prisma db push
if [ "${SEED_ON_STARTUP:-false}" = "true" ]; then
  echo "==> Prisma: seed (SEED_ON_STARTUP=true)"
  npx prisma db seed
else
  echo "==> Prisma: seed skipped (set SEED_ON_STARTUP=true to enable)"
fi
echo "==> Starting API on 0.0.0.0:${API_PORT:-4000}"
exec node /app/apps/api/dist/main.js
