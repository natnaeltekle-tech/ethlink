/**
 * Provider screening — shared constants & validators (client + server).
 * Values mirror the CHECK constraints in
 * supabase/migrations/20261116090000_provider_screening.sql.
 */

export type AccountType = 'individual' | 'business'
export type VerificationStatus = 'unsubmitted' | 'pending' | 'verified' | 'rejected'

export const ID_TYPES = [
    { value: 'fayda', label: 'Fayda / National ID', needsBack: true },
    { value: 'kebele', label: 'Kebele ID', needsBack: true },
    { value: 'passport', label: 'Passport', needsBack: false },
    { value: 'drivers_license', label: "Driver's License", needsBack: true },
] as const
export type IdType = (typeof ID_TYPES)[number]['value']

export const SERVICE_MODES = [
    { value: 'travels_to_customer', label: 'I travel to the customer' },
    { value: 'customer_visits', label: 'Customer visits me' },
    { value: 'online', label: 'Online / Remote' },
] as const
export type ServiceMode = (typeof SERVICE_MODES)[number]['value']

export const ADDIS_ZONES = [
    'All Addis',
    'Bole',
    'Yeka',
    'CMC',
    'Kazanchis',
    'Sarbet',
    'Piassa',
    'Megenagna',
    'Mexico',
    'Gerji',
    'Lebu',
    'Kolfe',
    'Akaki',
] as const

export const PRICING_UNITS = [
    { value: 'fixed', label: 'Fixed price', suffix: '' },
    { value: 'per_hour', label: 'Per hour', suffix: '/ hour' },
    { value: 'per_day', label: 'Per day', suffix: '/ day' },
    { value: 'starting_from', label: 'Starting from', suffix: '' },
] as const
export type PricingUnit = (typeof PRICING_UNITS)[number]['value']

export const WEEK_DAYS = [
    { value: 'mon', label: 'Mon' },
    { value: 'tue', label: 'Tue' },
    { value: 'wed', label: 'Wed' },
    { value: 'thu', label: 'Thu' },
    { value: 'fri', label: 'Fri' },
    { value: 'sat', label: 'Sat' },
    { value: 'sun', label: 'Sun' },
] as const

/** Format a price with its unit, e.g. "From 500 ETB", "300 ETB / hour". */
export function formatPrice(price: number | null | undefined, unit?: string | null): string {
    if (!price) return 'Negotiable'
    const amount = `${Number(price).toLocaleString()} ETB`
    const u = PRICING_UNITS.find((p) => p.value === unit)
    if (!u || u.value === 'fixed') return amount
    if (u.value === 'starting_from') return `From ${amount}`
    return `${amount} ${u.suffix}`
}

// ─── Category-specific amenities ────────────────────────────────────────────
const STAY_AMENITIES = [
    { label: 'Wi-Fi', icon: '📶' },
    { label: 'Parking', icon: '🅿️' },
    { label: 'Swimming Pool', icon: '🏊' },
    { label: 'Gym', icon: '🏋️' },
    { label: 'Air Conditioning', icon: '❄️' },
    { label: 'Workspace', icon: '💻' },
    { label: 'Restaurant', icon: '🍽️' },
    { label: 'Airport Transfer', icon: '✈️' },
    { label: '24/7 Security', icon: '🛡️' },
    { label: 'Generator Backup', icon: '🔌' },
]
const TRADE_AMENITIES = [
    { label: 'Brings Own Tools', icon: '🧰' },
    { label: 'Free Estimate', icon: '📝' },
    { label: 'Same-Day Service', icon: '⚡' },
    { label: 'Warranty on Work', icon: '🛡️' },
    { label: 'Supplies Included', icon: '🧴' },
    { label: 'Weekend Availability', icon: '📅' },
]
const TRANSPORT_AMENITIES = [
    { label: 'Air Conditioning', icon: '❄️' },
    { label: 'Airport Pickup', icon: '✈️' },
    { label: 'Luggage Space', icon: '🧳' },
    { label: 'Child Seat', icon: '👶' },
    { label: 'English-Speaking Driver', icon: '🗣️' },
    { label: 'Available 24/7', icon: '🌙' },
]
const PROFESSIONAL_AMENITIES = [
    { label: 'Free Consultation', icon: '💬' },
    { label: 'Online Sessions', icon: '💻' },
    { label: 'Same-Day Response', icon: '⚡' },
    { label: 'Invoice / Receipt Provided', icon: '🧾' },
    { label: 'Weekend Availability', icon: '📅' },
]
const EVENT_AMENITIES = [
    { label: 'Equipment Included', icon: '🎛️' },
    { label: 'Setup & Cleanup', icon: '🧹' },
    { label: 'Free Consultation', icon: '💬' },
    { label: 'Travel Outside Addis', icon: '🚐' },
    { label: 'Weekend Availability', icon: '📅' },
]

export function amenitiesForCategory(category: string): { label: string; icon: string }[] {
    switch (category) {
        case 'Hospitality':
        case 'Real Estate':
            return STAY_AMENITIES
        case 'Cleaning':
        case 'Home Services':
            return TRADE_AMENITIES
        case 'Transport':
            return TRANSPORT_AMENITIES
        case 'Professional Services':
        case 'Tech':
            return PROFESSIONAL_AMENITIES
        case 'Events':
            return EVENT_AMENITIES
        default:
            return [...TRADE_AMENITIES.slice(0, 3), ...PROFESSIONAL_AMENITIES.slice(0, 2)]
    }
}

// ─── Ethiopian phone & payout validation ────────────────────────────────────
/**
 * Normalize an Ethiopian mobile number to +2519XXXXXXXX / +2517XXXXXXXX.
 * Accepts "0911 234 567", "911234567", "+251 911-234-567", "251911234567".
 * Returns null when it is not a valid Ethio telecom / Safaricom mobile.
 */
export function normalizeEthiopianPhone(input: string | null | undefined): string | null {
    if (!input) return null
    let digits = input.replace(/[^\d+]/g, '')
    if (digits.startsWith('+')) digits = digits.slice(1)
    if (digits.startsWith('251')) digits = digits.slice(3)
    else if (digits.startsWith('0')) digits = digits.slice(1)
    if (!/^[79]\d{8}$/.test(digits)) return null
    return `+251${digits}`
}

/** CBE account numbers are 13 digits. */
export function normalizeCbeAccount(input: string | null | undefined): string | null {
    if (!input) return null
    const digits = input.replace(/\D/g, '')
    return /^\d{13}$/.test(digits) ? digits : null
}

// ─── KYC storage ────────────────────────────────────────────────────────────
export const KYC_BUCKET = 'provider-kyc'
export const KYC_MAX_BYTES = 10 * 1024 * 1024
export const KYC_ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf'
export type KycDocKind = 'id_front' | 'id_back' | 'selfie' | 'license'

/** A KYC path must sit in the uploader's own folder: "{userId}/...". */
export function isOwnKycPath(path: string | null | undefined, userId: string): path is string {
    return typeof path === 'string' && path.startsWith(`${userId}/`) && !path.includes('..') && path.length < 300
}
