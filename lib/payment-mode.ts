/**
 * Payment mode control for Eth-Links.
 *
 * simulation — no live Chapa API calls.
 *              By default AUTO-CONFIRMS on user pay (no admin click).
 *              Set SIMULATION_AUTO_CONFIRM=false to require admin confirm.
 * live       — real Chapa initialize + webhook / reconcile path.
 *
 * Resolution order for mode:
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

/**
 * When true (default in simulation), user pay marks the booking paid immediately.
 * Set SIMULATION_AUTO_CONFIRM=false to require manual admin confirmation instead.
 */
export function isSimulationAutoConfirm(): boolean {
  if (!isSimulationMode()) return false
  const v = (process.env.SIMULATION_AUTO_CONFIRM || 'true').trim().toLowerCase()
  return v !== 'false' && v !== '0' && v !== 'no'
}
