import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Navbar } from "@/components/navbar"

export default function DashboardLoading() {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <Navbar hideSearch />

            <main className="container mx-auto px-4 py-8 max-w-3xl">
                <Skeleton className="h-10 w-48 mb-8" />

                {/* Tab Navigation Skeleton */}
                <div className="flex p-1 bg-secondary rounded-lg w-full sm:w-fit mb-6">
                    <Skeleton className="h-10 w-24 m-1" />
                    <Skeleton className="h-10 w-32 m-1" />
                    <Skeleton className="h-10 w-24 m-1" />
                </div>

                <div className="grid gap-6">
                    {/* User Details Card Skeleton */}
                    <Card>
                        <CardHeader>
                            <Skeleton className="h-6 w-32" />
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center gap-4">
                                <Skeleton className="h-12 w-12 rounded-full" />
                                <div className="flex-1">
                                    <Skeleton className="h-4 w-16 mb-2" />
                                    <Skeleton className="h-6 w-48" />
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <Skeleton className="h-12 w-12 rounded-full" />
                                <div className="flex-1">
                                    <Skeleton className="h-4 w-16 mb-2" />
                                    <Skeleton className="h-6 w-24" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Activity Card Skeleton */}
                    <Card>
                        <CardHeader>
                            <Skeleton className="h-6 w-32" />
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-border rounded-lg bg-card">
                                        <div className="space-y-2 mb-4 sm:mb-0 flex-1">
                                            <Skeleton className="h-6 w-3/4" />
                                            <div className="flex items-center gap-2">
                                                <Skeleton className="h-4 w-24" />
                                                <Skeleton className="h-4 w-16" />
                                            </div>
                                        </div>
                                        <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2">
                                            <Skeleton className="h-6 w-20" />
                                            <Skeleton className="h-9 w-24" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Log Out Button Skeleton */}
                <div className="flex justify-end mt-8">
                    <Skeleton className="h-11 w-24" />
                </div>
            </main>
        </div>
    )
}
