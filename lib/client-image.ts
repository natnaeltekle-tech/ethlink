/**
 * Shrink a photo in the browser before upload (3G-friendly).
 * Long edge capped at `maxEdge`, re-encoded as JPEG. Returns the original
 * file for PDFs, formats the browser cannot decode (e.g. HEIC on Android),
 * or when compression would not make it smaller.
 */
export async function compressImage(file: File, maxEdge = 1600, quality = 0.82): Promise<File> {
    if (!file.type.startsWith('image/') || /hei[cf]/i.test(file.type)) return file
    if (typeof window === 'undefined' || typeof createImageBitmap !== 'function') return file

    try {
        const bitmap = await createImageBitmap(file)
        const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
        const width = Math.round(bitmap.width * scale)
        const height = Math.round(bitmap.height * scale)

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) return file
        ctx.drawImage(bitmap, 0, 0, width, height)
        bitmap.close?.()

        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
        if (!blob || blob.size >= file.size) return file
        return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
    } catch {
        return file
    }
}

/** Safe file extension for storage keys. */
export function fileExtension(file: File): string {
    if (file.type === 'application/pdf') return 'pdf'
    if (file.type === 'image/jpeg') return 'jpg'
    const fromName = (file.name.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '')
    return fromName.slice(0, 5) || 'jpg'
}
