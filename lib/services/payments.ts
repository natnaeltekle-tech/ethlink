import { createAdminClient } from '@/lib/supabase/admin'

export type PaymentProvider = 'chapa' | 'telebirr' | 'cbe'

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

export async function confirmBookingPaymentAtomic(params: {
    txRef: string
    bookingId: string
    provider: PaymentProvider
    commission: number
    providerEarnings: number
}): Promise<PaymentProcessResult> {
    const adminSupabase = createAdminClient()

    const { data, error } = await adminSupabase.rpc('process_payment_confirmation', {
        p_tx_ref: params.txRef,
        p_booking_id: params.bookingId,
        p_provider: params.provider,
        p_commission: params.commission,
        p_provider_earnings: params.providerEarnings,
    })

    if (error) {
        console.error('[Payments] Atomic confirmation failed:', error)
        return { status: 'error', message: error.message }
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
