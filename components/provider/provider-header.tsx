import { Avatar } from '@/components/dashboard/common'
import { TrustBadges } from '@/components/provider/trust-badges'
import { displayName, type Viewer } from '@/lib/viewer'

/** Business header for the provider workspace. */
export function ProviderHeader({ viewer, subtitle, badges = true }: { viewer: Viewer; subtitle?: string; badges?: boolean }) {
    const person = displayName(viewer)
    const business = viewer.accountType === 'business' && viewer.businessName ? viewer.businessName : null
    return (
        <header className="flex items-center gap-3">
            <Avatar name={business ?? person} url={viewer.avatarUrl} size={56} />
            <div className="min-w-0 flex-1">
                <h1 className="truncate text-xl font-bold">{business ?? person}</h1>
                {(business || subtitle) && <p className="truncate text-sm text-muted-foreground">{business ? person : subtitle}</p>}
                {badges && <TrustBadges isVerified={viewer.isVerified} hasLicense={viewer.hasLicense} className="mt-1" />}
            </div>
        </header>
    )
}
