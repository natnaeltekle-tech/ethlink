'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { SettingsTab } from '@/components/dashboard/SettingsTab'
import { ProviderPanel } from '@/components/dashboard/ProviderPanel'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { User, Shield, Handshake } from "lucide-react"
import Link from "next/link"

export function DashboardTabs({ user, bookings, providerStats, providerServices }: { user: any, bookings: any[], providerStats: any, providerServices: any[] }) {
    const [activeTab, setActiveTab] = useState<'overview' | 'provider' | 'settings'>('overview')

    return (
        <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="flex p-1 bg-slate-100 rounded-lg w-full sm:w-fit overflow-x-auto">
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
                        {/* User Details */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <User className="h-5 w-5" />
                                    User Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl">
                                        {user.email?.[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Email</p>
                                        <p className="text-lg font-medium">{user.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className={`h-12 w-12 rounded-full flex items-center justify-center ${providerServices.length > 0
                                        ? 'bg-purple-100 text-purple-600'
                                        : 'bg-blue-100 text-blue-600'
                                        }`}>
                                        <Shield className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Role</p>
                                        <p className="text-lg font-medium">
                                            {providerServices.length > 0 ? 'Vendor' : 'Customer'}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* My Activity */}
                        <Card>
                            <CardHeader>
                                <CardTitle>My Activity</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {bookings.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500 bg-gray-50 dark:bg-gray-900 rounded-lg border border-dashed">
                                        <p>You haven't requested any services yet.</p>
                                    </div>
                                ) : (
                                    <div className="grid gap-4">
                                        {bookings.map((booking) => (
                                            <div key={booking.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors">
                                                <div className="space-y-1 mb-4 sm:mb-0">
                                                    <p className="font-bold text-lg">{booking.services?.title || 'Unknown Service'}</p>
                                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                                        <span>{new Date(booking.date).toLocaleDateString()}</span>
                                                        <span>•</span>
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${booking.status === 'paid'
                                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                            : booking.status === 'confirmed'
                                                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                            }`}>
                                                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="text-right flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 sm:gap-0">
                                                    <p className="font-bold text-lg text-blue-600">{booking.services?.price} ETB</p>
                                                    {booking.status === 'pending' && (
                                                        <Button size="sm" variant="outline" disabled className="mt-0 sm:mt-2 opacity-70">
                                                            Waiting for Approval
                                                        </Button>
                                                    )}
                                                    {booking.status === 'confirmed' && (
                                                        <Button size="sm" className="mt-0 sm:mt-2 bg-blue-600 hover:bg-blue-700 text-white" asChild>
                                                            <Link href={`/payment/${booking.id}`}>
                                                                Pay Now
                                                            </Link>
                                                        </Button>
                                                    )}
                                                    {booking.status === 'paid' && (
                                                        <Button size="sm" variant="outline" asChild className="mt-0 sm:mt-2">
                                                            <Link href={`/book/success?bookingId=${booking.id}`}>
                                                                View Receipt
                                                            </Link>
                                                        </Button>
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
                    <SettingsTab services={providerServices} user={user} />
                )}
            </div>
        </div>
    )
}
