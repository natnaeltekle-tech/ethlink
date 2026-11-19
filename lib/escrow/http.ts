import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { EscrowError } from '@/lib/escrow/service'

export const MAX_WEBHOOK_BYTES = 256 * 1024

export async function currentUser() {
    const supabase = await createClient()
    try {
        const { data } = await supabase.auth.getUser()
        return data.user
    } catch {
        return null
    }
}

export function errorResponse(e: unknown, scope: string) {
    if (e instanceof EscrowError) return NextResponse.json({ error: e.message, code: e.code }, { status: e.status })
    console.error(`[${scope}]`, e)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
}

/** Reads a webhook body with a size cap. Returns null if it is too large. */
export async function readRawBody(request: Request): Promise<string | null> {
    const len = Number(request.headers.get('content-length') ?? 0)
    if (len > MAX_WEBHOOK_BYTES) return null
    const raw = await request.text()
    return raw.length > MAX_WEBHOOK_BYTES ? null : raw
}

export function parseJson(raw: string): Record<string, unknown> | null {
    try {
        const v = JSON.parse(raw)
        return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
    } catch {
        return null
    }
}
