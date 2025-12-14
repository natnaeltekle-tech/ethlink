'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { updateBookingStatus, toggleServiceStatus } from "@/lib/actions"
import { Loader2, Check, X, DollarSign, Briefcase, Settings, Calendar, AlertTriangle } from "lucide-react"

interface ProviderPanelProps {
    stats: {
        earnings: number
        pendingBookings: any[]
        allBookings: any[]
    }
    services: any[]
}

export function ProviderPanel({ stats, services }: ProviderPanelProps) {
    const router = useRouter()
    const [isUpdating, setIsUpdating] = useState<string | null>(null)
    // Local state for immediate UI updates
    const [bookings, setBookings] = useState(stats.pendingBookings)
    // Upcoming jobs (confirmed or paid)
    const [upcomingJobs, setUpcomingJobs] = useState(stats.allBookings.filter((b: any) => b.status === 'confirmed' || b.status === 'paid'))

    // Sync with server state if it changes (e.g. revalidation)
    useEffect(() => {
        setBookings(stats.pendingBookings)
        setUpcomingJobs(stats.allBookings.filter((b: any) => b.status === 'confirmed' || b.status === 'paid'))
    }, [stats.pendingBookings, stats.allBookings])

    const handleBookingAction = async (bookingId: string, action: 'confirmed' | 'cancelled') => {
        setIsUpdating(bookingId)
        try {
            await updateBookingStatus(bookingId, action)
            router.refresh()
            // Optimistic update
            if (action === 'confirmed') {
                // Move from pending to upcoming
                const confirmedBooking = bookings.find(b => b.id === bookingId)
                if (confirmedBooking) {
                    setBookings(prev => prev.filter(b => b.id !== bookingId))
                    setUpcomingJobs(prev => [{ ...confirmedBooking, status: 'confirmed' }, ...prev])
                }
            } else {
                // Cancelled from pending
                setBookings(prev => prev.filter(b => b.id !== bookingId))
            }
            toast.success(`Booking ${action === 'confirmed' ? 'accepted' : 'rejected'}`)
        } catch (error) {
            toast.error("Failed to update booking")
        } finally {
            setIsUpdating(null)
        }
    }

    const handleCancelUpcoming = async (bookingId: string) => {
        if (!confirm("Are you sure you want to cancel this job? This action cannot be undone.")) return

        setIsUpdating(bookingId)
        try {
            await updateBookingStatus(bookingId, 'cancelled')
            router.refresh()
            // Optimistic update: Remove from upcoming list
            setUpcomingJobs(prev => prev.filter(b => b.id !== bookingId))
            toast.success("Job cancelled successfully")
        } catch (error) {
            toast.error("Failed to cancel job")
        } finally {
            setIsUpdating(null)
        }
    }

    const handleToggleService = async (serviceId: string, currentState: boolean) => {
        setIsUpdating(serviceId)
        try {
            await toggleServiceStatus(serviceId, !currentState)
            toast.success(`Service is now ${!currentState ? 'Active' : 'Inactive'}`)
        } catch (error) {
            toast.error("Failed to update service status")
        } finally {
            setIsUpdating(null)
        }
    }

    return (
        <div className="space-y-8 mt-12 border-t pt-8">
            <h2 className="text-2xl font-bold flex items-center gap-2">
                <Briefcase className="h-6 w-6 text-blue-600" />
                Provider Panel
            </h2>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Earnings Card */}
                <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-100 dark:border-blue-800">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Earnings (Net)</CardTitle>
                            <span className="font-bold text-green-600">ETB</span>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">{stats.earnings}</div>
                            <p className="text-xs text-muted-foreground">
                                +0% from last month
                            </p>
                        </CardContent>
                    </Card>
                    <CardContent>
                        <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                            From {stats.allBookings.filter((b: any) => b.status === 'confirmed').length} confirmed bookings
                        </p>
                    </CardContent>
                </Card>

                {/* Manage Services Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Settings className="h-5 w-5" />
                            My Services
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {services.map((service) => (
                                <div key={service.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                                    <div className="font-medium">{service.title}</div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs ${service.is_active ? 'text-green-600' : 'text-gray-500'}`}>
                                            {service.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                        <Switch
                                            checked={service.is_active}
                                            onCheckedChange={() => handleToggleService(service.id, service.is_active)}
                                            disabled={isUpdating === service.id}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Manage Requests */}
            <Card>
                <CardHeader>
                    <CardTitle>Pending Requests</CardTitle>
                </CardHeader>
                <CardContent>
                    {bookings.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            No pending requests at the moment.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {bookings.map((booking: any) => (
                                <div key={booking.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg bg-white dark:bg-gray-950">
                                    <div className="mb-4 sm:mb-0">
                                        <div className="font-bold text-lg">{booking.services?.title}</div>
                                        <div className="text-sm text-gray-500">
                                            {new Date(booking.date).toLocaleString()} • {booking.guests || 1} Guest(s)
                                        </div>
                                        <div className="text-sm font-medium text-blue-600 mt-1">
                                            Potential Earnings: {booking.services?.price} ETB
                                        </div>
                                    </div>
                                    <div className="flex gap-2 w-full sm:w-auto">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="flex-1 sm:flex-none text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                            onClick={() => handleBookingAction(booking.id, 'cancelled')}
                                            disabled={isUpdating === booking.id}
                                        >
                                            {isUpdating === booking.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4 mr-1" />}
                                            Reject
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white"
                                            onClick={() => handleBookingAction(booking.id, 'confirmed')}
                                            disabled={isUpdating === booking.id}
                                        >
                                            {isUpdating === booking.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                                            Accept
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>


            {/* Upcoming Jobs */}
            <Card className="border-blue-100 dark:border-blue-900">
                <CardHeader className="bg-blue-50/50 dark:bg-blue-900/10">
                    <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                        <Calendar className="h-5 w-5" />
                        Upcoming Jobs
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    {upcomingJobs.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            No upcoming jobs scheduled.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {upcomingJobs.map((booking: any) => (
                                <div key={booking.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg bg-white dark:bg-gray-950">
                                    <div className="mb-4 sm:mb-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="font-bold text-lg">{booking.services?.title}</div>
                                            <Badge variant={booking.status === 'paid' ? 'default' : 'secondary'}
                                                className={booking.status === 'paid' ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'bg-blue-100 text-blue-700 hover:bg-blue-100'}>
                                                {booking.status === 'paid' ? 'Paid' : 'Confirmed'}
                                            </Badge>
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {new Date(booking.date).toLocaleString()} • {booking.guests || 1} Guest(s)
                                        </div>
                                        <div className="text-sm font-medium text-blue-600 mt-1">
                                            Earnings: {booking.services?.price} ETB
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="w-full sm:w-auto text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                        onClick={() => handleCancelUpcoming(booking.id)}
                                        disabled={isUpdating === booking.id}
                                    >
                                        {isUpdating === booking.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4 mr-1" />}
                                        Cancel Job
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div >
    )
}
