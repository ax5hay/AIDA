#!/bin/sh
set -e
cd /app/packages/db
echo "==> Prisma: db push"
npx prisma db push
echo "==> Prisma: seed"
npx prisma db seed
echo "==> Starting API on 0.0.0.0:${API_PORT:-4000}"
exec node /app/apps/api/dist/main.js
