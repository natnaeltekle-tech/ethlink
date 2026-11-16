import { createSign } from 'crypto'

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

export function loadServiceAccount(): ServiceAccount | null {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim()
    if (raw) {
        try {
            const json = JSON.parse(raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8'))
            if (json.project_id && json.client_email && json.private_key) {
                return { projectId: json.project_id, clientEmail: json.client_email, privateKey: String(json.private_key).replace(/\\n/g, '\n') }
            }
        } catch {
            console.error('[fcm] FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON')
        }
        return null
    }
    const projectId = process.env.FIREBASE_PROJECT_ID
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    return projectId && clientEmail && privateKey ? { projectId, clientEmail, privateKey } : null
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
    if (!res.ok || !body.access_token) throw new Error(`OAuth token request failed (${res.status}): ${body.error_description ?? body.error ?? 'unknown'}`)
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
    if (codes.includes('UNREGISTERED') || codes.includes('SENDER_ID_MISMATCH')
        || (res.status === 400 && /registration token/i.test(message))) {
        return 'dead-token'
    }
    if (res.status === 401) cached = null
    console.error('[fcm] send failed', res.status, codes.join(','), message.slice(0, 200))
    return 'error'
}
