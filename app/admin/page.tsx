import { getAdminStats, getRecentServices, getRecentBookings } from '@/lib/admin-actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Briefcase, Calendar } from 'lucide-react'
import { DeleteServiceButton } from '@/components/admin/delete-service-button'
import Link from 'next/link'



export default async function AdminDashboard() {
    const stats = await getAdminStats()
    const recentServices = await getRecentServices()
    const recentBookings = await getRecentBookings()

    if (!stats) {
        return <div className="p-8 text-center">Loading admin data...</div>
    }

    return (
        <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalUsers}</div>
                        <p className="text-xs text-muted-foreground">
                            Registered users (approx)
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Services</CardTitle>
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalServices}</div>
                        <p className="text-xs text-muted-foreground">
                            Active listings
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalBookings}</div>
                        <p className="text-xs text-muted-foreground">
                            All time bookings
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Services Table */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Recent Services</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-8">
                            {recentServices.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No services found.</p>
                            ) : (
                                recentServices.map((service) => (
                                    <div key={service.id} className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium leading-none">
                                                <Link href={`/services/${service.id}`} className="hover:underline">
                                                    {service.title}
                                                </Link>
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {service.category} • {service.price} ETB
                                            </p>
                                        </div>
                                        <DeleteServiceButton id={service.id} title={service.title} />
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Bookings Table */}
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Recent Bookings</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-8">
                            {recentBookings.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No bookings found.</p>
                            ) : (
                                recentBookings.map((booking) => (
                                    <div key={booking.id} className="flex items-center">
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium leading-none">
                                                {/* @ts-ignore - services is joined */}
                                                {booking.services?.title || 'Unknown Service'}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {new Date(booking.date).toLocaleDateString()} •
                                                <span className={`ml-2 capitalize ${booking.status === 'confirmed' ? 'text-green-600' : 'text-yellow-600'
                                                    }`}>
                                                    {booking.status}
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
