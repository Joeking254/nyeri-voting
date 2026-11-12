# Production Deployment & Security Checklist

## Required Environment

Set secrets in the hosting provider's environment settings, not in Git. Use separate values for preview/staging and production.

### Database & General
- `DATABASE_URL`: MySQL 8.0.16+ connection URL. Use Laragon's `mysql://root:PASSWORD@127.0.0.1:3306/nyeri_voting` locally; use a TLS-enabled MySQL-compatible managed endpoint in production.
- `NEXT_PUBLIC_APP_URL`: canonical public origin, HTTPS only.
- `JWT_SECRET`: random signing secret of at least 32 characters; generate with `openssl rand -base64 48`.
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`: required in production for shared IP and phone throttling. The STK route fails closed with 503 if these are unavailable.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`: required for production nominee portrait uploads. Local development falls back to ignored files in `public/uploads`; do not use that ephemeral filesystem on Vercel/Netlify.

### PayHero Kenya Configuration (Recommended Gateway)
- `PAYMENT_PROVIDER`: `"payhero"` (default)
- `PAYHERO_API_KEY`: API token from PayHero Dashboard -> API Keys (or set `PAYHERO_API_USERNAME` and `PAYHERO_API_PASSWORD`).
- `PAYHERO_CHANNEL_ID`: Channel ID from PayHero Dashboard -> Payment Channels (e.g. `133`).
- `PAYHERO_CALLBACK_TOKEN`: Random callback secret of at least 32 characters.
- `PAYHERO_CALLBACK_URL`: Exact public URL: `https://your-domain.example/api/payhero/callback?token=...`

### Safaricom Daraja Alternative (Optional)
- `PAYMENT_PROVIDER`: `"daraja"`
- `MPESA_CALLBACK_URL`: exact public `/api/mpesa/callback?token=...` URL; use a random callback token of at least 32 characters.
- `MPESA_CALLBACK_TOKEN`: the same high-entropy callback token. Keep it out of access logs and monitoring URLs.
- `MPESA_BASE_URL`: `https://sandbox.safaricom.co.ke` for sandbox; `https://api.safaricom.co.ke` for live.
- `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_PASSKEY`, `MPESA_SHORTCODE`, `MPESA_TRANSACTION_TYPE`: Daraja credentials and shortcode for the selected environment.

The repository `.env.production.example` is a variable template only. Copy values into the provider's secret manager; do not commit a populated `.env.production`.

## Database & Host Setup

1. Provision MySQL 8.0.16+ with TLS, automated backups, and point-in-time recovery. Supabase provides PostgreSQL, which is not compatible with this MySQL Prisma schema; use a MySQL-compatible managed service for hosted production.
2. Add all required variables to Vercel Production (and Preview separately) or Netlify Production/Deploy Preview. Set `NODE_ENV=production` through the platform; do not override the platform's managed value unnecessarily.
3. Run migrations from a trusted deployment job with `DATABASE_URL` available: `npm run db:deploy`. Do not run `prisma migrate dev` from a production deployment.
4. Bootstrap the first admin once from a secure environment after migrations: set `ADMIN_BOOTSTRAP_EMAIL` and `ADMIN_BOOTSTRAP_PASSWORD`, run `npm run admin:create`, then remove those bootstrap values. Use an individual password manager-generated password.
5. Deploy the Next.js app. Vercel detects Next.js automatically. On Netlify, use the Next.js runtime/plugin integration and set the build command to `npm run build`; preserve App Router route handlers and middleware support.
6. Configure PayHero's (or Daraja's) live callback URL to the deployed HTTPS endpoint with token parameter. Protect query strings in CDN, proxy, function, analytics, and error-monitoring logs.
7. Verify `/api/payhero/callback?token=...` (or `/api/mpesa/callback?token=...`) with a `GET`; it should return `204`. A missing/wrong token should return `401`. Never expose the callback token in a public status page.
8. Log in to `/admin`, then run `npm run prelaunch:check` from a secured operator environment with `ADMIN_HEALTH_EMAIL` and `ADMIN_HEALTH_PASSWORD` temporarily supplied. It checks direct DB connectivity, callback ping, admin login/session, and readiness flags. Do not retain operator passwords in CI logs.

## Payment Testing Plan

1. In PayHero dashboard, register a test payment channel or request test credits.
2. Initiate a vote purchase from the voting modal with a test number (e.g. `0712345678` or `0112345678`).
3. Complete the payment. Verify:
   - The pending transaction transitions to `SUCCESS`.
   - The M-Pesa receipt number is saved in the database.
   - The nominee's `totalVotes` and category's `totalVotes` increment atomically by the purchased vote quantity.
   - Status polling in `/api/votes/[transactionId]` updates the voter's screen to the confirmed state.
4. Test a cancelled or rejected prompt: verify status transitions to `FAILED` and no votes are awarded.
5. Verify replay protection: replaying the webhook callback does not award additional votes.

## Launch QA

- Run `npm run lint`, `npx prisma validate`, `npm run db:deploy`, `npm run build`, and the protected `npm run prelaunch:check`.
- Verify the public page and admin flows at 320px, 375px, 768px, and desktop widths; test keyboard navigation, dialog focus/escape, reduced motion, validation errors, and screen-reader labels.
- Load test read-heavy nominee/leaderboard pages and mixed STK initiation at expected peak concurrency in staging.
- Track API latency, database pool saturation, 429/503 rates, callback 4xx/5xx, pending payment age, receipt uniqueness failures, and vote-counter reconciliation. Alert on callback failures and sustained pending transactions.
- Confirm DB backups/PITR, rollback/redeploy procedure, support contact, and incident ownership before sharing the public vote link.
