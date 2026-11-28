import { describe, expect, it } from 'vitest'
import { isNewListing, NEW_LISTING_WINDOW_MS } from '@/lib/listing-badges'

const NOW = Date.parse('2026-11-28T12:00:00Z')
const ago = (ms: number) => new Date(NOW - ms).toISOString()
const DAY = 24 * 60 * 60 * 1000

describe('isNewListing', () => {
    it('shows for listings under 14 days old with fewer than 3 reviews', () => {
        expect(isNewListing(ago(0), 0, NOW)).toBe(true)
        expect(isNewListing(ago(13 * DAY), 2, NOW)).toBe(true)
        expect(isNewListing(new Date(NOW - DAY), undefined as unknown as number, NOW)).toBe(true)
        expect(isNewListing(ago(DAY), null, NOW)).toBe(true)
    })
    it('drops at exactly 14 days and after', () => {
        expect(isNewListing(ago(NEW_LISTING_WINDOW_MS - 1), 0, NOW)).toBe(true)
        expect(isNewListing(ago(NEW_LISTING_WINDOW_MS), 0, NOW)).toBe(false)
        expect(isNewListing(ago(30 * DAY), 0, NOW)).toBe(false)
    })
    it('drops once the listing has 3 or more reviews, even if young', () => {
        expect(isNewListing(ago(DAY), 3, NOW)).toBe(false)
        expect(isNewListing(ago(DAY), 12, NOW)).toBe(false)
    })
    it('never shows for missing, invalid or future dates', () => {
        expect(isNewListing(null, 0, NOW)).toBe(false)
        expect(isNewListing('not a date', 0, NOW)).toBe(false)
        expect(isNewListing(new Date(NOW + DAY), 0, NOW)).toBe(false)
    })
})
