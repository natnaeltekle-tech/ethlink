/** A listing counts as "New" for its first 14 days, until it has 3 reviews. */
export const NEW_LISTING_WINDOW_MS = 14 * 24 * 60 * 60 * 1000
export const NEW_LISTING_MAX_REVIEWS = 3

/**
 * True only for genuinely new providers who haven't built reviews yet:
 * created less than 14 days ago AND fewer than 3 reviews. Once either threshold
 * is reached the badge drops and the star rating takes over as social proof.
 */
export function isNewListing(createdAt: string | Date | null | undefined, reviewCount: number | null = 0, now: number = Date.now()): boolean {
    if (!createdAt) return false
    const created = createdAt instanceof Date ? createdAt.getTime() : new Date(createdAt).getTime()
    if (!Number.isFinite(created)) return false
    const age = now - created
    if (age < 0 || age >= NEW_LISTING_WINDOW_MS) return false
    return (Number(reviewCount) || 0) < NEW_LISTING_MAX_REVIEWS
}
