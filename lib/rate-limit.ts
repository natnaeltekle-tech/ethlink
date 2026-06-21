/**
 * Distributed rate limiting with Upstash Redis.
 * Falls back to in-memory sliding window when env vars are not configured.
 */
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

type RateLimitBucket = 'auth' | 'api' | 'default'

const RATE_LIMITS: Record<RateLimitBucket, { max: number; windowMs: number }> = {
    auth: { max: 5, windowMs: 15 * 60 * 1000 },
    api: { max: 20, windowMs: 15 * 60 * 1000 },
    default: { max: 100, windowMs: 15 * 60 * 1000 },
}

const upstashLimiters = new Map<RateLimitBucket, Ratelimit | null>()

export function getRateLimitBucket(pathname: string): RateLimitBucket {
    if (pathname.startsWith('/auth')) return 'auth'
    if (pathname.startsWith('/api')) return 'api'
    return 'default'
}

function getUpstashLimiter(bucket: RateLimitBucket): Ratelimit | null {
    if (upstashLimiters.has(bucket)) {
        return upstashLimiters.get(bucket) ?? null
    }

    const url = process.env.UPSTASH_REDIS_REST_URL
    const token = process.env.UPSTASH_REDIS_REST_TOKEN

    if (!url || !token) {
        upstashLimiters.set(bucket, null)
        return null
    }

    const limit = RATE_LIMITS[bucket]
    const windowSec = Math.ceil(limit.windowMs / 1000)

    const limiter = new Ratelimit({
        redis: new Redis({ url, token }),
        limiter: Ratelimit.slidingWindow(limit.max, `${windowSec} s`),
        prefix: `ethlink:rl:${bucket}`,
        analytics: false,
    })

    upstashLimiters.set(bucket, limiter)
    return limiter
}

// ─── In-memory fallback (Edge-compatible) ───────────────────────────────────
const rateLimitMap = new Map<string, { count: number; windowStart: number }>()
let lastCleanup = Date.now()
const CLEANUP_INTERVAL = 5 * 60 * 1000

function cleanupStaleEntries() {
    const now = Date.now()
    if (now - lastCleanup < CLEANUP_INTERVAL) return
    lastCleanup = now

    const maxWindow = 15 * 60 * 1000
    for (const [key, entry] of rateLimitMap) {
        if (now - entry.windowStart > maxWindow * 2) {
            rateLimitMap.delete(key)
        }
    }
}

function checkInMemoryRateLimit(
    ip: string,
    bucket: RateLimitBucket
): { allowed: boolean; retryAfter: number } {
    cleanupStaleEntries()

    const limit = RATE_LIMITS[bucket]
    const key = `${ip}:${bucket}`
    const now = Date.now()
    const entry = rateLimitMap.get(key)

    if (!entry || now - entry.windowStart > limit.windowMs) {
        rateLimitMap.set(key, { count: 1, windowStart: now })
        return { allowed: true, retryAfter: 0 }
    }

    if (entry.count >= limit.max) {
        const retryAfter = Math.ceil((entry.windowStart + limit.windowMs - now) / 1000)
        return { allowed: false, retryAfter }
    }

    entry.count++
    return { allowed: true, retryAfter: 0 }
}

/**
 * Check rate limit for an IP + pathname.
 * Uses Upstash when configured; otherwise in-memory fallback.
 */
export async function checkRateLimit(
    ip: string,
    pathname: string
): Promise<{ allowed: boolean; retryAfter: number }> {
    const bucket = getRateLimitBucket(pathname)

    try {
        const limiter = getUpstashLimiter(bucket)
        if (limiter) {
            const result = await limiter.limit(`${bucket}:${ip}`)
            return {
                allowed: result.success,
                retryAfter: result.success ? 0 : Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)),
            }
        }
    } catch (error) {
        console.warn('[RateLimit] Upstash unavailable, using in-memory fallback:', error)
    }

    return checkInMemoryRateLimit(ip, bucket)
}
