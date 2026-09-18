#!/bin/sh
set -e
npx prisma migrate deploy
npx prisma db execute --file prisma/sql/audit-lockdown.sql
exec "$@"
