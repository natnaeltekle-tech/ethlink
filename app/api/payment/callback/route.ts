/**
 * Old Chapa callback URL (kept so webhooks configured in the Chapa dashboard
 * before the escrow ledger keep working). Same handler as /api/webhooks/chapa.
 */
export { POST, GET } from '@/app/api/webhooks/chapa/route'
export const dynamic = 'force-dynamic'
