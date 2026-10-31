# Eth-Links

**Prototype** of an Ethiopian AI service marketplace (Next.js App Router, Supabase, Capacitor, Gemini, Tailwind).

Live payments (Chapa) are **coming soon** — the product runs in **simulation mode** until compliance and Chapa go-live are complete. Core flows (browse, book, chat, provider tools) work for demos and early users.

## Architecture

- **App**: Next.js App Router with server actions for bookings, listings, payments, chat, and admin workflows.
- **Data**: Supabase Postgres with RLS, storage, realtime messages, and SQL migrations in `supabase/migrations`.
- **Payments**: Simulation by default (`PAYMENT_MODE=simulation`). Live Chapa checkout + webhook path is implemented and ready when keys and regs allow.
- **Escrow design**: Paid bookings can hold provider earnings until the customer completes the job or an admin resolves a dispute (activates fully with live payments).
- **AI**: Gemini-powered search extraction with rule-based fallback.
- **PWA / Android**: Capacitor loads the live site in a WebView.

## Environment

Copy `.env.example` to `.env.local` and set real values. Never commit secrets.

See `.env.example` for the full list (Supabase, admin, Gemini, `PAYMENT_MODE`, Chapa, Upstash, Sentry, Resend).

## Local Setup

```bash
npm install
npm run dev
```

```bash
npm run security:check
npm test
npm run build
```

## Deployment

1. Set production env vars on Vercel (no secrets in git).
2. Apply Supabase migrations as needed.
3. Keep `PAYMENT_MODE=simulation` until Chapa is live; then set `PAYMENT_MODE=live` and webhook URL to `${NEXT_PUBLIC_BASE_URL}/api/payment/callback`.
4. Optional: Upstash for distributed rate limits; Sentry DSN for error monitoring.

## Positioning

Present as a **working prototype**: product foundation is live; **real payments coming soon**.
