# Nyeri Content Creators of the Year

Next.js App Router, TypeScript, Tailwind CSS, Prisma, and MySQL voting application with **PayHero Kenya** and **M-Pesa Daraja STK Push** payment integrations.

## Setup

1. Install Node.js 20.9 or newer and MySQL 8.0.16 or newer (Laragon's MySQL 8.4 is supported).
2. Copy `.env.example` to `.env` and set `DATABASE_URL` and your payment credentials.
3. Install packages with `npm install`.
4. Generate the Prisma client and apply migrations:
   ```bash
   npm run db:generate
   npm run db:deploy # or npm run db:migrate during development
   ```
5. Seed categories:
   ```bash
   npm run db:seed
   ```
6. Start the development server:
   ```bash
   npm run dev
   ```

---

## Payment Gateway: PayHero Kenya Integration

This application supports **PayHero Kenya** (`https://app.payhero.co.ke`) as the primary payment gateway for M-Pesa STK Push.

### PayHero Configuration (`.env`)

```env
PAYMENT_PROVIDER="payhero"

# PayHero API credentials (Dashboard -> API Keys)
PAYHERO_API_KEY="your-payhero-api-key"
# Or provide username and password:
# PAYHERO_API_USERNAME=""
# PAYHERO_API_PASSWORD=""

# Payment Channel ID (from PayHero Dashboard -> Payment Channels)
PAYHERO_CHANNEL_ID="133"

# Webhook Callback Token and URL
PAYHERO_CALLBACK_TOKEN="replace-with-a-long-random-secret-at-least-32-chars"
PAYHERO_CALLBACK_URL="https://your-public-domain.example/api/payhero/callback?token=replace-with-a-long-random-secret-at-least-32-chars"
```

### PayHero Features

- **STK Push Automation**: Voter enters their phone number (`07XXXXXXXX` or `01XXXXXXXX`). PayHero dispatches an automated prompt to their phone.
- **Webhook Callback Processing** (`/api/payhero/callback`):
  - Authenticated with a secure token.
  - Automatically matches `ExternalReference` to the internal vote transaction.
  - Records the official M-Pesa receipt number and atomically awards votes in a single database transaction.
  - Idempotent: repeated callbacks cannot double-credit votes.
- **Direct Status Polling Fallback**:
  - The voting modal polls `/api/votes/[transactionId]`.
  - While pending, the endpoint automatically queries PayHero's transaction status API (`/api/v2/transaction-status`).
  - This allows instant vote confirmation even in local development without public webhooks!

---

## Vote purchase flow

`POST /api/votes/initiate` JSON body:

```json
{
  "nomineeId": "nominee-id",
  "phoneNumber": "0712345678",
  "numberOfVotes": 10
}
```

1. The server normalizes Kenyan mobile numbers to `2547XXXXXXXX` or `2541XXXXXXXX`.
2. Calculates `amount = numberOfVotes * votePrice` (default KES 10 per vote).
3. Records a pending transaction in MySQL.
4. Requests STK Push via PayHero (or Daraja if configured).
5. Returns `202 Accepted` with internal `transactionId` and `PENDING` status.
6. The voter completes the PIN prompt on their phone.
7. Payment is confirmed either via PayHero webhook or background status polling, instantly updating the nominee and category vote tallies.

---

## Admin setup

1. Set `JWT_SECRET` to a random secret of at least 32 characters in `.env`.
2. Set `ADMIN_BOOTSTRAP_EMAIL` and `ADMIN_BOOTSTRAP_PASSWORD` (at least 12 characters) in `.env`.
3. Run admin bootstrap:
   ```bash
   npm run admin:create
   ```
4. Sign in at `/admin/login`.
5. Remove bootstrap credentials from `.env` once created.

Sessions use HTTP-only, SameSite strict JWT cookies. Moderators can manage profile content and review the ledger; super admins can globally pause voting, pause a category, reorder/delete categories, or adjust votes. Every manual vote adjustment requires a reason and is stored in `vote_adjustments`.
