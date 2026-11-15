import { BadgeCheck, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/** "✔ ID & Phone Verified" and "✔ Licensed Business" — set only by admin review. */
export function TrustBadges({ isVerified, hasLicense, className }: {
    isVerified?: boolean | null
    hasLicense?: boolean | null
    className?: string
}) {
    if (!isVerified && !hasLicense) return null
    return (
        <div className={cn('flex flex-wrap gap-1.5', className)}>
            {isVerified && (
                <span className="inline-flex items-center gap-1 rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-[11px] font-semibold text-green-600 dark:text-green-400">
                    <BadgeCheck className="h-3.5 w-3.5" /> ID &amp; Phone Verified
                </span>
            )}
            {hasLicense && (
                <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[11px] font-semibold text-sky-600 dark:text-sky-400">
                    <Building2 className="h-3.5 w-3.5" /> Licensed Business
                </span>
            )}
        </div>
    )
}
