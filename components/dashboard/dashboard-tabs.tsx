'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { SettingsTab } from '@/components/dashboard/settings-tab'
import { ProviderPanel } from '@/components/dashboard/provider-panel'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { User, Shield, Handshake, Check } from "lucide-react"
import Link from "next/link"
import { completeJob } from '@/lib/actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export function DashboardTabs({ user, bookings, providerStats, providerServices, profile }: { user: any, bookings: any[], providerStats: any, providerServices: any[], profile: any }) {
    const [activeTab, setActiveTab] = useState<'overview' | 'provider' | 'settings'>('overview')
    const [completingJob, setCompletingJob] = useState<string | null>(null)
    const router = useRouter()

    useEffect(() => {
        router.refresh()
    }, [router])

    const handleCompleteJob = async (bookingId: string) => {
        if (!confirm('Are you sure the job is completed to your satisfaction?')) return

        setCompletingJob(bookingId)
        try {
            await completeJob(bookingId)
            toast.success('Job marked as completed!')
            router.refresh()
        } catch (error) {
            toast.error('Failed to complete job')
        } finally {
            setCompletingJob(null)
        }
    }

    return (
        <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="flex p-1 bg-secondary rounded-lg w-full sm:w-fit overflow-x-auto">
                <Button
                    variant={activeTab === 'overview' ? 'default' : 'ghost'}
                    onClick={() => setActiveTab('overview')}
                    className="flex-1 sm:flex-none rounded-md"
                >
                    Overview
                </Button>
                {providerStats && (
                    <Button
                        variant={activeTab === 'provider' ? 'default' : 'ghost'}
                        onClick={() => setActiveTab('provider')}
                        className="flex-1 sm:flex-none rounded-md"
                    >
                        Provider Panel
                    </Button>
                )}
                <Button
                    variant={activeTab === 'settings' ? 'default' : 'ghost'}
                    onClick={() => setActiveTab('settings')}
                    className="flex-1 sm:flex-none rounded-md"
                >
                    Settings
                </Button>
            </div>

            {/* Tab Content */}
            <div className="mt-6">
                {activeTab === 'overview' && (
                    <div className="grid gap-6">
                        {/* User Details - Moved to Settings */}

                        {/* My Activity */}
                        <Card>
                            <CardHeader>
                                <CardTitle>My Activity</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {bookings.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground bg-secondary/30 rounded-lg border border-dashed border-border">
                                        <p>You haven't requested any services yet.</p>
                                    </div>
                                ) : (
                                    <div className="grid gap-4">
                                        {bookings.map((booking) => (
                                            <div key={booking.id} className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between p-4 border border-border rounded-lg bg-card hover:bg-secondary/50 transition-colors">
                                                <div className="space-y-1 w-full sm:w-auto">
                                                    <p className="font-bold text-lg">{booking.services?.title || 'Unknown Service'}</p>
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        <span>{new Date(booking.date).toLocaleDateString()}</span>
                                                        <span>•</span>
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${booking.status === 'paid'
                                                            ? 'bg-green-500/10 text-green-500'
                                                            : booking.status === 'completed'
                                                                ? 'bg-gray-500/10 text-gray-500' // Gray badge for completed
                                                                : booking.status === 'confirmed'
                                                                    ? 'bg-primary/10 text-primary'
                                                                    : 'bg-yellow-500/10 text-yellow-500'
                                                            }`}>
                                                            {booking.status === 'completed' ? 'Job Completed' : booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="w-full sm:w-auto flex flex-col gap-3 sm:items-end">
                                                    <p className="font-bold text-lg text-primary">{booking.services?.price} ETB</p>
                                                    {booking.status === 'pending' && (
                                                        <Button size="sm" variant="outline" disabled className="w-full sm:w-auto opacity-70">
                                                            Waiting for Approval
                                                        </Button>
                                                    )}
                                                    {booking.status === 'confirmed' && (
                                                        <Button size="sm" className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90" asChild>
                                                            <Link href={`/payment/${booking.id}`}>
                                                                Pay Now
                                                            </Link>
                                                        </Button>
                                                    )}
                                                    {booking.status === 'completed' && (
                                                        <Button size="sm" variant="secondary" disabled className="w-full sm:w-auto opacity-70">
                                                            Job Completed
                                                        </Button>
                                                    )}
                                                    {booking.status === 'paid' && (
                                                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                                            <Button
                                                                size="sm"
                                                                className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white"
                                                                onClick={() => handleCompleteJob(booking.id)}
                                                                disabled={completingJob === booking.id}
                                                            >
                                                                {completingJob === booking.id ? (
                                                                    <span className="flex items-center gap-1">
                                                                        <span className="animate-spin">⏳</span> Processing...
                                                                    </span>
                                                                ) : (
                                                                    <span className="flex items-center gap-1">
                                                                        <Check className="h-4 w-4" /> Confirm Job Done
                                                                    </span>
                                                                )}
                                                            </Button>
                                                            <Button size="sm" variant="outline" className="w-full sm:w-auto" asChild>
                                                                <Link href={`/book/success?bookingId=${booking.id}`}>
                                                                    View Receipt
                                                                </Link>
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}

                {activeTab === 'provider' && providerStats && (
                    <ProviderPanel stats={providerStats} services={providerServices} />
                )}

                {activeTab === 'settings' && (
                    <SettingsTab services={providerServices} user={user} profile={profile} />
                )}
            </div>
        </div >
    )
}
