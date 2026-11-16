'use client'

import { useRef, useState } from 'react'
import { ImagePlus, Loader2, Star, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { compressImage, fileExtension } from '@/lib/client-image'

const MAX_PHOTOS = 8

/**
 * Multi-photo portfolio upload to the public service-images bucket under
 * "{userId}/portfolio/…". The first photo is the listing cover.
 * Submits each public URL as a hidden "gallery" input.
 */
export function PortfolioUploader({ userId, onChange, initial = [] }: { userId: string; onChange?: (urls: string[]) => void; initial?: string[] }) {
    const [urls, setUrls] = useState<string[]>(initial)
    const [busy, setBusy] = useState(0)
    const [error, setError] = useState<string | null>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    const update = (next: string[]) => { setUrls(next); onChange?.(next) }

    const handleFiles = async (files: FileList | null) => {
        if (!files?.length) return
        setError(null)
        const room = MAX_PHOTOS - urls.length
        const picked = Array.from(files).filter((f) => f.type.startsWith('image/')).slice(0, room)
        if (picked.length < files.length) setError(`Up to ${MAX_PHOTOS} photos (images only).`)
        setBusy(picked.length)

        const supabase = createClient()
        const uploaded: string[] = []
        for (const original of picked) {
            try {
                const file = await compressImage(original, 1600, 0.8)
                const key = `${userId}/portfolio/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExtension(file)}`
                const { error: upErr } = await supabase.storage.from('service-images').upload(key, file, { contentType: file.type })
                if (upErr) throw upErr
                uploaded.push(supabase.storage.from('service-images').getPublicUrl(key).data.publicUrl)
            } catch (e) {
                console.error('[portfolio] upload failed', e)
                setError('Some photos failed to upload. Try again.')
            } finally {
                setBusy((n) => Math.max(0, n - 1))
            }
        }
        update([...urls, ...uploaded])
    }

    const remove = (i: number) => update(urls.filter((_, idx) => idx !== i))
    const makeCover = (i: number) => update([urls[i], ...urls.filter((_, idx) => idx !== i)])

    return (
        <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {urls.map((url, i) => (
                    <div key={url} className="relative aspect-square overflow-hidden rounded-lg bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={`Portfolio photo ${i + 1}`} className="h-full w-full object-cover" loading="lazy" />
                        {i === 0 ? (
                            <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">Cover</span>
                        ) : (
                            <button type="button" onClick={() => makeCover(i)} aria-label="Make cover photo"
                                className="absolute left-1 top-1 rounded-full bg-black/60 p-1 text-white">
                                <Star className="h-3 w-3" />
                            </button>
                        )}
                        <button type="button" onClick={() => remove(i)} aria-label="Remove photo"
                            className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white">
                            <X className="h-3 w-3" />
                        </button>
                        <input type="hidden" name="gallery" value={url} />
                    </div>
                ))}
                {Array.from({ length: busy }).map((_, i) => (
                    <div key={`busy-${i}`} className="flex aspect-square items-center justify-center rounded-lg bg-muted">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                ))}
                {urls.length + busy < MAX_PHOTOS && (
                    <button type="button" onClick={() => inputRef.current?.click()}
                        className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border text-xs text-muted-foreground hover:bg-secondary/40">
                        <ImagePlus className="h-6 w-6" />
                        Add photos
                    </button>
                )}
            </div>
            <p className="text-xs text-muted-foreground">{urls.length}/{MAX_PHOTOS} photos · first photo is the cover</p>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
                onChange={(e) => { void handleFiles(e.target.files); e.target.value = '' }} />
        </div>
    )
}
