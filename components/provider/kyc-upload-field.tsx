'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, CheckCircle2, FileText, Loader2, RefreshCw, Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { compressImage, fileExtension } from '@/lib/client-image'
import { KYC_ACCEPT, KYC_BUCKET, KYC_MAX_BYTES, type KycDocKind } from '@/lib/provider-screening'
import { cn } from '@/lib/utils'

interface KycUploadFieldProps {
    userId: string
    kind: KycDocKind
    label: string
    hint?: string
    required?: boolean
    /** 'environment' = back camera (documents), 'user' = front camera (selfie) */
    capture?: 'environment' | 'user'
    /** Hidden input name the storage path is submitted under */
    name: string
    onUploaded?: (path: string | null) => void
}

/**
 * Uploads a verification document to the PRIVATE provider-kyc bucket under
 * "{userId}/…". Only the storage path is submitted; admins view it through a
 * short-lived signed URL. Nothing here is ever publicly reachable.
 */
export function KycUploadField({ userId, kind, label, hint, required, capture = 'environment', name, onUploaded }: KycUploadFieldProps) {
    const [path, setPath] = useState<string | null>(null)
    const [preview, setPreview] = useState<string | null>(null)
    const [isPdf, setIsPdf] = useState(false)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const cameraRef = useRef<HTMLInputElement>(null)
    const fileRef = useRef<HTMLInputElement>(null)

    useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

    const handleFile = async (picked: File | undefined) => {
        if (!picked) return
        setError(null)
        if (picked.size > KYC_MAX_BYTES * 2) {
            setError('File is too large (max 10 MB).')
            return
        }
        setBusy(true)
        try {
            const file = await compressImage(picked)
            if (file.size > KYC_MAX_BYTES) throw new Error('File is too large (max 10 MB).')
            const key = `${userId}/${kind}-${Date.now()}.${fileExtension(file)}`
            const { error: uploadError } = await createClient()
                .storage.from(KYC_BUCKET)
                .upload(key, file, { contentType: file.type || undefined, upsert: false })
            if (uploadError) throw uploadError

            if (preview) URL.revokeObjectURL(preview)
            const pdf = file.type === 'application/pdf'
            setIsPdf(pdf)
            setPreview(pdf ? null : URL.createObjectURL(file))
            setPath(key)
            onUploaded?.(key)
        } catch (e) {
            console.error('[kyc] upload failed', e)
            setError(e instanceof Error && e.message.includes('large') ? e.message : 'Upload failed. Check your connection and try again.')
        } finally {
            setBusy(false)
        }
    }

    const done = Boolean(path)

    return (
        <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-medium">
                    {label} {required ? <span className="text-red-500">*</span> : <span className="text-xs text-muted-foreground">(optional)</span>}
                </p>
                {done && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Uploaded
                    </span>
                )}
            </div>
            {hint && <p className="text-xs text-muted-foreground -mt-1">{hint}</p>}

            <div
                className={cn(
                    'relative flex min-h-[120px] items-center gap-3 rounded-xl border-2 border-dashed p-3 transition-colors',
                    done ? 'border-green-500/50 bg-green-500/5' : error ? 'border-red-500/60' : 'border-border'
                )}
            >
                <div className="flex h-20 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                    {busy ? (
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    ) : preview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={preview} alt={`${label} preview`} className="h-full w-full object-cover" />
                    ) : isPdf ? (
                        <FileText className="h-8 w-8 text-muted-foreground" />
                    ) : (
                        <Upload className="h-6 w-6 text-muted-foreground" />
                    )}
                </div>
                <div className="flex flex-1 flex-col gap-2">
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => cameraRef.current?.click()}
                        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                    >
                        {done ? <RefreshCw className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
                        {done ? 'Retake' : 'Take photo'}
                    </button>
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => fileRef.current?.click()}
                        className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg border border-input px-3 text-sm text-muted-foreground disabled:opacity-60"
                    >
                        Choose file
                    </button>
                </div>
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}

            <input ref={cameraRef} type="file" accept="image/*" capture={capture} className="hidden"
                onChange={(e) => { void handleFile(e.target.files?.[0]); e.target.value = '' }} />
            <input ref={fileRef} type="file" accept={KYC_ACCEPT} className="hidden"
                onChange={(e) => { void handleFile(e.target.files?.[0]); e.target.value = '' }} />
            <input type="hidden" name={name} value={path ?? ''} />
        </div>
    )
}
