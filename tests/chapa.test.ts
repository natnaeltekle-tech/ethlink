import { createHmac } from 'crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { centsToDecimalString, formatBps, formatETB, parseAmountToCents } from '@/lib/money'

const chapa = await import('@/lib/chapa')

const KEYS = ['CHAPA_SECRET_KEY', 'CHAPA_WEBHOOK_SECRET', 'CHAPA_TRANSFER_APPROVAL_SECRET', 'CHAPA_API_VERSION', 'SUPABASE_SERVICE_ROLE_KEY'] as const
const saved: Record<string, string | undefined> = {}
const headers = (h: Record<string, string>) => new Headers(h)
const hmac = (secret: string, data: string) => createHmac('sha256', secret).update(data).digest('hex')

function okResponse(json: unknown, status = 200) {
    return new Response(JSON.stringify(json), { status, headers: { 'Content-Type': 'application/json' } })
}

beforeEach(() => {
    for (const k of KEYS) { saved[k] = process.env[k]; delete process.env[k] }
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test'
})
afterEach(() => {
    for (const k of KEYS) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k] }
    vi.restoreAllMocks()
})

describe('money (integer cents only)', () => {
    it('converts cents to Chapa v1 decimal strings exactly', () => {
        expect(centsToDecimalString(123456)).toBe('1234.56')
        expect(centsToDecimalString(5)).toBe('0.05')
        expect(centsToDecimalString(100)).toBe('1.00')
    })
    it('parses amounts without float drift', () => {
        expect(parseAmountToCents('1234.56')).toBe(123456)
        expect(parseAmountToCents('0.1')).toBe(10)
        expect(parseAmountToCents('1,000')).toBe(100000)
        expect(parseAmountToCents(19.99)).toBe(1999)
        expect(parseAmountToCents(0.29)).toBe(29)
        expect(parseAmountToCents('abc')).toBeNull()
        expect(parseAmountToCents('-5')).toBeNull()
    })
    it('formats ETB and basis points', () => {
        expect(formatETB(123456)).toBe('1,234.56 ETB')
        expect(formatETB(50000, { compact: true })).toBe('500 ETB')
        expect(formatBps(1000)).toBe('10%')
        expect(formatBps(750)).toBe('7.5%')
    })
})

describe('references', () => {
    it('are short, unique and URL-safe', () => {
        const refs = new Set(Array.from({ length: 5000 }, () => chapa.newReference('EL')))
        expect(refs.size).toBe(5000)
        for (const r of [...refs].slice(0, 50)) {
            expect(r).toMatch(chapa.REFERENCE_PATTERN)
            expect(r.length).toBeLessThanOrEqual(20)
        }
        expect(chapa.newReference('PO')).toMatch(/^PO[0-9a-z]{16}$/)
    })
})

describe('mock mode (no CHAPA_SECRET_KEY)', () => {
    it('never calls Chapa', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch')
        expect(chapa.chapaMode()).toBe('mock')
        const c = await chapa.initializeCheckout({ txRef: 'ELabc', amountCents: 50000, title: 't', description: 'd', callbackUrl: 'x', returnUrl: 'y', baseUrl: 'https://app.test', bookingId: 'b' })
        expect(c.checkoutUrl).toBe('https://app.test/checkout/chapa-sandbox?tx_ref=ELabc')
        expect((await chapa.verifyTransaction('ELabc', { status: 'success', amountCents: 50000 })).status).toBe('success')
        expect((await chapa.verifyTransaction('ELabc')).status).toBe('pending')
        expect((await chapa.getBanks()).map((b) => b.code)).toEqual(['telebirr', 'cbe', 'awash', 'abyssinia', 'dashen', 'coop'])
        expect((await chapa.initiateTransfer({ reference: 'POx', amountCents: 1000, accountName: 'a', accountNumber: '1', bankCode: 'cbe' })).status).toBe('queued')
        expect(fetchSpy).not.toHaveBeenCalled()
    })
    it('signs sandbox webhooks so the real verifier accepts them', () => {
        const raw = JSON.stringify({ tx_ref: 'ELabc', status: 'success' })
        const sig = chapa.signSandboxPayload(raw, 'webhook')
        expect(chapa.verifyWebhookSignature(raw, headers(sig))).toBe(true)
        expect(chapa.verifyWebhookSignature(raw + ' ', headers(sig))).toBe(false)
        // the transfer-approval secret is a different key
        expect(chapa.verifyTransferApprovalSignature(raw, headers(sig))).toBe(false)
        expect(chapa.verifyTransferApprovalSignature(raw, headers(chapa.signSandboxPayload(raw, 'transfer-approval')))).toBe(true)
    })
})

