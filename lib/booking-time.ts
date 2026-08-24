/**
 * Booking times are stored in UTC and displayed in Ethiopia's timezone.
 * Africa/Addis_Ababa is UTC+3 year-round (no DST), so this is stable.
 */
export const BOOKING_TIME_ZONE = 'Africa/Addis_Ababa'
export const BOOKING_TIME_ZONE_LABEL = 'Addis Ababa time'

export function formatBookingDate(date: string | Date): string {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: BOOKING_TIME_ZONE,
    })
}

export function formatBookingTime(date: string | Date): string {
    return new Date(date).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: BOOKING_TIME_ZONE,
    })
}

export function formatBookingDateTime(date: string | Date): string {
    const d = new Date(date)
    return `${formatBookingDate(d)}, ${formatBookingTime(d)}`
}
