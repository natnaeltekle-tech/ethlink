# Eth-Links

Ethiopian AI service marketplace built with Next.js App Router, Supabase, Capacitor PWA, Gemini, Chapa escrow payments, realtime chat, Tailwind, and Shadcn-style UI primitives.

## Architecture

- **App**: Next.js App Router with server actions for bookings, listings, payments, chat, and admin workflows.
- **Data**: Supabase Postgres with RLS, storage, realtime messages, and SQL migrations in `supabase/migrations`.
- **Payments**: Chapa checkout and webhook confirmation. Booking payment confirmation is idempotent through `processed_payments.tx_ref` and the atomic `process_payment_confirmation` RPC.
- **Escrow**: Paid bookings hold provider earnings until the customer completes the job or an admin resolves a dispute.
- **AI**: Gemini-powered search extraction with rule-based fallback and durable `ai_logs` observability.
- **PWA**: Capacitor-ready installable web app with runtime caching and an offline banner.

## Environment

Copy `.env.example` to `.env.local` and set real values.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=

ADMIN_EMAIL=
NEXT_PUBLIC_BASE_URL=http://localhost:3000

GOOGLE_API_KEY=
GEMINI_MODEL_VERSION=gemini-pro
AI_TEMPERATURE=0.7
AI_MAX_TOKENS=2048
AI_TOP_P=0.9
AI_TOP_K=40

CHAPA_SECRET_KEY=
CHAPA_WEBHOOK_SECRET=
TELEBIRR_PUBLIC_KEY=
CBE_BIRR_SECRET=

UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=
```

## Local Setup

```bash
npm install
npm run dev
```

Run Supabase migrations before testing payment or AI observability flows:

```bash
supabase db push
```

## Quality Checks

```bash
npx tsc --noEmit
npm run lint
npm test
npm run build
```

## Deployment

1. Set all production env vars in the hosting platform.
2. Apply Supabase migrations, especially `processed_payments`, `payment_webhook_events`, `ai_logs`, and escrow dispute statuses.
3. Configure Chapa callback/webhook URL to `${NEXT_PUBLIC_BASE_URL}/api/payment/callback`.
4. Verify webhook signing secrets are present; unsigned callbacks are rejected.
5. Run `npm run verify:prod`, `npm test`, and a production build before release.

## Money-Flow Notes

- Payment confirmation is safe to retry. Duplicate `tx_ref` values return `already_processed`.
- Webhook events are logged to `payment_webhook_events` for auditability.
- Admin escrow resolution uses `resolveEscrowDispute` to either release funds to the provider (`completed`) or mark a refund (`refunded`).
- API/payment routes are network-only in the service worker to avoid stale payment state.