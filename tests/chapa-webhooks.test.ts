import { createHmac } from 'crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const approvePayout = vi.fn()
const settleCharge = vi.fn()
const settlePayout = vi.fn()
vi.mock('@/lib/escrow/service', () => ({ approvePayout, settleCharge, settlePayout, EscrowError: class EscrowError extends Error {} }))

process.env.CHAPA_SECRET_KEY = ''
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test'
const { signSandboxPayload } = await import('@/lib/chapa')
const approval = await import('@/app/api/webhooks/chapa/transfer-approval/route')
const webhook = await import('@/app/api/webhooks/chapa/route')
const legacy = await import('@/app/api/payment/callback/route')

const REF = 'POabcdefghijklmnop'
function req(url: string, body: unknown, headers: Record<string, string>) {
    const raw = JSON.stringify(body)
    return new Request(url, { method: 'POST', body: raw, headers: { 'content-type': 'application/json', ...headers } }) as never
}
const signed = (body: unknown, purpose: 'webhook' | 'transfer-approval') => signSandboxPayload(JSON.stringify(body), purpose)

beforeEach(() => vi.clearAllMocks())

describe('transfer approval webhook', () => {
    const url = 'http://t/api/webhooks/chapa/transfer-approval'
    it('200 only for a signed request about a pending payout', async () => {
        approvePayout.mockResolvedValue(true)
        const body = { reference: REF, amount: '100.00' }
        const res = await approval.POST(req(url, body, signed(body, 'transfer-approval')))
        expect(res.status).toBe(200)
        expect(approvePayout).toHaveBeenCalledWith(REF)
    })
    it('400 for an invalid signature', async () => {
        const body = { reference: REF }
        const res = await approval.POST(req(url, body, { 'x-chapa-signature': createHmac('sha256', 'nope').update(JSON.stringify(body)).digest('hex') }))
        expect(res.status).toBe(400)
        expect(approvePayout).not.toHaveBeenCalled()
    })
    it('400 when signed with the payment webhook secret instead', async () => {
        const body = { reference: REF }
        expect((await approval.POST(req(url, body, signed(body, 'webhook')))).status).toBe(400)
    })
    it('400 for unknown or already-processed references', async () => {
        approvePayout.mockResolvedValue(false)
        const body = { reference: REF }
        expect((await approval.POST(req(url, body, signed(body, 'transfer-approval')))).status).toBe(400)
        const bad = { reference: 'not-ours' }
        expect((await approval.POST(req(url, bad, signed(bad, 'transfer-approval')))).status).toBe(400)
    })
})

describe('payment webhook', () => {
    const url = 'http://t/api/webhooks/chapa'
    it('401 for a bad signature, nothing settled', async () => {
        const res = await webhook.POST(req(url, { tx_ref: 'ELx', status: 'success' }, { 'x-chapa-signature': 'deadbeef' }))
        expect(res.status).toBe(401)
        expect(settleCharge).not.toHaveBeenCalled()
    })
    it('signed charge → settleCharge with the outcome', async () => {
        settleCharge.mockResolvedValue({ outcome: 'paid' })
        const body = { event: 'charge.success', tx_ref: 'ELabcdefghijklmnop', status: 'success' }
        const res = await webhook.POST(req(url, body, signed(body, 'webhook')))
        expect(res.status).toBe(200)
        expect(settleCharge).toHaveBeenCalledWith('ELabcdefghijklmnop', 'success')
    })
    it('signed payout events → settlePayout', async () => {
        settlePayout.mockResolvedValue('failed')
        const body = { event: 'payout.failed', type: 'Payout', status: 'failed', reference: REF, reason: 'closed' }
        const res = await webhook.POST(req(url, body, signed(body, 'webhook')))
        expect(res.status).toBe(200)
        expect(settlePayout).toHaveBeenCalledWith(REF, false, null, 'closed')
    })
    it('the old /api/payment/callback URL uses the same handler', async () => {
        settleCharge.mockResolvedValue({ outcome: 'already_processed' })
        const body = { tx_ref: 'ELabcdefghijklmnop', status: 'success' }
        expect((await legacy.POST(req('http://t/api/payment/callback', body, signed(body, 'webhook')))).status).toBe(200)
    })
    it('5xx on internal failure so Chapa retries', async () => {
        settleCharge.mockRejectedValue(new Error('db down'))
        const body = { tx_ref: 'ELabcdefghijklmnop', status: 'success' }
        expect((await webhook.POST(req(url, body, signed(body, 'webhook')))).status).toBe(500)
    })
})
