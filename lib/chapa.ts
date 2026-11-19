import { createHmac, randomBytes, timingSafeEqual } from 'crypto'
import { centsToDecimalString, CURRENCY, parseAmountToCents } from '@/lib/money'

/**
 * Chapa adapter — the only file that talks to Chapa.
 *
 *   CHAPA_SECRET_KEY empty   → mock (sandbox) mode: nothing leaves the server;
 *                              checkout opens /checkout/chapa-sandbox and payouts
 *                              are simulated, but the ledger and push are real.
 *   CHAPA_SECRET_KEY set     → live Chapa. CHAPA_API_VERSION picks the API:
 *     v1 (default)  https://api.chapa.co/v1      amounts as "500.00",  tx_ref
 *     v2            https://api.chapa.global/v2  amounts in cents,     merchant_reference + Idempotency-Key
 *
 * No code changes are needed to switch: paste the keys into Vercel and redeploy.
 */

export type ChapaMode = 'mock' | 'live'
export type ChapaApiVersion = 'v1' | 'v2'

const V1_BASE = 'https://api.chapa.co/v1'
const V2_BASE = 'https://api.chapa.global/v2'
const TIMEOUT_MS = 15_000

const env = (k: string) => (process.env[k] ?? '').trim()

export function chapaMode(): ChapaMode {
    return env('CHAPA_SECRET_KEY') ? 'live' : 'mock'
}

export function chapaApiVersion(): ChapaApiVersion {
    return env('CHAPA_API_VERSION').toLowerCase() === 'v2' ? 'v2' : 'v1'
}

export function isMockMode(): boolean {
    return chapaMode() === 'mock'
}

/** In mock mode the signing secrets are derived from the service-role key, so sandbox webhooks are still really signed and verified. */
function derivedSandboxSecret(purpose: string): string {
    const seed = env('SUPABASE_SERVICE_ROLE_KEY') || 'eth-links-local-sandbox'
    return createHmac('sha256', seed).update(`eth-links:chapa-sandbox:${purpose}`).digest('hex')
}

function webhookSecret(): string {
    return env('CHAPA_WEBHOOK_SECRET') || (isMockMode() ? derivedSandboxSecret('webhook') : '')
}

function approvalSecret(): string {
    return env('CHAPA_TRANSFER_APPROVAL_SECRET') || (isMockMode() ? derivedSandboxSecret('transfer-approval') : '')
}

// ── References ──────────────────────────────────────────────────────────────
const B36 = '0123456789abcdefghijklmnopqrstuvwxyz'

/**
 * Collision-resistant reference: 2-letter prefix + 16 random base-36 chars
 * (≈ 82 bits) = 18 chars — fits v2's 20-char merchant_reference and v1's 50.
 */
export function newReference(prefix: 'EL' | 'PO'): string {
    const bytes = randomBytes(16)
    let out = prefix
    for (const b of bytes) out += B36[b % 36]
    return out
}

export const REFERENCE_PATTERN = /^(EL|PO)[0-9a-z]{16}$/

// ── HTTP ────────────────────────────────────────────────────────────────────
class ChapaError extends Error {
    constructor(message: string, readonly status?: number, readonly body?: unknown) {
        super(message)
        this.name = 'ChapaError'
    }
}

async function chapaFetch(path: string, init: { method?: 'GET' | 'POST'; body?: unknown; idempotencyKey?: string } = {}) {
    const version = chapaApiVersion()
    const url = `${version === 'v2' ? V2_BASE : V1_BASE}${path}`
    const headers: Record<string, string> = { Authorization: `Bearer ${env('CHAPA_SECRET_KEY')}`, Accept: 'application/json' }
    if (init.body !== undefined) headers['Content-Type'] = 'application/json'
    if (version === 'v2' && init.idempotencyKey) headers['Idempotency-Key'] = init.idempotencyKey

    let lastError: unknown
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const res = await fetch(url, {
                method: init.method ?? 'GET',
                headers,
                body: init.body === undefined ? undefined : JSON.stringify(init.body),
                signal: AbortSignal.timeout(TIMEOUT_MS),
                cache: 'no-store',
            })
            const text = await res.text()
            let json: unknown = null
            try { json = text ? JSON.parse(text) : null } catch { json = { raw: text.slice(0, 500) } }
            // Retry only transient failures; idempotency keys / unique refs make a retried POST safe.
            if (res.status >= 500 && attempt < 3) { lastError = new ChapaError(`Chapa ${res.status}`, res.status, json); await sleep(400 * attempt); continue }
            return { ok: res.ok, status: res.status, json: (json ?? {}) as Record<string, unknown> }
        } catch (e) {
            lastError = e
            if (attempt < 3) await sleep(400 * attempt)
        }
    }
    throw lastError instanceof Error ? lastError : new ChapaError('Chapa request failed')
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {})
const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : typeof v === 'number' ? String(v) : undefined)

