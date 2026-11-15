import { Skeleton } from "@/components/ui/skeleton"
import { ServiceGridSkeleton } from "@/components/service/service-grid-skeleton"

export default function ServicesLoading() {
    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header Skeleton */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-10 w-full md:w-1/3" />
            </div>
            <ServiceGridSkeleton />
        </div>
    )
}
