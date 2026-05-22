# BRANYA Artist Website

One-page artist website with secure admin dashboard, PostgreSQL persistence, and deployment behind an existing VPS Caddy.

## Stack

- Next.js 16 (App Router), TypeScript
- Prisma + PostgreSQL
- Admin auth with HttpOnly session cookie (server-side)
- Zod validation/sanitization for admin payloads
- Rate limits + security headers in `src/proxy.ts`
- Docker Compose (`app` + `postgres`)

## Main URLs

- Site: `/`
- Admin login: `/admin/login`
- Admin dashboard: `/admin/dashboard`
- Health: `/api/health`

## Admin Demo Credentials

- Login: `admin`
- Password: `Branya2026!Admin`

Credentials are read from `.env` (`ADMIN_USERNAME`, `ADMIN_PASSWORD`).

## Local Run (Docker)

1. Copy env:

```bash
cp .env.example .env
```

2. Start containers:

```bash
docker compose up --build -d
```

3. Open:

- `http://localhost:3000`
- `http://localhost:3000/admin/login`

4. Health check:

```bash
curl http://localhost:3000/api/health
```

Expected:

```json
{ "ok": true, "db": true }
```

## Deploy On VPS (with existing Caddy)

1. Clone project and prepare env:

```bash
cp .env.example .env
```

2. Update **required** values in `.env`:

- `SITE_PUBLIC_URL=https://your-domain.com`
- `ADMIN_PASSWORD` (change default)
- `SESSION_SECRET` (long random secret)
- `POSTGRES_PASSWORD`
- `DATABASE_URL` (must match DB credentials)

3. Start app + db:

```bash
docker compose up -d --build
```

4. Add site block to your **existing** Caddy config:

```caddyfile
your-domain.com {
  encode gzip zstd

  reverse_proxy 127.0.0.1:3000 {
    header_up Host {host}
    header_up X-Forwarded-Host {host}
    header_up X-Forwarded-Proto {scheme}
    header_up X-Forwarded-For {remote_host}
  }
}
```

5. Reload Caddy:

```bash
sudo caddy reload --config /etc/caddy/Caddyfile
```

6. Verify:

- `https://your-domain.com`
- `https://your-domain.com/admin/login`
- `https://your-domain.com/api/health`

## Notes About Login/DB

- App container always connects to DB service `postgres:5432` (compose overrides local env host values).
- Startup waits for DB and applies schema before Next.js start (`scripts/start.sh`).
- If DB is temporarily unavailable, admin shows a styled Russian error panel with retry button instead of raw text.

## Security

- `/admin/dashboard` protected server-side.
- All `/api/admin/*` endpoints require session (except `/api/admin/login`).
- Login/API rate limits enabled.
- JSON payload size guarded.
- Admin text/url/color fields validated server-side.

## Useful Commands

```bash
npm run lint
npm run typecheck
npm run build
npm run db:generate
npm run db:push
npm run db:seed
```