function messageOf(json: Record<string, unknown>): string {
    const m = json.message
    if (typeof m === 'string') return m
    if (m && typeof m === 'object') return Object.values(m as Record<string, unknown>).flat().join('; ')
    return 'Chapa rejected the request'
}

// ── Checkout ────────────────────────────────────────────────────────────────
export type CheckoutInput = {
    txRef: string
    amountCents: number
    email?: string | null
    firstName?: string | null
    lastName?: string | null
    phone?: string | null
    title: string
    description: string
    callbackUrl: string
    returnUrl: string
    /** Absolute origin used for the sandbox checkout page in mock mode. */
    baseUrl: string
    bookingId: string
}

export async function initializeCheckout(input: CheckoutInput): Promise<{ checkoutUrl: string; mode: ChapaMode }> {
    if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) throw new Error('Invalid amount')

    if (isMockMode()) {
        return { checkoutUrl: `${input.baseUrl}/checkout/chapa-sandbox?tx_ref=${encodeURIComponent(input.txRef)}`, mode: 'mock' }
    }

    const first = (input.firstName || 'Eth-Links').slice(0, 50)
    const last = (input.lastName || 'Customer').slice(0, 50)
    const phone = normalizePhone(input.phone)
    // Chapa limits customization text to letters, numbers, spaces, - _ .
    const clean = (s: string, max: number) => s.replace(/[^\p{L}\p{N} ._-]/gu, '').slice(0, max) || 'Eth-Links'

    let res
    if (chapaApiVersion() === 'v2') {
        res = await chapaFetch('/payments/hosted', {
            method: 'POST',
            idempotencyKey: input.txRef,
            body: {
                amount: input.amountCents,
                currency: CURRENCY,
                merchant_reference: input.txRef,
                customer: { email: input.email || undefined, first_name: first, last_name: last, phone_number: phone },
                callback_url: input.callbackUrl,
                return_url: input.returnUrl,
                customization: { title: clean(input.title, 16), description: clean(input.description, 50) },
                metadata: { booking_id: input.bookingId },
            },
        })
    } else {
        res = await chapaFetch('/transaction/initialize', {
            method: 'POST',
            body: {
                amount: centsToDecimalString(input.amountCents),
                currency: CURRENCY,
                email: input.email || undefined,
                first_name: first,
                last_name: last,
                phone_number: phone,
                tx_ref: input.txRef,
                callback_url: input.callbackUrl,
                return_url: input.returnUrl,
                customization: { title: clean(input.title, 16), description: clean(input.description, 50) },
                meta: { booking_id: input.bookingId, hide_receipt: 'true' },
            },
        })
    }

    const data = obj(res.json.data)
    const checkoutUrl = str(data.checkout_url) ?? str(data.hosted_url) ?? str(data.url)
    if (!res.ok || !checkoutUrl) {
        console.error('[Chapa] initialize failed', res.status, messageOf(res.json))
        throw new ChapaError(`Payment could not be started: ${messageOf(res.json)}`, res.status)
    }
    return { checkoutUrl, mode: 'live' }
}

function normalizePhone(phone?: string | null): string | undefined {
    const d = (phone ?? '').replace(/\D/g, '')
    if (/^2519\d{8}$|^2517\d{8}$/.test(d)) return `0${d.slice(3)}`
    if (/^0[79]\d{8}$/.test(d)) return d
    if (/^[79]\d{8}$/.test(d)) return `0${d}`
    return undefined
}

