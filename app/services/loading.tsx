import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

export default function ServicesLoading() {
    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header Skeleton */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-10 w-full md:w-1/3" />
            </div>

            {/* Grid of 6 Skeleton Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i} className="h-full overflow-hidden border-border bg-card">
                        {/* Image Skeleton */}
                        <Skeleton className="aspect-[4/3] w-full" />

                        <CardContent className="p-4">
                            {/* Title Skeleton */}
                            <Skeleton className="h-6 w-3/4 mb-2" />

                            {/* Location Skeleton */}
                            <div className="flex items-center mb-3">
                                <Skeleton className="h-4 w-full" />
                            </div>

                            {/* Price Skeleton */}
                            <Skeleton className="h-6 w-24" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
