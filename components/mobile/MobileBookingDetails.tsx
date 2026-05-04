'use client'

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, MapPin, Star, Phone, MessageSquare, Clock, CalendarDays, CheckCircle, Navigation, CreditCard, Receipt } from 'lucide-react';
import MobilePaymentSheet from './MobilePaymentSheet';
import MobileReceipt from './MobileReceipt';

interface MobileBookingDetailsProps {
    booking: any;
    service: any;
    provider?: any;
}

export default function MobileBookingDetails({ booking, service, provider }: MobileBookingDetailsProps) {
    const router = useRouter();
    const [showPaymentSheet, setShowPaymentSheet] = useState(false);
    const [showReceipt, setShowReceipt] = useState(false);

    const imageUrl = service?.gallery?.[0] || service?.image_url || '';
    const statusColors: Record<string, string> = {
        confirmed: 'bg-[#f5c619]/10 text-[#f5c619] border-[#f5c619]/20',
        paid: 'bg-green-500/10 text-green-400 border-green-500/20',
        pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
        completed: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
        cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
    };

    if (showPaymentSheet) {
        return (
            <div className="fixed inset-0 z-[100]">
                <MobilePaymentSheet 
                    bookingId={booking?.id} 
                    amount={Math.round((service?.price || 0) * 1.05)} 
                    merchantName={provider ? `${provider.first_name} ${provider.last_name || ''}` : 'Service Provider'} 
                    onClose={() => setShowPaymentSheet(false)} 
                    onSuccess={() => {
                        setShowPaymentSheet(false);
                        setShowReceipt(true);
                        router.refresh();
                    }}
                />
            </div>
        );
    }

    if (showReceipt) {
        return (
            <div className="fixed inset-0 z-[100] bg-black">
                <MobileReceipt 
                    transactionId={`TXN-${booking?.id?.slice(0, 8).toUpperCase()}`}
                    merchantName={provider ? `${provider.first_name} ${provider.last_name || ''}` : 'Service Provider'}
                    amount={Math.round((service?.price || 0) * 1.05)}
                    date={new Date().toISOString()}
                    onClose={() => setShowReceipt(false)}
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#221e10] font-sans text-white pb-44">
            {/* Header */}
            <header className="sticky top-0 z-50 flex items-center justify-between p-4 bg-[#221e10]/95 backdrop-blur-md border-b border-white/5">
                <Link href="/dashboard" className="flex size-10 items-center justify-center rounded-full hover:bg-white/10 transition-colors">
                    <ChevronLeft className="w-6 h-6" />
                </Link>
                <h1 className="text-lg font-bold tracking-tight">Booking Details</h1>
                <div className="w-10" />
            </header>

            <main className="px-5 py-5 flex flex-col gap-6">
                {/* Status Banner */}
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                    <div className="w-12 h-12 rounded-full bg-[#f5c619]/10 flex items-center justify-center shrink-0">
                        <CheckCircle className="w-6 h-6 text-[#f5c619]" />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-white font-bold text-lg">Booking {booking?.status === 'confirmed' ? 'Confirmed' : booking?.status?.charAt(0).toUpperCase() + booking?.status?.slice(1)}</h2>
                        <p className="text-[#bab39c] text-xs mt-0.5">Booking ID: #{booking?.id?.slice(0, 8).toUpperCase()}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statusColors[booking?.status] || statusColors.pending}`}>
                        {booking?.status?.toUpperCase()}
                    </span>
                </div>

                {/* Service Card */}
                <div className="rounded-2xl overflow-hidden border border-white/5 bg-white/[0.03]">
                    <div className="w-full aspect-video bg-cover bg-center relative" style={{ backgroundImage: `url("${imageUrl}")` }}>
                        <div className="absolute inset-0 bg-gradient-to-t from-[#221e10] to-transparent" />
                        <div className="absolute bottom-4 left-4 right-4">
                            <h3 className="text-white text-xl font-bold leading-tight drop-shadow-lg">{service?.title}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <MapPin className="w-4 h-4 text-[#f5c619]" />
                                <span className="text-white/80 text-sm">{service?.location || 'Location TBD'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Date/Time Grid */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-2 p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                        <p className="text-[#bab39c] text-[10px] font-bold uppercase tracking-widest">Date</p>
                        <div className="flex items-center gap-2">
                            <CalendarDays className="w-5 h-5 text-[#f5c619]" />
                            <span className="text-white font-bold text-sm">{booking?.date ? new Date(booking.date).toLocaleDateString() : 'TBD'}</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                        <p className="text-[#bab39c] text-[10px] font-bold uppercase tracking-widest">Time</p>
                        <div className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-[#f5c619]" />
                            <span className="text-white font-bold text-sm">{booking?.date ? new Date(booking.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBD'}</span>
                        </div>
                    </div>
                </div>

                {/* Provider */}
                {provider && (
                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                        <div className="w-12 h-12 rounded-full bg-[#1A1C2E] border-2 border-[#f5c619]/20 flex items-center justify-center text-[#f5c619] font-bold bg-cover bg-center"
                            style={provider.avatar_url ? { backgroundImage: `url("${provider.avatar_url}")` } : {}}>
                            {!provider.avatar_url && (provider.first_name?.[0] || 'P')}
                        </div>
                        <div className="flex-1">
                            <p className="text-white font-bold">{provider.first_name} {provider.last_name || ''}</p>
                            <div className="flex items-center gap-1 mt-0.5">
                                <Star className="w-3.5 h-3.5 text-[#f5c619] fill-[#f5c619]" />
                                <span className="text-[#bab39c] text-xs font-medium">5.0 • Host</span>
                            </div>
                        </div>
                        <button className="size-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center"><Phone className="w-4 h-4 text-[#f5c619]" /></button>
                    </div>
                )}

                {/* Price Breakdown */}
                <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-5 flex flex-col gap-3">
                    <h3 className="text-white font-bold text-base mb-1">Payment Summary</h3>
                    <div className="flex justify-between text-sm"><span className="text-[#bab39c]">Service Fee</span><span className="text-white font-medium">{service?.price} ETB</span></div>
                    <div className="flex justify-between text-sm"><span className="text-[#bab39c]">Platform Fee</span><span className="text-white font-medium">{Math.round((service?.price || 0) * 0.05)} ETB</span></div>
                    <div className="h-px w-full bg-white/10 my-1" />
                    <div className="flex justify-between text-base"><span className="text-white font-bold">Total</span><span className="text-[#f5c619] font-bold">{Math.round((service?.price || 0) * 1.05)} ETB</span></div>
                </div>
            </main>

            {/* Bottom Actions */}
            <div className="fixed bottom-20 left-0 w-full p-5 bg-[#0B0C15]/90 backdrop-blur-xl border-t border-white/10 z-40 flex gap-3 shadow-2xl">
                <button className="flex-1 h-14 rounded-xl border border-white/20 text-white font-bold flex items-center justify-center gap-2 hover:bg-white/5 transition-colors">
                    <MessageSquare className="w-5 h-5" /> Message
                </button>
                {booking?.status === 'pending' || booking?.status === 'confirmed' ? (
                    <button onClick={() => setShowPaymentSheet(true)} className="flex-1 h-14 rounded-xl bg-[#f5c619] text-[#221e10] font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,198,25,0.3)] active:scale-[0.98] transition-all">
                        <CreditCard className="w-5 h-5" /> Pay Now
                    </button>
                ) : booking?.status === 'paid' || booking?.status === 'completed' ? (
                    <button onClick={() => setShowReceipt(true)} className="flex-1 h-14 rounded-xl bg-[#f5c619] text-[#221e10] font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,198,25,0.3)] active:scale-[0.98] transition-all">
                        <Receipt className="w-5 h-5" /> View Receipt
                    </button>
                ) : (
                    <button disabled className="flex-1 h-14 rounded-xl bg-white/5 text-white/50 font-bold flex items-center justify-center gap-2">
                        <Navigation className="w-5 h-5" /> Directions
                    </button>
                )}
            </div>
        </div>
    );
}