// ── Verify ──────────────────────────────────────────────────────────────────
export type VerifiedTransaction = {
    status: 'success' | 'failed' | 'pending'
    amountCents: number | null
    currency: string | null
    method: string | null
    providerReference: string | null
}

/**
 * Ask Chapa for the truth about a payment (webhook bodies are never trusted alone).
 * Mock mode never calls Chapa: the sandbox webhook (signed by this server) carries the
 * simulated outcome, and the amount is the attempt's own amount.
 */
export async function verifyTransaction(
    txRef: string,
    mock?: { status: 'success' | 'failed'; amountCents: number },
): Promise<VerifiedTransaction> {
    if (isMockMode()) {
        return {
            status: mock?.status ?? 'pending',
            amountCents: mock?.amountCents ?? null,
            currency: CURRENCY,
            method: 'test',
            providerReference: mock ? `SANDBOX-${txRef.slice(-8).toUpperCase()}` : null,
        }
    }

    const res = await chapaFetch(chapaApiVersion() === 'v2'
        ? `/payments/${encodeURIComponent(txRef)}`
        : `/transaction/verify/${encodeURIComponent(txRef)}`)
    if (!res.ok) {
        // 404 / "Invalid transaction" while the customer hasn't paid yet; never treat an API error as a payment
        return { status: 'pending', amountCents: null, currency: null, method: null, providerReference: null }
    }
    const data = obj(res.json.data)
    const raw = (str(data.status) ?? '').toLowerCase()
    const status = raw === 'success' || raw === 'successful' || raw === 'completed' ? 'success'
        : raw === 'failed' || raw === 'cancelled' || raw === 'canceled' || raw === 'expired' ? 'failed' : 'pending'
    const amountCents = chapaApiVersion() === 'v2'
        ? (Number.isInteger(data.amount) ? (data.amount as number) : parseAmountToCents(data.amount))
        : parseAmountToCents(data.amount)
    return {
        status,
        amountCents,
        currency: str(data.currency) ?? null,
        method: str(data.method) ?? str(data.payment_method) ?? null,
        providerReference: str(data.reference) ?? str(data.chapa_reference) ?? null,
    }
}

// ── Banks ───────────────────────────────────────────────────────────────────
export type Bank = { code: string; name: string; type: 'bank' | 'wallet' }

/** Used in mock mode and whenever Chapa's bank list can't be fetched. */
export const FALLBACK_BANKS: Bank[] = [
    { code: 'telebirr', name: 'telebirr', type: 'wallet' },
    { code: 'cbe', name: 'Commercial Bank of Ethiopia', type: 'bank' },
    { code: 'awash', name: 'Awash Bank', type: 'bank' },
    { code: 'abyssinia', name: 'Bank of Abyssinia', type: 'bank' },
    { code: 'dashen', name: 'Dashen Bank', type: 'bank' },
    { code: 'coop', name: 'Cooperative Bank of Oromia', type: 'bank' },
]

let bankCache: { at: number; banks: Bank[] } | null = null

export async function getBanks(): Promise<Bank[]> {
    if (isMockMode()) return FALLBACK_BANKS
    if (bankCache && Date.now() - bankCache.at < 60 * 60 * 1000) return bankCache.banks
    try {
        const res = await chapaFetch('/banks')
        const list = Array.isArray(res.json.data) ? (res.json.data as unknown[]) : []
        const banks = list.map(obj).map((b) => {
            const name = str(b.name) ?? ''
            const wallet = Boolean(b.is_mobilemoney) || /telebirr|m-?pesa|wallet|birr/i.test(name)
            return { code: str(b.id) ?? str(b.code) ?? '', name, type: wallet ? 'wallet' : 'bank' } as Bank
        }).filter((b) => b.code && b.name)
        if (banks.length) {
            bankCache = { at: Date.now(), banks }
            return banks
        }
    } catch (e) {
        console.warn('[Chapa] bank list unavailable, using fallback:', e instanceof Error ? e.message : e)
    }
    return FALLBACK_BANKS
}

// ── Transfers (payouts) ─────────────────────────────────────────────────────
export type TransferInput = { reference: string; amountCents: number; accountName: string; accountNumber: string; bankCode: string }
export type TransferResult = { status: 'queued' | 'failed'; providerReference: string | null; message: string | null }

