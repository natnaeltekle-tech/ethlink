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
                <Briefcase className="h-6 w-6 text-primary" />
                Provider Panel
            </h2>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Earnings Card */}
                <Card className="bg-gradient-to-br from-primary/10 to-secondary/50 border-primary/20">
                    <Card className="bg-background/50 backdrop-blur">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Earnings (Net)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-500">
                                {new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(stats.earnings)}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                +0% from last month
                            </p>
                        </CardContent>
                    </Card>
                    <CardContent>
                        <p className="text-sm text-primary mt-1">
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
                                <div key={service.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg border border-border">
                                    <div className="font-medium">{service.title}</div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs ${service.is_active ? 'text-green-500' : 'text-muted-foreground'}`}>
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
                        <div className="text-center py-8 text-muted-foreground">
                            No pending requests at the moment.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {bookings.map((booking: any) => (
                                <div key={booking.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border border-border rounded-lg bg-card text-card-foreground">
                                    <div className="mb-4 sm:mb-0">
                                        <div className="font-bold text-lg">{booking.services?.title}</div>
                                        <div className="text-sm text-muted-foreground">
                                            {new Date(booking.date).toLocaleString()} • {booking.guests || 1} Guest(s)
                                        </div>
                                        <div className="text-sm font-medium text-primary mt-1">
                                            Potential Earnings: {booking.services?.price} ETB
                                        </div>
                                    </div>
                                    <div className="flex gap-2 w-full sm:w-auto">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="flex-1 sm:flex-none text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
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
            <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="bg-transparent border-b border-primary/10">
                    <CardTitle className="flex items-center gap-2 text-primary">
                        <Calendar className="h-5 w-5" />
                        Upcoming Jobs
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    {upcomingJobs.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No upcoming jobs scheduled.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {upcomingJobs.map((booking: any) => (
                                <div key={booking.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border border-border rounded-lg bg-card text-card-foreground">
                                    <div className="mb-4 sm:mb-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="font-bold text-lg">{booking.services?.title}</div>
                                            <Badge variant={booking.status === 'paid' ? 'default' : 'secondary'}
                                                className={booking.status === 'paid' ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20' : 'bg-primary/10 text-primary hover:bg-primary/20'}>
                                                {booking.status === 'paid' ? 'Paid' : 'Confirmed'}
                                            </Badge>
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            {new Date(booking.date).toLocaleString()} • {booking.guests || 1} Guest(s)
                                        </div>
                                        <div className="text-sm font-medium text-primary mt-1">
                                            Earnings: {booking.services?.price} ETB
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="w-full sm:w-auto text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
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