describe('live mode', () => {
    beforeEach(() => {
        process.env.CHAPA_SECRET_KEY = 'CHASECK_TEST-x'
        process.env.CHAPA_WEBHOOK_SECRET = 'whsec'
        process.env.CHAPA_TRANSFER_APPROVAL_SECRET = 'apsec'
    })

    it('verifies both Chapa signature styles and rejects others', () => {
        const raw = '{"tx_ref":"ELabc"}'
        expect(chapa.verifyWebhookSignature(raw, headers({ 'x-chapa-signature': hmac('whsec', raw) }))).toBe(true)
        expect(chapa.verifyWebhookSignature(raw, headers({ 'chapa-signature': hmac('whsec', 'whsec') }))).toBe(true)
        expect(chapa.verifyWebhookSignature(raw, headers({ 'x-chapa-signature': hmac('other', raw) }))).toBe(false)
        expect(chapa.verifyWebhookSignature(raw, headers({}))).toBe(false)
        expect(chapa.verifyTransferApprovalSignature(raw, headers({ 'chapa-signature': hmac('apsec', 'apsec') }))).toBe(true)
        expect(chapa.verifyTransferApprovalSignature(raw, headers({ 'chapa-signature': hmac('whsec', 'whsec') }))).toBe(false)
    })
    it('refuses to sign sandbox payloads', () => {
        expect(() => chapa.signSandboxPayload('{}', 'webhook')).toThrow()
    })
    it('rejects webhooks when live and no webhook secret is set', () => {
        delete process.env.CHAPA_WEBHOOK_SECRET
        expect(chapa.webhookConfigured()).toBe(false)
        expect(chapa.verifyWebhookSignature('{}', headers({ 'x-chapa-signature': hmac('', '{}') }))).toBe(false)
    })

    it('v1: sends a decimal amount string and tx_ref', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(okResponse({ status: 'success', data: { checkout_url: 'https://checkout.chapa.co/x' } }))
        const r = await chapa.initializeCheckout({ txRef: 'ELabcdefghijklmnop', amountCents: 123456, phone: '+251911223344', title: 'Eth-Links', description: 'Escrow payment for Deep clean!', callbackUrl: 'cb', returnUrl: 'rt', baseUrl: 'b', bookingId: 'bk' })
        expect(r.checkoutUrl).toBe('https://checkout.chapa.co/x')
        const [url, init] = fetchSpy.mock.calls[0]
        expect(url).toBe('https://api.chapa.co/v1/transaction/initialize')
        const body = JSON.parse(String((init as RequestInit).body))
        expect(body).toMatchObject({ amount: '1234.56', currency: 'ETB', tx_ref: 'ELabcdefghijklmnop', phone_number: '0911223344' })
        expect(body.customization.description).not.toMatch(/!/)
    })

    it('v2: sends integer cents, merchant_reference and an Idempotency-Key', async () => {
        process.env.CHAPA_API_VERSION = 'v2'
        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(okResponse({ data: { checkout_url: 'https://pay.chapa.global/y' } }))
        await chapa.initializeCheckout({ txRef: 'ELabcdefghijklmnop', amountCents: 123456, title: 't', description: 'd', callbackUrl: 'cb', returnUrl: 'rt', baseUrl: 'b', bookingId: 'bk' })
        const [url, init] = fetchSpy.mock.calls[0]
        expect(url).toBe('https://api.chapa.global/v2/payments/hosted')
        const h = (init as RequestInit).headers as Record<string, string>
        expect(h['Idempotency-Key']).toBe('ELabcdefghijklmnop')
        expect(JSON.parse(String((init as RequestInit).body))).toMatchObject({ amount: 123456, currency: 'ETB', merchant_reference: 'ELabcdefghijklmnop' })
    })

    it('verify: parses the amount to cents; an API error is never a payment', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(okResponse({ data: { status: 'success', amount: '1234.56', currency: 'ETB', method: 'telebirr', reference: 'APxyz' } }))
        expect(await chapa.verifyTransaction('ELabc')).toEqual({ status: 'success', amountCents: 123456, currency: 'ETB', method: 'telebirr', providerReference: 'APxyz' })
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(okResponse({ message: 'Invalid transaction' }, 404))
        expect((await chapa.verifyTransaction('ELnope')).status).toBe('pending')
    })

    it('banks: falls back when Chapa is unreachable', async () => {
        vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'))
        expect((await chapa.getBanks()).length).toBe(6)
    })

    it('transfer: v1 decimal amount; rejection reported as failed', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(okResponse({ status: 'success', data: 'TRF123' }))
        const ok = await chapa.initiateTransfer({ reference: 'POabc', amountCents: 50050, accountName: 'Abebe', accountNumber: '1000123456', bankCode: '946' })
        expect(ok).toEqual({ status: 'queued', providerReference: 'TRF123', message: null })
        expect(JSON.parse(String((fetchSpy.mock.calls[0][1] as RequestInit).body))).toMatchObject({ amount: '500.50', reference: 'POabc', bank_code: '946', currency: 'ETB' })
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(okResponse({ status: 'failed', message: 'Insufficient balance' }, 400))
        expect(await chapa.initiateTransfer({ reference: 'POdef', amountCents: 100, accountName: 'A', accountNumber: '1', bankCode: '1' })).toMatchObject({ status: 'failed', message: 'Insufficient balance' })
    })
})