export async function initiateTransfer(input: TransferInput): Promise<TransferResult> {
    if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) return { status: 'failed', providerReference: null, message: 'Invalid amount' }

    if (isMockMode()) {
        // The simulated bank accepts everything here; the result arrives later via the sandbox webhook.
        return { status: 'queued', providerReference: `SANDBOX-TRF-${input.reference.slice(-8).toUpperCase()}`, message: null }
    }

    const v2 = chapaApiVersion() === 'v2'
    try {
        const res = await chapaFetch('/transfers', {
            method: 'POST',
            idempotencyKey: input.reference,
            body: v2
                ? { account_name: input.accountName, account_number: input.accountNumber, amount: input.amountCents, currency: CURRENCY, merchant_reference: input.reference, bank_code: input.bankCode }
                : { account_name: input.accountName, account_number: input.accountNumber, amount: centsToDecimalString(input.amountCents), currency: CURRENCY, reference: input.reference, bank_code: input.bankCode },
        })
        if (!res.ok || (str(res.json.status) ?? '').toLowerCase() === 'failed') {
            return { status: 'failed', providerReference: null, message: messageOf(res.json) }
        }
        const data = res.json.data
        return { status: 'queued', providerReference: typeof data === 'string' ? data : str(obj(data).reference) ?? str(obj(data).chapa_reference) ?? null, message: null }
    } catch (e) {
        // Unknown outcome (timeout): keep it pending; the transfer webhook or the cron re-check settles it.
        console.error('[Chapa] transfer request error:', e)
        return { status: 'queued', providerReference: null, message: 'Transfer submitted; awaiting confirmation' }
    }
}

export async function verifyTransfer(reference: string): Promise<'success' | 'failed' | 'pending'> {
    if (isMockMode()) return 'pending'
    try {
        const res = await chapaFetch(`/transfers/verify/${encodeURIComponent(reference)}`)
        if (!res.ok) return 'pending'
        const s = (str(obj(res.json.data).status) ?? '').toLowerCase()
        return s === 'success' || s === 'successful' || s === 'completed' ? 'success' : s === 'failed' || s === 'reversed' || s === 'cancelled' ? 'failed' : 'pending'
    } catch {
        return 'pending'
    }
}

// ── Signatures ──────────────────────────────────────────────────────────────
function hmacHex(secret: string, data: string): string {
    return createHmac('sha256', secret).update(data).digest('hex')
}

function safeEqualHex(a: string, b: string): boolean {
    const x = Buffer.from(a.trim().toLowerCase(), 'utf8')
    const y = Buffer.from(b.trim().toLowerCase(), 'utf8')
    return x.length === y.length && timingSafeEqual(x, y)
}

type HeaderBag = { get(name: string): string | null }

/**
 * Chapa signs webhooks two ways; either is accepted:
 *   x-chapa-signature = HMAC-SHA256(secret, raw body)
 *   chapa-signature   = HMAC-SHA256(secret, secret)
 */
function verifyWith(secret: string, rawBody: string, headers: HeaderBag): boolean {
    if (!secret) return false
    const bodySig = headers.get('x-chapa-signature')
    const keySig = headers.get('chapa-signature')
    if (bodySig && safeEqualHex(bodySig, hmacHex(secret, rawBody))) return true
    if (keySig && safeEqualHex(keySig, hmacHex(secret, secret))) return true
    return false
}

export function webhookConfigured(): boolean {
    return Boolean(webhookSecret())
}

export function verifyWebhookSignature(rawBody: string, headers: HeaderBag): boolean {
    return verifyWith(webhookSecret(), rawBody, headers)
}

export function verifyTransferApprovalSignature(rawBody: string, headers: HeaderBag): boolean {
    return verifyWith(approvalSecret(), rawBody, headers)
}

/** Sandbox only: sign a simulated callback exactly like Chapa would (body HMAC). */
export function signSandboxPayload(rawBody: string, purpose: 'webhook' | 'transfer-approval'): Record<string, string> {
    if (!isMockMode()) throw new Error('Sandbox signing is disabled when live Chapa keys are configured')
    const secret = purpose === 'webhook' ? webhookSecret() : approvalSecret()
    return { 'x-chapa-signature': hmacHex(secret, rawBody) }
}
