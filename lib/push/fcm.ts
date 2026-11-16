import { createPrivateKey, createSign } from 'crypto'

/**
 * Minimal Firebase Cloud Messaging HTTP v1 client (no extra dependencies).
 *
 * Credentials (Vercel environment variables), either:
 *   FIREBASE_SERVICE_ACCOUNT_JSON  — the whole service-account key file (JSON, or base64 of it)
 * or the three fields separately:
 *   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 */
type ServiceAccount = { projectId: string; clientEmail: string; privateKey: string }

const TOKEN_URL = process.env.GOOGLE_OAUTH_TOKEN_URL || 'https://oauth2.googleapis.com/token'
const FCM_BASE = process.env.FCM_API_BASE_URL || 'https://fcm.googleapis.com'
const SCOPE = 'https://www.googleapis.com/auth/firebase.messaging'

/**
 * Accept the private key however it was pasted into Vercel: with or without
 * surrounding quotes, with real line breaks, literal "\n" (or "\\n"), Windows
 * line endings, line breaks turned into spaces, or even the whole JSON key file.
 * Always returns a clean PEM block.
 */
export function normalizePrivateKey(raw: string): string {
    let k = raw.trim()
    if (k.startsWith('{')) {
        try { k = String(JSON.parse(k).private_key ?? k) } catch { /* not JSON */ }
    }
    for (let i = 0; i < 2 && /^(['"])[\s\S]*\1$/.test(k); i++) k = k.slice(1, -1).trim()
    k = k.replace(/\\\\n/g, '\n').replace(/\\n/g, '\n').replace(/\\r/g, '').replace(/\r\n?/g, '\n')
    const m = k.match(/-----BEGIN ([A-Z ]+)-----([\s\S]*?)-----END \1-----/)
    if (!m) return k
    const body = m[2].replace(/[^A-Za-z0-9+/=]/g, '')
    return `-----BEGIN ${m[1]}-----\n${(body.match(/.{1,64}/g) ?? []).join('\n')}\n-----END ${m[1]}-----\n`
}

/** Why a private key can't be used — never includes the key itself. */
export function describeKeyProblem(raw: string): string | null {
    try {
        createPrivateKey(normalizePrivateKey(raw))
        return null
    } catch (e) {
        const hints: string[] = []
        const t = raw.trim()
        if (!/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(t)) hints.push('no "-----BEGIN PRIVATE KEY-----" line')
        if (!/-----END [A-Z ]*PRIVATE KEY-----/.test(t)) hints.push('no "-----END PRIVATE KEY-----" line (value cut off?)')
        if (t.length < 1500) hints.push(`only ${t.length} characters (a Firebase key is ~1700)`)
        return `${hints.join('; ') || 'not a valid PEM key'} [${e instanceof Error ? e.message : 'parse error'}]`
    }
}

export function loadServiceAccount(): ServiceAccount | null {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim()
    if (raw) {
        try {
            const json = JSON.parse(raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8'))
            if (json.project_id && json.client_email && json.private_key) {
                return { projectId: String(json.project_id).trim(), clientEmail: String(json.client_email).trim(), privateKey: normalizePrivateKey(String(json.private_key)) }
            }
        } catch {
            console.error('[fcm] FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON')
        }
        return null
    }
    const unquote = (v?: string) => v?.trim().replace(/^(['"])([\s\S]*)\1$/, '$2').trim()
    const projectId = unquote(process.env.FIREBASE_PROJECT_ID)
    const clientEmail = unquote(process.env.FIREBASE_CLIENT_EMAIL)
    const rawKey = process.env.FIREBASE_PRIVATE_KEY
    if (!projectId || !clientEmail || !rawKey) return null
    return { projectId, clientEmail, privateKey: normalizePrivateKey(rawKey) }
}

/**
 * Config sanity check, safe to log: project id, whether the service account
 * belongs to that project, and why the key is unusable (if it is).
 */
export function diagnoseServiceAccount(sa: ServiceAccount): string[] {
    const problems: string[] = []
    const emailProject = sa.clientEmail.match(/@([^.]+)\.iam\.gserviceaccount\.com$/)?.[1]
    if (!emailProject) problems.push(`FIREBASE_CLIENT_EMAIL doesn't look like a service account (…@<project>.iam.gserviceaccount.com)`)
    else if (emailProject !== sa.projectId) problems.push(`FIREBASE_PROJECT_ID is "${sa.projectId}" but the service account belongs to project "${emailProject}"`)
    const keyProblem = describeKeyProblem(sa.privateKey)
    if (keyProblem) problems.push(`FIREBASE_PRIVATE_KEY can't be read: ${keyProblem}`)
    return problems
}

const b64url = (v: string | Buffer) => Buffer.from(v).toString('base64url')

let cached: { token: string; expiresAt: number; email: string } | null = null

async function accessToken(sa: ServiceAccount): Promise<string> {
    const now = Math.floor(Date.now() / 1000)
    if (cached && cached.email === sa.clientEmail && cached.expiresAt - 60 > now) return cached.token
    const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
    const claims = b64url(JSON.stringify({ iss: sa.clientEmail, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 }))
    const signer = createSign('RSA-SHA256')
    signer.update(`${header}.${claims}`)
    const assertion = `${header}.${claims}.${b64url(signer.sign(sa.privateKey))}`
    const res = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok || !body.access_token) {
        throw new Error(`Google sign-in for ${sa.clientEmail} failed (${res.status}): ${body.error_description ?? body.error ?? 'unknown'}`)
    }
    cached = { token: body.access_token, expiresAt: now + Number(body.expires_in ?? 3600), email: sa.clientEmail }
    return cached.token
}

export type PushMessage = { title: string; body: string; data: Record<string, string>; tag?: string }
export type SendResult = 'sent' | 'dead-token' | 'error'

/** Send one notification to one device. 'dead-token' = remove it from the database. */
export async function sendToDevice(sa: ServiceAccount, token: string, msg: PushMessage): Promise<SendResult> {
    const res = await fetch(`${FCM_BASE}/v1/projects/${encodeURIComponent(sa.projectId)}/messages:send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${await accessToken(sa)}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message: {
                token,
                notification: { title: msg.title, body: msg.body },
                data: msg.data,
                android: {
                    priority: 'HIGH',
                    notification: {
                        channel_id: 'bookings_messages',
                        icon: 'ic_stat_notify',
                        color: '#F5C619',
                        ...(msg.tag ? { tag: msg.tag } : {}),
                    },
                },
            },
        }),
    })
    if (res.ok) return 'sent'
    const err = await res.json().catch(() => ({}))
    const codes: string[] = (err?.error?.details ?? []).map((d: { errorCode?: string }) => d?.errorCode).filter(Boolean)
    const message: string = err?.error?.message ?? ''
    if (codes.includes('UNREGISTERED') || (res.status === 400 && /registration token/i.test(message))) {
        return 'dead-token'
    }
    if (codes.includes('SENDER_ID_MISMATCH')) {
        // The app's google-services.json and FIREBASE_PROJECT_ID are different Firebase projects.
        console.error(`[fcm] SENDER_ID_MISMATCH: the device token belongs to another Firebase project than "${sa.projectId}". Make FIREBASE_PROJECT_ID match project_id in google-services.json.`)
        return 'error'
    }
    if (res.status === 401) cached = null
    console.error('[fcm] send failed', res.status, codes.join(','), message.slice(0, 200))
    return 'error'
}
