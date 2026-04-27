'use client'

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ChevronLeft, Star, User, Calendar, ArrowRight, CheckCircle, Users } from 'lucide-react';
import { createBookingJson } from '@/lib/actions';

export default function MobileBooking({ service }: { service: any }) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();

    const imageUrl = service.gallery?.[0] || service.image_url || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800';
    const showGuestSelector = ['Hospitality', 'Transport', 'Events'].includes(service.category);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);

        const formData = new FormData(e.currentTarget);

        // Required by the backend
        formData.set('serviceId', service.id);

        // If guest selector is hidden, ensure we send 1
        if (!showGuestSelector) {
            formData.set('guests', '1');
        }

        // Convert datetime-local value to proper ISO string
        const rawDate = formData.get('date') as string;
        if (rawDate) {
            const isoDate = new Date(rawDate).toISOString();
            formData.set('date', isoDate);
        }

        try {
            const result = await createBookingJson(formData);

            if (result.error) {
                toast.error(result.error);
            } else if (result.success && result.bookingId) {
                toast.success("Booking Initiated! Redirecting to payment...");
                router.push(`/payment/${result.bookingId}`);
            }
        } catch (error) {
            console.error('Booking error:', error);
            toast.error("Failed to create booking. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-[#f8f8f5] dark:bg-[#221e10] font-sans text-slate-900 dark:text-white min-h-screen">
            {/* Top App Bar */}
            <div className="flex items-center p-4 pb-2 justify-between sticky top-0 z-20 bg-[#f8f8f5]/95 dark:bg-[#221e10]/95 backdrop-blur-sm">
                <Link href={`/services/${service.id}`} className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors group">
                    <ChevronLeft className="w-6 h-6 text-slate-900 dark:text-white group-hover:text-[#f5c619] transition-colors ml-[-2px]" />
                </Link>
                <h2 className="text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-10">Inquiry</h2>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 flex flex-col px-4 pt-2 pb-32">
                {/* Service Summary Card */}
                <div className="mt-2 mb-6">
                    <div className="flex items-stretch justify-between gap-4 rounded-xl bg-white dark:bg-white/5 p-4 shadow-sm border border-slate-200 dark:border-white/5">
                        <div className="flex flex-col gap-1 flex-[2_2_0px] justify-center">
                            <p className="text-slate-500 dark:text-[#bab39c] text-xs font-semibold uppercase tracking-wider">Selected Service</p>
                            <p className="text-slate-900 dark:text-white text-base font-bold leading-tight line-clamp-2">{service.title}</p>
                            <div className="flex items-center gap-1 mt-1">
                                <Star className="w-[18px] h-[18px] text-[#f5c619] fill-[#f5c619]" />
                                <p className="text-slate-500 dark:text-[#bab39c] text-xs font-medium leading-normal">5.0 <span className="font-normal">(Reviews)</span></p>
                            </div>
                        </div>
                        <div 
                            className="w-24 h-24 bg-center bg-no-repeat bg-cover rounded-lg flex-none shadow-inner" 
                            style={{ backgroundImage: `url("${imageUrl}")` }}
                        ></div>
                    </div>
                </div>

                {/* Headline */}
                <div className="mb-6">
                    <h3 className="tracking-tight text-2xl font-bold leading-tight text-left">Complete your Request</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Please fill in the details below to secure your reservation.</p>
                </div>

                {/* Form Fields */}
                <form id="mobile-booking-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
                    {/* Full Name Placeholder (for aesthetic, our backend uses the user's session normally) */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium ml-1 text-slate-700 dark:text-slate-200" htmlFor="fullname">Full Name</label>
                        <div className="relative">
                            <input 
                                className="w-full rounded-full border border-slate-200 dark:border-[#544f3b] bg-white dark:bg-[#2d291e] h-14 px-5 pl-12 text-base placeholder:text-slate-400 dark:placeholder:text-[#bab39c] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#f5c619]/50 focus:border-[#f5c619] transition-all shadow-sm" 
                                id="fullname" 
                                name="fullname"
                                placeholder="e.g. Elena Fisher" 
                                type="text"
                                required
                            />
                            <User className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* Preferred Date */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium ml-1 text-slate-700 dark:text-slate-200" htmlFor="date">Preferred Date</label>
                        <div className="relative cursor-pointer">
                            <input 
                                className="w-full rounded-full border border-slate-200 dark:border-[#544f3b] bg-white dark:bg-[#2d291e] h-14 px-5 pl-12 text-base placeholder:text-slate-400 dark:placeholder:text-[#bab39c] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#f5c619]/50 focus:border-[#f5c619] transition-all shadow-sm [color-scheme:light] dark:[color-scheme:dark]" 
                                id="date" 
                                name="date"
                                type="datetime-local"
                                min={new Date().toISOString().slice(0, 16)}
                                required
                            />
                            <Calendar className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none bg-white dark:bg-[#2d291e] pr-2 box-content" />
                        </div>
                    </div>

                    {/* Guest Selector (Conditional) */}
                    {showGuestSelector && (
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium ml-1 text-slate-700 dark:text-slate-200" htmlFor="guests">Guests / Qty</label>
                            <div className="relative">
                                <select 
                                    className="w-full rounded-full border border-slate-200 dark:border-[#544f3b] bg-white dark:bg-[#2d291e] h-14 px-5 pl-12 text-base placeholder:text-slate-400 dark:placeholder:text-[#bab39c] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#f5c619]/50 focus:border-[#f5c619] transition-all shadow-sm appearance-none" 
                                    id="guests" 
                                    name="guests"
                                    defaultValue="1"
                                >
                                    <option value="1">1 Person</option>
                                    <option value="2">2 People</option>
                                    <option value="3">3 People</option>
                                    <option value="4">4 People</option>
                                    <option value="5">5+ Group</option>
                                </select>
                                <Users className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none bg-white dark:bg-[#2d291e] pr-2 box-content" />
                            </div>
                        </div>
                    )}

                    {/* Message */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium ml-1 text-slate-700 dark:text-slate-200" htmlFor="message">Special Requests</label>
                        <div className="relative">
                            <textarea 
                                className="w-full rounded-3xl border border-slate-200 dark:border-[#544f3b] bg-white dark:bg-[#2d291e] p-5 text-base placeholder:text-slate-400 dark:placeholder:text-[#bab39c] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#f5c619]/50 focus:border-[#f5c619] transition-all shadow-sm resize-none" 
                                id="message" 
                                name="notes"
                                placeholder="Any dietary restrictions, specific location preferences, or special occasions?" 
                                rows={4}
                            ></textarea>
                        </div>
                    </div>
                </form>
            </div>

            {/* Sticky Footer Action */}
            <div className="fixed bottom-0 left-0 w-full bg-[#f8f8f5] dark:bg-[#221e10] border-t border-slate-200 dark:border-white/5 p-4 pb-8 z-30">
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-center gap-2 mb-1">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">Usually responds within 1 hour</p>
                    </div>
                    <button 
                        form="mobile-booking-form"
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-[#f5c619] hover:bg-yellow-400 disabled:opacity-50 active:scale-[0.98] transition-all text-[#221e10] font-bold text-lg h-14 rounded-full shadow-[0_0_20px_rgba(245,198,25,0.3)] flex items-center justify-center gap-2"
                    >
                        <span>{isSubmitting ? 'Processing...' : 'Send Inquiry'}</span>
                        {!isSubmitting && <ArrowRight className="w-6 h-6 font-bold" />}
                    </button>
                </div>
            </div>
        </div>
    );
}
