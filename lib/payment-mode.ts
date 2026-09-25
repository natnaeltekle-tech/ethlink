/**
 * Payment mode control for Eth-Links.
 *
 * simulation — no live Chapa charges; bookings stay pending until an admin
 *              confirms payment (manual bank transfer / offline proof).
 * live       — real Chapa initialize + webhook / reconcile path.
 *
 * Resolution order:
 *   1. PAYMENT_MODE env ("simulation" | "live")
 *   2. If CHAPA_SECRET_KEY is missing → simulation
 *   3. Otherwise → live
 */

export type PaymentMode = 'simulation' | 'live'

export function getPaymentMode(): PaymentMode {
  const explicit = (process.env.PAYMENT_MODE || '').trim().toLowerCase()
  if (explicit === 'simulation' || explicit === 'sim' || explicit === 'test') {
    return 'simulation'
  }
  if (explicit === 'live' || explicit === 'production' || explicit === 'prod') {
    return 'live'
  }
  if (!process.env.CHAPA_SECRET_KEY) {
    return 'simulation'
  }
  return 'live'
}

export function isSimulationMode(): boolean {
  return getPaymentMode() === 'simulation'
}
