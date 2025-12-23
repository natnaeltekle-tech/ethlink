import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function ServiceDetailsLoading() {
    return (
        <div className="container mx-auto px-4 py-8">
            {/* Service Header Skeleton */}
            <div className="mb-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                    <div className="flex-1 space-y-3">
                        <Skeleton className="h-9 w-3/4" />
                        <div className="flex items-center gap-4">
                            <Skeleton className="h-5 w-32" />
                            <Skeleton className="h-5 w-24" />
                        </div>
                    </div>
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="flex items-center gap-4">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-8 w-28" />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Description and Images */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Gallery Skeleton - Big Image Box */}
                    <Skeleton className="w-full aspect-[16/9] rounded-lg" />

                    {/* About Section Skeleton */}
                    <div className="space-y-4">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                    </div>

                    {/* Reviews Section Skeleton */}
                    <div className="space-y-4">
                        <Skeleton className="h-8 w-32" />
                        {Array.from({ length: 2 }).map((_, i) => (
                            <Card key={i}>
                                <CardContent className="p-4">
                                    <div className="flex items-start gap-3">
                                        <Skeleton className="h-10 w-10 rounded-full" />
                                        <div className="flex-1 space-y-2">
                                            <Skeleton className="h-5 w-32" />
                                            <Skeleton className="h-4 w-24" />
                                            <Skeleton className="h-4 w-full" />
                                            <Skeleton className="h-4 w-3/4" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* Right Column: Provider Card and Chat Box */}
                <div className="space-y-6">
                    {/* Provider Card Skeleton */}
                    <Card>
                        <CardHeader>
                            <Skeleton className="h-6 w-32" />
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-12 w-12 rounded-full" />
                                <div className="flex-1">
                                    <Skeleton className="h-5 w-32 mb-2" />
                                    <Skeleton className="h-4 w-24" />
                                </div>
                            </div>
                            <Skeleton className="h-10 w-full" />
                        </CardContent>
                    </Card>

                    {/* Chat Box Skeleton */}
                    <Card>
                        <CardHeader>
                            <Skeleton className="h-6 w-24" />
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-3">
                                <Skeleton className="h-16 w-3/4" />
                                <Skeleton className="h-16 w-4/5 ml-auto" />
                                <Skeleton className="h-16 w-2/3" />
                            </div>
                            <Skeleton className="h-10 w-full" />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
