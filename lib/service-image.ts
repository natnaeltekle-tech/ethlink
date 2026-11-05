import { DEFAULT_SERVICE_IMAGE } from '@/lib/constants'

/**
 * Resolve the best cover image for a service across Home, Explore, details, etc.
 * Prefers gallery → images → image_url, and expands relative Supabase storage paths.
 */
export function getServiceImageUrl(service: {
  gallery?: string[] | null
  images?: string[] | null
  image_url?: string | null
} | null | undefined): string {
  if (!service) return DEFAULT_SERVICE_IMAGE

  const candidates: (string | null | undefined)[] = [
    service.gallery?.[0],
    service.images?.[0],
    service.image_url,
  ]

  for (const raw of candidates) {
    const resolved = resolveStorageUrl(raw)
    if (resolved) return resolved
  }

  return DEFAULT_SERVICE_IMAGE
}

function resolveStorageUrl(path: string | null | undefined): string | null {
  if (!path || typeof path !== 'string') return null
  const trimmed = path.trim()
  if (!trimmed) return null

  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('data:')) {
    return trimmed
  }

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
  if (!base) {
    // No public URL configured — only absolute URLs work
    return null
  }

  // Paths like "folder/file.jpg" or "/folder/file.jpg"
  const key = trimmed.replace(/^\//, '')
  return `${base}/storage/v1/object/public/service-images/${key}`
}
