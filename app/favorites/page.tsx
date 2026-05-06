import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import { ServiceCard } from '@/components/service/service-card'
import { Heart } from 'lucide-react'

export default async function FavoritesPage() {
    const supabase = await createClient()

    let user = null
    try {
        const { data } = await supabase.auth.getUser()
        user = data.user
    } catch {
        // Expired/corrupt session — treat as logged out
    }

    if (!user) {
        return redirect('/auth/login')
    }

    const { data: favorites, error } = await supabase
        .from('favorites')
        .select('service_id, services(*)')
        .eq('user_id', user.id)

    if (error) {
        console.error('Error fetching favorites:', error)
    }

    const items = favorites || []

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Navbar hideSearch />

            <main className="container mx-auto px-4 py-8">
                <div className="flex items-center gap-3 mb-8">
                    <Heart className="h-6 w-6 text-primary" />
                    <h1 className="text-2xl font-bold">My Favorites</h1>
                </div>

                {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[400px] text-center border rounded-lg border-dashed border-border bg-secondary/20">
                        <Heart className="h-12 w-12 text-muted-foreground/30 mb-4" />
                        <h3 className="text-xl font-semibold">No favorites yet</h3>
                        <p className="text-muted-foreground mt-2">
                            Browse services and tap the heart icon to save your favorites here.
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {items.map((item: any) => (
                            item.services && (
                                <ServiceCard key={item.service_id} service={item.services} />
                            )
                        ))}
                    </div>
                )}
            </main>
        </div>
    )
}
