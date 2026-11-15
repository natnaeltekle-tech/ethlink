/**
 * Payment mode control for Eth-Links.
 *
 * simulation — no live Chapa API calls. Bookings wait for an admin to
 *              confirm payment in /admin (manual confirmation, the default).
 *              Set SIMULATION_AUTO_CONFIRM=true for demos (Pay marks paid).
 * live       — real Chapa initialize + webhook / reconcile path.
 *
 * Resolution order for mode:
 *   1. No CHAPA_SECRET_KEY → always simulation (even if PAYMENT_MODE=live),
 *      so missing Chapa keys can never half-enable the live path.
 *   2. PAYMENT_MODE env ("simulation" | "live")
 *   3. Otherwise → live
 */

export type PaymentMode = 'simulation' | 'live'

let warnedMissingKey = false

export function getPaymentMode(): PaymentMode {
  if (!process.env.CHAPA_SECRET_KEY) {
    if (!warnedMissingKey && /^(live|production|prod)$/i.test((process.env.PAYMENT_MODE || '').trim())) {
      warnedMissingKey = true
      console.warn('[Payments] PAYMENT_MODE=live but CHAPA_SECRET_KEY is missing — using simulation (manual admin confirmation).')
    }
    return 'simulation'
  }
  const explicit = (process.env.PAYMENT_MODE || '').trim().toLowerCase()
  if (explicit === 'simulation' || explicit === 'sim' || explicit === 'test') {
    return 'simulation'
  }
  if (explicit === 'live' || explicit === 'production' || explicit === 'prod') {
    return 'live'
  }
  return 'live'
}

export function isSimulationMode(): boolean {
  return getPaymentMode() === 'simulation'
}

/**
 * Default (unset/false): manual — the booking stays pending until an admin
 * confirms payment. Set SIMULATION_AUTO_CONFIRM=true only for demos: user
 * "Pay" then marks the booking paid with no real money collected.
 */
export function isSimulationAutoConfirm(): boolean {
  if (!isSimulationMode()) return false
  const v = (process.env.SIMULATION_AUTO_CONFIRM || 'false').trim().toLowerCase()
  return v === 'true' || v === '1' || v === 'yes'
}
