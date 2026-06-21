import { beforeEach, describe, expect, it, vi } from 'vitest'

const rpcMock = vi.fn()
const insertMock = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    rpc: rpcMock,
    from: () => ({
      insert: insertMock,
    }),
  }),
}))

const {
  confirmBookingPaymentAtomic,
  detectPaymentProvider,
  extractBookingIdFromTxRef,
  withRetry,
} = await import('@/lib/services/payments')

const bookingId = '123e4567-e89b-12d3-a456-426614174000'

describe('payment helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    insertMock.mockResolvedValue({ error: null })
  })

  it('detects supported payment providers from tx_ref prefixes', () => {
    expect(detectPaymentProvider(`tx-ethlink-${bookingId}-1710000000000-abcd1234`)).toBe('chapa')
    expect(detectPaymentProvider(`tx-telebirr-${bookingId}-1710000000000-abcd1234`)).toBe('telebirr')
    expect(detectPaymentProvider(`tx-cbe-${bookingId}-1710000000000-abcd1234`)).toBe('cbe')
    expect(detectPaymentProvider(`tx-unknown-${bookingId}-1710000000000-abcd1234`)).toBeNull()
  })

  it('extracts the booking id from generated transaction references', () => {
    expect(extractBookingIdFromTxRef(`tx-ethlink-${bookingId}-1710000000000-abcd1234`)).toBe(bookingId)
    expect(extractBookingIdFromTxRef('tx-ethlink-short')).toBeNull()
  })

  it('retries transient operations before succeeding', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValue('ok')

    await expect(withRetry(operation, { attempts: 2, delayMs: 1 })).resolves.toBe('ok')
    expect(operation).toHaveBeenCalledTimes(2)
  })
})

describe('confirmBookingPaymentAtomic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    insertMock.mockResolvedValue({ error: null })
  })

  it('returns success for a successful RPC confirmation', async () => {
    rpcMock.mockResolvedValue({ data: { status: 'success' }, error: null })

    await expect(confirmBookingPaymentAtomic({
      txRef: `tx-ethlink-${bookingId}-1710000000000-abcd1234`,
      bookingId,
      provider: 'chapa',
      commission: 10,
      providerEarnings: 90,
    })).resolves.toEqual({ status: 'success' })
  })

  it('treats duplicate tx_ref confirmations as already processed', async () => {
    rpcMock.mockResolvedValue({ data: { status: 'already_processed' }, error: null })

    await expect(confirmBookingPaymentAtomic({
      txRef: `tx-ethlink-${bookingId}-1710000000000-abcd1234`,
      bookingId,
      provider: 'chapa',
      commission: 10,
      providerEarnings: 90,
    })).resolves.toEqual({ status: 'already_processed' })
  })

  it('logs and returns RPC failures without throwing', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'database unavailable' } })

    await expect(confirmBookingPaymentAtomic({
      txRef: `tx-ethlink-${bookingId}-1710000000000-abcd1234`,
      bookingId,
      provider: 'chapa',
      commission: 10,
      providerEarnings: 90,
    })).resolves.toEqual({ status: 'error', message: 'database unavailable' })

    expect(rpcMock).toHaveBeenCalledTimes(3)
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
      tx_ref: `tx-ethlink-${bookingId}-1710000000000-abcd1234`,
      booking_id: bookingId,
      provider: 'chapa',
      status: 'failed',
    }))
  })
})
