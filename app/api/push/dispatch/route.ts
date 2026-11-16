import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadServiceAccount, sendToDevice } from '@/lib/push/fcm'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Supabase Database Webhook → Android push.
 * Called on every INSERT into public.notifications with the header
 *   x-push-webhook-secret: <PUSH_WEBHOOK_SECRET>
 * The notification is re-read from the database (the payload is only used for
 * its id), sent to all of the user's devices, and dead tokens are removed.
 */
const TITLES: Record<string, string> = {
    booking: 'Booking update',
    payment: 'Payment update',
    message: 'New message',
    info: 'Eth-Links',
}

function secretMatches(given: string | null, expected: string) {
    if (!given) return false
    const a = Buffer.from(given)
    const b = Buffer.from(expected)
    return a.length === b.length && timingSafeEqual(a, b)
}

const payloadSchema = z.object({
    type: z.string(),
    table: z.string(),
    schema: z.string().optional(),
    record: z.object({ id: z.string().uuid() }).passthrough().nullable().optional(),
}).passthrough()

export async function POST(req: NextRequest) {
    const expected = process.env.PUSH_WEBHOOK_SECRET
    if (!expected || expected.length < 16) {
        return NextResponse.json({ error: 'Push webhook not configured' }, { status: 503 })
    }
    if (!secretMatches(req.headers.get('x-push-webhook-secret'), expected)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const parsed = payloadSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: 'Bad payload' }, { status: 400 })
    const { type, table, record } = parsed.data
    if (type !== 'INSERT' || table !== 'notifications' || !record) {
        return NextResponse.json({ ok: true, skipped: 'not a new notification' })
    }

    const sa = loadServiceAccount()
    if (!sa) return NextResponse.json({ error: 'Firebase credentials missing' }, { status: 503 })

    const admin = createAdminClient()
    const { data: n } = await admin
        .from('notifications')
        .select('id, user_id, type, title, content, message, link')
        .eq('id', record.id)
        .maybeSingle()
    if (!n) return NextResponse.json({ ok: true, skipped: 'notification not found' })

    const { data: devices } = await admin.from('push_tokens').select('token').eq('user_id', n.user_id)
    if (!devices?.length) return NextResponse.json({ ok: true, sent: 0, skipped: 'no devices' })

    const text = (n.content || n.message || n.title || 'You have a new notification').trim()
    const msg = {
        title: n.title?.trim() || TITLES[n.type ?? 'info'] || 'Eth-Links',
        body: text.length > 180 ? `${text.slice(0, 177)}…` : text,
        data: { link: n.link && n.link.startsWith('/') ? n.link : '/dashboard', notification_id: n.id, type: n.type ?? 'info' },
        tag: n.id,
    }

    const results = await Promise.all(devices.map(async ({ token }) => {
        try {
            return { token, result: await sendToDevice(sa, token, msg) }
        } catch (e) {
            console.error('[push] send threw:', e instanceof Error ? e.message : e)
            return { token, result: 'error' as const }
        }
    }))

    const dead = results.filter((r) => r.result === 'dead-token').map((r) => r.token)
    if (dead.length) await admin.from('push_tokens').delete().in('token', dead)

    return NextResponse.json({
        ok: true,
        sent: results.filter((r) => r.result === 'sent').length,
        removed: dead.length,
        failed: results.filter((r) => r.result === 'error').length,
    })
}
