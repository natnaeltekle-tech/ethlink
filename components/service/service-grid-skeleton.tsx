import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'

/** Placeholder grid matching ServiceCard (4:3 cover) so results don't shift in. */
export function ServiceGridSkeleton({ count = 6 }: { count?: number }) {
    return (
        <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            aria-busy="true"
            aria-label="Loading services"
        >
            {Array.from({ length: count }).map((_, i) => (
                <Card key={i} className="h-full overflow-hidden border-border bg-card">
                    <Skeleton className="aspect-[4/3] w-full rounded-none" />
                    <CardContent className="p-5 space-y-3">
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-9 w-full" />
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
