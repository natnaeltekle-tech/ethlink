import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { User, Mail } from 'lucide-react'

interface ProviderCardProps {
    provider: {
        id: string
        full_name?: string
        email?: string
        avatar_url?: string
        created_at?: string
    } | null
}

export function ProviderCard({ provider }: ProviderCardProps) {
    if (!provider) return null

    // Fallback Logic
    let displayName = 'Unknown Provider'
    if (provider.full_name) {
        displayName = provider.full_name
    } else if (provider.email) {
        displayName = `User (${provider.email})`
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Provider Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center overflow-hidden border border-border">
                        {provider.avatar_url ? (
                            <img src={provider.avatar_url} alt={displayName} className="h-full w-full object-cover" />
                        ) : (
                            <User className="h-6 w-6 text-primary" />
                        )}
                    </div>
                    <div>
                        <div className="font-semibold">{displayName}</div>
                        <div className="text-sm text-muted-foreground">Joined {new Date(provider.created_at || Date.now()).toLocaleDateString()}</div>
                    </div>
                </div>

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
