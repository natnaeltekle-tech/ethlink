'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heart } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { toggleFavorite } from '@/lib/actions'
import { cn } from '@/lib/utils'

/** IDs of services the signed-in user has saved (empty when signed out). */
export function useFavoriteIds() {
    const [ids, setIds] = useState<Set<string>>(new Set())
    const [signedIn, setSignedIn] = useState(false)
    useEffect(() => {
        const supabase = createClient()
        let alive = true
        ;(async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user || !alive) return
            setSignedIn(true)
            const { data } = await supabase.from('favorites').select('service_id').eq('user_id', user.id)
            if (alive) setIds(new Set((data ?? []).map((f) => f.service_id).filter((x): x is string => !!x)))
        })().catch(() => {})
        return () => { alive = false }
    }, [])
    return { ids, setIds, signedIn }
}

export function FavoriteHeart({ serviceId, saved, signedIn, onChange, className }: {
    serviceId: string; saved: boolean; signedIn: boolean; onChange: (saved: boolean) => void; className?: string
}) {
    const router = useRouter()
    const [busy, setBusy] = useState(false)
    return (
        <button
            type="button"
            aria-label={saved ? 'Remove from saved' : 'Save service'}
            aria-pressed={saved}
            disabled={busy}
            className={cn('rounded-full bg-black/50 p-2 text-white backdrop-blur-md', className)}
            onClick={async (e) => {
                e.preventDefault()
                e.stopPropagation()
                if (!signedIn) return router.push(`/auth/login?next=/services/${serviceId}`)
                setBusy(true)
                onChange(!saved)
                try {
                    const r = await toggleFavorite(serviceId)
                    onChange(r.isFavorite)
                    toast.success(r.isFavorite ? 'Saved — find it in your dashboard' : 'Removed from saved')
                } catch {
                    onChange(saved)
                    toast.error('Could not update saved services')
                } finally {
                    setBusy(false)
                }
            }}
        >
            <Heart className={cn('h-5 w-5 transition-colors', saved && 'fill-red-500 text-red-500')} />
        </button>
    )
}
