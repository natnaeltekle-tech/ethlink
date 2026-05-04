'use client'

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Clock, CheckCircle, Hourglass, XCircle, ChevronRight, Calendar, MapPin } from 'lucide-react';
import { getUserBookings } from '@/lib/actions';

type TabType = 'active' | 'pending' | 'completed';

interface MobileMyBookingsProps {
    initialBookings?: any[];
}

export default function MobileMyBookings({ initialBookings }: MobileMyBookingsProps) {
    const [activeTab, setActiveTab] = useState<TabType>('active');
    const [bookings, setBookings] = useState<any[]>(initialBookings || []);
    const [isLoading, setIsLoading] = useState(!initialBookings);

    useEffect(() => {
        if (!initialBookings) {
            const load = async () => {
                try { const data = await getUserBookings(); setBookings(data || []); }
                catch (e) { console.error(e); }
                finally { setIsLoading(false); }
            };
            load();
        }
    }, [initialBookings]);

    const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
        { id: 'active', label: 'Active', icon: CheckCircle },
        { id: 'pending', label: 'Pending', icon: Hourglass },
        { id: 'completed', label: 'Completed', icon: Clock },
    ];

    const filtered = bookings.filter(b => {
        if (activeTab === 'active') return ['confirmed', 'paid'].includes(b.status);
        if (activeTab === 'pending') return b.status === 'pending';
        return ['completed', 'cancelled'].includes(b.status);
    });

    const statusConfig: Record<string, { color: string; label: string }> = {
        confirmed: { color: 'bg-[#f5c619]/10 text-[#f5c619] border-[#f5c619]/20', label: 'Confirmed' },
        paid: { color: 'bg-green-500/10 text-green-400 border-green-500/20', label: 'Paid' },
        pending: { color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', label: 'Pending' },
        completed: { color: 'bg-gray-500/10 text-gray-400 border-gray-500/20', label: 'Completed' },
        cancelled: { color: 'bg-red-500/10 text-red-400 border-red-500/20', label: 'Cancelled' },
    };

    return (
        <div className="min-h-screen bg-[#221e10] font-sans text-white pb-24">
            {/* Header */}
            <header className="sticky top-0 z-50 px-5 pt-12 pb-4 bg-[#221e10]/95 backdrop-blur-md border-b border-white/5">
                <h1 className="text-2xl font-extrabold tracking-tight text-white mb-4">My Bookings</h1>
                {/* Segmented Control */}
                <div className="flex p-1 bg-[#1a170d]/80 rounded-full border border-white/5">
                    {tabs.map(({ id, label, icon: Icon }) => (
                        <button key={id} onClick={() => setActiveTab(id)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full text-sm font-semibold transition-all ${activeTab === id
                                ? 'bg-[#f5c619] text-[#221e10] shadow-[0_0_15px_rgba(245,198,25,0.2)]'
                                : 'text-white/40 hover:text-white/70'}`}>
                            <Icon className="w-4 h-4" />
                            {label}
                        </button>
                    ))}
                </div>
            </header>

            <main className="px-5 py-5 space-y-4">
                {isLoading ? (
                    <div className="flex justify-center py-16">
                        <div className="w-8 h-8 border-2 border-[#f5c619] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-4">
                        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
                            <Calendar className="w-10 h-10 text-[#bab39c] opacity-60" />
                        </div>
                        <h3 className="text-white/80 text-base font-bold">No {activeTab} bookings</h3>
                        <p className="text-[#bab39c] text-sm text-center max-w-[250px]">Your {activeTab} bookings will appear here</p>
                    </div>
                ) : (
                    filtered.map((booking) => {
                        const img = booking.services?.gallery?.[0] || booking.services?.image_url || '';
                        const cfg = statusConfig[booking.status] || statusConfig.pending;
                        return (
                            <Link key={booking.id} href={`/dashboard`}
                                className="flex flex-col rounded-[1.5rem] overflow-hidden bg-white/[0.03] border border-white/5 backdrop-blur-sm group hover:bg-white/[0.05] transition-colors">
                                {/* Image Header */}
                                {img && (
                                    <div className="w-full h-32 bg-cover bg-center relative" style={{ backgroundImage: `url("${img}")` }}>
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#221e10] to-transparent opacity-80" />
                                        <span className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold border ${cfg.color}`}>{cfg.label}</span>
                                    </div>
                                )}
                                {/* Content */}
                                <div className="flex items-center justify-between p-4 gap-3">
                                    <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                                        <h3 className="text-white text-base font-bold leading-tight truncate">{booking.services?.title || 'Service'}</h3>
                                        <div className="flex items-center gap-3 text-[#bab39c] text-xs">
                                            <div className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-[#f5c619]" />{new Date(booking.date).toLocaleDateString()}</div>
                                            {booking.services?.location && <div className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-[#f5c619]" />{booking.services.location}</div>}
                                        </div>
                                        <span className="text-[#f5c619] font-bold text-sm mt-1">{booking.services?.price} ETB</span>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-gray-500 shrink-0 group-hover:text-[#f5c619] transition-colors" />
                                </div>
                            </Link>
                        );
                    })
                )}
            </main>
        </div>
    );
}
