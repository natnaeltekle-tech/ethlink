'use client'

import React from 'react';
import Link from 'next/link';
import { CheckCircle, Calendar, MapPin, Copy, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

interface MobileBookingSuccessProps {
    bookingId: string;
    serviceName: string;
    serviceImage?: string;
    serviceLocation?: string;
    bookingDate?: string;
    totalAmount?: number;
}

export default function MobileBookingSuccess({
    bookingId, serviceName, serviceImage, serviceLocation, bookingDate, totalAmount
}: MobileBookingSuccessProps) {
    const shortId = bookingId?.slice(0, 8).toUpperCase() || 'N/A';

    const copyId = () => {
        navigator.clipboard.writeText(bookingId || '');
        toast.success('Booking ID copied!');
    };

    return (
        <div className="min-h-screen bg-[#221e10] font-sans text-white flex flex-col relative overflow-hidden">
            {/* Ambient glow effects */}
            <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[80%] h-[40%] bg-[#f5c619]/15 blur-[100px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[20%] right-[-20%] w-[60%] h-[30%] bg-[#f5c619]/5 blur-[80px] rounded-full pointer-events-none" />

            <main className="relative z-10 flex-1 flex flex-col items-center px-6 pt-16 pb-44">
                {/* Success Icon */}
                <div className="relative mb-8">
                    <div className="absolute inset-0 bg-[#f5c619]/20 blur-xl rounded-full scale-150" />
                    <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-[#f5c619]/20 to-transparent flex items-center justify-center border-2 border-[#f5c619]/30 shadow-[0_0_30px_rgba(245,198,25,0.15)]">
                        <CheckCircle className="w-14 h-14 text-[#f5c619] drop-shadow-[0_2px_10px_rgba(245,198,25,0.5)]" />
                    </div>
                </div>

                {/* Title */}
                <h1 className="text-3xl font-extrabold tracking-tight text-center text-white mb-2">Booking Confirmed!</h1>
                <p className="text-[#bab39c] text-base text-center max-w-[300px] mb-8">Your reservation has been successfully placed. The host will be notified.</p>

                {/* Glassmorphic Summary Card */}
                <div className="w-full rounded-2xl overflow-hidden border border-[#f5c619]/20 shadow-2xl" style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(12px)' }}>
                    {/* Service Image */}
                    {serviceImage && (
                        <div className="w-full h-40 bg-cover bg-center relative" style={{ backgroundImage: `url("${serviceImage}")` }}>
                            <div className="absolute inset-0 bg-gradient-to-t from-[#1a170d] to-transparent" />
                        </div>
                    )}

                    <div className="p-5 flex flex-col gap-4">
                        <h3 className="text-white text-xl font-bold leading-tight">{serviceName}</h3>

                        {serviceLocation && (
                            <div className="flex items-center gap-2 text-[#bab39c]">
                                <MapPin className="w-4 h-4 text-[#f5c619]" />
                                <span className="text-sm">{serviceLocation}</span>
                            </div>
                        )}

                        {bookingDate && (
                            <div className="flex items-center gap-2 text-[#bab39c]">
                                <Calendar className="w-4 h-4 text-[#f5c619]" />
                                <span className="text-sm">{new Date(bookingDate).toLocaleString()}</span>
                            </div>
                        )}

                        {/* Divider */}
                        <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                        {/* Total */}
                        {totalAmount && (
                            <div className="flex justify-between items-center">
                                <span className="text-[#bab39c] text-sm">Total Paid</span>
                                <span className="text-[#f5c619] text-2xl font-bold">{totalAmount.toLocaleString()} <span className="text-sm font-normal text-[#bab39c]">ETB</span></span>
                            </div>
                        )}

                        {/* Booking ID */}
                        <div className="flex items-center justify-between bg-black/30 rounded-lg p-3 border border-white/5">
                            <div>
                                <p className="text-[10px] text-[#bab39c]/60 uppercase tracking-widest font-bold">Booking ID</p>
                                <p className="text-[#f5c619] font-mono text-base tracking-wider mt-0.5">#{shortId}</p>
                            </div>
                            <button onClick={copyId} className="text-white/40 hover:text-[#f5c619] transition-colors p-2">
                                <Copy className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            {/* Bottom Actions */}
            <div className="fixed bottom-20 left-0 w-full p-5 bg-gradient-to-t from-[#0B0C15] via-[#0B0C15]/95 to-transparent backdrop-blur-md z-40 flex flex-col gap-3">
                <Link href="/dashboard"
                    className="w-full bg-[#f5c619] text-[#221e10] font-bold text-lg py-4 rounded-xl shadow-[0_0_20px_rgba(245,198,25,0.3)] flex items-center justify-center gap-2 active:scale-[0.98] transition-all">
                    View Booking Details <ArrowRight className="w-5 h-5" />
                </Link>
                <Link href="/"
                    className="w-full py-4 rounded-xl border border-white/20 text-white font-bold text-base flex items-center justify-center hover:bg-white/5 transition-colors">
                    Back to Home
                </Link>
            </div>
        </div>
    );
}
