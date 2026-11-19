/**
 * Money helpers. Every amount is an integer number of cents (ETB × 100);
 * conversions go through strings so floating point never touches a balance.
 */

export const CURRENCY = 'ETB' as const

/** 123456 → "1234.56" (exact). */
export function centsToDecimalString(cents: number): string {
    const c = Math.trunc(cents)
    const sign = c < 0 ? '-' : ''
    const abs = Math.abs(c)
    return `${sign}${Math.trunc(abs / 100)}.${String(abs % 100).padStart(2, '0')}`
}

/** "1234.56" | "1234.5" | 1234.56 | "1,234" → 123456. Returns null for anything unparsable. Extra decimals are truncated. */
export function parseAmountToCents(value: unknown): number | null {
    let str: string
    if (typeof value === 'number') {
        if (!Number.isFinite(value) || value < 0) return null
        str = value.toFixed(2)
    } else if (typeof value === 'string') {
        str = value.trim().replace(/,/g, '')
    } else {
        return null
    }
    const m = str.match(/^(\d{1,13})(?:\.(\d*))?$/)
    if (!m) return null
    const frac = (m[2] ?? '').slice(0, 2).padEnd(2, '0')
    return Number(m[1]) * 100 + Number(frac)
}

/** A decimal ETB amount stored in old numeric columns (e.g. services.price) → cents. */
export function etbToCents(etb: number | string | null | undefined): number {
    return parseAmountToCents(typeof etb === 'string' ? etb : Number(etb ?? 0)) ?? 0
}

/** 123456 → "1,234.56 ETB" (or "1,234 ETB" when whole and `compact`). */
export function formatETB(cents: number | null | undefined, opts: { compact?: boolean } = {}): string {
    const c = Math.trunc(cents ?? 0)
    const abs = Math.abs(c)
    const whole = Math.trunc(abs / 100).toLocaleString('en-US')
    const frac = abs % 100
    const body = opts.compact && frac === 0 ? whole : `${whole}.${String(frac).padStart(2, '0')}`
    return `${c < 0 ? '−' : ''}${body} ${CURRENCY}`
}

/** Basis points → "10%" / "7.5%". */
export function formatBps(bps: number | null | undefined): string {
    const b = Math.trunc(bps ?? 0)
    return `${Math.trunc(b / 100)}${b % 100 ? `.${String(b % 100).padStart(2, '0').replace(/0$/, '')}` : ''}%`
}
