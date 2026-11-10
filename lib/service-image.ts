import { DEFAULT_SERVICE_IMAGE } from '@/lib/constants'

/**
 * Resolve the best cover image for a service across Home, Explore, details, etc.
 * Handles gallery as array OR JSON string, relative storage paths, and full URLs.
 *
 * Priority (cover-first):
 * 1. image_url (explicit cover field)
 * 2. gallery[0]
 * 3. images[0]
 */
export function getServiceImageUrl(service: {
  gallery?: unknown
  images?: unknown
  image_url?: string | null
} | null | undefined): string {
  if (!service) return DEFAULT_SERVICE_IMAGE

  // Prefer the dedicated cover field first so Home and Explore stay in sync
  const candidates = [
    service.image_url,
    ...normalizeList(service.gallery),
    ...normalizeList(service.images),
  ]

  for (const raw of candidates) {
    const resolved = resolveStorageUrl(raw)
    if (resolved) return resolved
  }

  return DEFAULT_SERVICE_IMAGE
}

function normalizeList(value: unknown): string[] {
  if (!value) return []

  // Already an array
  if (Array.isArray(value)) {
    return value
      .map((item) => extractUrl(item))
      .filter((s): s is string => Boolean(s))
  }

  // JSON-encoded array string: '["https://..."]'
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed)) {
          return parsed
            .map((item) => extractUrl(item))
            .filter((s): s is string => Boolean(s))
        }
      } catch {
        /* fall through — treat as single path */
      }
    }
    const single = extractUrl(trimmed)
    return single ? [single] : []
  }

  const one = extractUrl(value)
  return one ? [one] : []
}

function extractUrl(item: unknown): string | null {
  if (!item) return null
  if (typeof item === 'string') {
    const s = item.trim()
    return s.length > 0 ? s : null
  }
  // Some uploads store { url: "..." } or { path: "..." }
  if (typeof item === 'object' && item !== null) {
    const obj = item as Record<string, unknown>
    for (const key of ['url', 'src', 'path', 'publicUrl', 'public_url']) {
      if (typeof obj[key] === 'string' && (obj[key] as string).trim()) {
        return (obj[key] as string).trim()
      }
    }
  }
  return null
}

function resolveStorageUrl(path: string | null | undefined): string | null {
  if (!path || typeof path !== 'string') return null
  const trimmed = path.trim()
  if (!trimmed) return null

  // Full URL or data URI
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('data:')) {
    return trimmed
  }

  // Protocol-relative
  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`
  }

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
  if (!base) return null

  // Already a storage path fragment
  if (trimmed.includes('/storage/v1/object/public/')) {
    return trimmed.startsWith('http')
      ? trimmed
      : `${base}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`
  }

  const key = trimmed.replace(/^\//, '')
  // Ignore garbage single-char / bracket leftovers from bad JSON parsing
  if (key.length < 3 || key === '[' || key === ']') return null
  // Skip obvious non-image junk
  if (/^(null|undefined|none|n\/a)$/i.test(key)) return null

  return `${base}/storage/v1/object/public/service-images/${key}`
}
