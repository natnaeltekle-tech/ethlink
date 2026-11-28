import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { isNewListing } from '@/lib/listing-badges'

/** Compact "New" pill (dark #121214 / #FACC15). Renders nothing unless isNewListing(). */
export function NewBadge({ createdAt, reviewCount, className }: {
    createdAt: string | Date | null | undefined
    reviewCount: number | null | undefined
    className?: string
}) {
    if (!isNewListing(createdAt, reviewCount ?? 0)) return null
    return (
        <span className={cn(
            'pointer-events-none inline-flex items-center gap-1 rounded-full border border-[#FACC15]/50 bg-[#121214]/90 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#FACC15] shadow-sm backdrop-blur-sm',
            className,
        )}>
            <Sparkles className="h-3 w-3" aria-hidden="true" />New
        </span>
    )
}
