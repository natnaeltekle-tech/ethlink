import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { User, Mail } from 'lucide-react'

interface ProviderCardProps {
    provider: {
        id: string
        first_name?: string
        last_name?: string
        email?: string
        avatar_url?: string
        created_at?: string
    } | null
}

export function ProviderCard({ provider }: ProviderCardProps) {
    // If no provider data at all, return null
    if (!provider) return null

    // 1. Try to combine First + Last Name
    let displayName = 'Unknown Provider'

    if (provider.first_name) {
        displayName = `${provider.first_name} ${provider.last_name || ''}`
    }
    // 2. If no name, use Email (and remove the @gmail part for privacy if you want)
    else if (provider.email) {
        displayName = provider.email.split('@')[0]
    }

    // 3. Fallback Date
    const joinDate = provider.created_at
        ? new Date(provider.created_at).toLocaleDateString()
        : "Recently"

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Provider Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                    {/* Avatar Circle */}
                    <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center overflow-hidden border border-border">
                        {provider.avatar_url ? (
                            <img src={provider.avatar_url} alt={displayName} className="h-full w-full object-cover" />
                        ) : (
                            <div className="bg-primary/20 h-full w-full flex items-center justify-center text-primary font-bold">
                                {displayName[0]?.toUpperCase()}
                            </div>
                        )}
                    </div>

                    {/* Name & Date */}
                    <div>
                        <div className="font-semibold text-foreground">{displayName}</div>
                        <div className="text-xs text-muted-foreground">Joined {joinDate}</div>
                    </div>
                </div>

                {/* Email Row */}
                {provider.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span>{provider.email}</span>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}