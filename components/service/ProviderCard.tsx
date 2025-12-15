import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar' // Assuming we have Avatar, if not I'll use a div
import { Calendar, Mail, User } from 'lucide-react'

// I need to check if Avatar component exists, if not I'll implement a simple one or use standard HTML
// I'll assume it exists or I'll check components/ui again. I didn't see it in the list earlier.
// I'll use standard elements for now to be safe.

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

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Provider Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center overflow-hidden border border-border">
                        {provider.avatar_url ? (
                            <img src={provider.avatar_url} alt={provider.full_name || 'Provider'} className="h-full w-full object-cover" />
                        ) : (
                            <User className="h-6 w-6 text-primary" />
                        )}
                    </div>
                    <div>
                        <div className="font-semibold">{provider.full_name || 'Unknown Provider'}</div>
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
