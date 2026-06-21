import { createAdminClient } from '@/lib/supabase/admin'

export type PaymentProvider = 'chapa' | 'telebirr' | 'cbe'
export type PaymentEventStatus = 'received' | 'verified' | 'ignored' | 'processed' | 'already_processed' | 'failed'

export type PaymentProcessResult =
    | { status: 'success' }
    | { status: 'already_processed' }
    | { status: 'error'; message: string }

export function detectPaymentProvider(txRef: string): PaymentProvider | null {
    if (txRef.startsWith('tx-ethlink-')) return 'chapa'
    if (txRef.startsWith('tx-telebirr-')) return 'telebirr'
    if (txRef.startsWith('tx-cbe-')) return 'cbe'
    return null
}

export function extractBookingIdFromTxRef(txRef: string): string | null {
    const parts = txRef.split('-')
    if (parts.length < 8) return null
    return parts.slice(2, 7).join('-')
}

function getErrorMessage(error: unknown): string {
    if (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string') {
        return error.message
    }
    return error instanceof Error ? error.message : 'unknown_error'
}

export async function withRetry<T>(
    operation: () => Promise<T>,
    options: { attempts?: number; delayMs?: number; shouldRetry?: (error: unknown) => boolean } = {}
): Promise<T> {
    const attempts = options.attempts ?? 3
    const delayMs = options.delayMs ?? 250
    let lastError: unknown

    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            return await operation()
        } catch (error) {
            lastError = error
            if (attempt === attempts || options.shouldRetry?.(error) === false) {
                break
            }
            await new Promise((resolve) => setTimeout(resolve, delayMs * attempt))
        }
    }

    throw lastError
}

export async function logPaymentEvent(params: {
    txRef?: string | null
    bookingId?: string | null
    provider?: PaymentProvider | null
    status: PaymentEventStatus
    message?: string | null
    payload?: Record<string, unknown> | null
}) {
    try {
        const adminSupabase = createAdminClient() as any
        const { error } = await adminSupabase.from('payment_webhook_events').insert({
            tx_ref: params.txRef ?? null,
            booking_id: params.bookingId ?? null,
            provider: params.provider ?? null,
            status: params.status,
            message: params.message ?? null,
            payload: params.payload ?? null,
        })

        if (error) {
            console.error('[Payments] Failed to persist payment event:', error)
        }
    } catch (error) {
        console.error('[Payments] Failed to log payment event:', error)
    }
}

export async function confirmBookingPaymentAtomic(params: {
    txRef: string
    bookingId: string
    provider: PaymentProvider
    commission: number
    providerEarnings: number
}): Promise<PaymentProcessResult> {
    const adminSupabase = createAdminClient()

    const { data, error } = await withRetry(async () => {
        const response = await adminSupabase.rpc('process_payment_confirmation', {
            p_tx_ref: params.txRef,
            p_booking_id: params.bookingId,
            p_provider: params.provider,
            p_commission: params.commission,
            p_provider_earnings: params.providerEarnings,
        })

        if (response.error) {
            throw response.error
        }

        return response
    }, {
        attempts: 3,
        delayMs: 300,
    }).catch((error) => ({ data: null, error }))

    if (error) {
        await logPaymentEvent({
            txRef: params.txRef,
            bookingId: params.bookingId,
            provider: params.provider,
            status: 'failed',
            message: getErrorMessage(error),
            payload: { source: 'process_payment_confirmation' },
        })
    }

    if (error) {
        console.error('[Payments] Atomic confirmation failed:', error)
        return { status: 'error', message: getErrorMessage(error) }
    }

    const result = data as { status?: string; message?: string } | null

    if (!result?.status) {
        return { status: 'error', message: 'empty_rpc_response' }
    }

    if (result.status === 'success' || result.status === 'already_processed') {
        return { status: result.status }
    }

    return { status: 'error', message: result.message ?? 'unknown_error' }
}
