'use client'

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Star, Send, ChevronLeft, Loader2 } from 'lucide-react';
import { reviewBooking } from '@/lib/actions/dashboard';

interface MobileReviewFormProps {
    bookingId: string;
    serviceName: string;
    serviceImage?: string;
    serviceLocation?: string;
    onClose?: () => void;
}

const RATING_LABELS = ['', 'Poor', 'Fair', 'Good', 'Excellent', 'Outstanding'];

export default function MobileReviewForm({
    bookingId,
    serviceName,
    serviceImage,
    serviceLocation,
    onClose
}: MobileReviewFormProps) {
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (rating === 0) {
            toast.error('Please select a rating');
            return;
        }

        setIsSubmitting(true);
        const r = await reviewBooking(bookingId, rating, comment);
        setIsSubmitting(false);
        if (!r.ok) {
            toast.error(r.error);
            return;
        }
        toast.success('Review submitted — thank you!');
        router.refresh();
        onClose?.();
    };

    const activeRating = hoverRating || rating;

    return (
        <div className="min-h-screen bg-[#0B0C15] font-sans text-white flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 flex items-center justify-between p-4 bg-[#0B0C15]/95 backdrop-blur-md border-b border-white/5">
                <button
                    onClick={onClose}
                    className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/10 transition-colors"
                >
                    <ChevronLeft className="w-6 h-6 text-white" />
                </button>
                <h1 className="text-lg font-bold tracking-tight text-white flex-1 text-center pr-10">Rate Experience</h1>
            </header>

            {/* Scrollable Content */}
            <main className="flex-1 flex flex-col px-5 pb-44 pt-6 gap-8">
                {/* Service Summary Card */}
                <div className="relative overflow-hidden rounded-xl border border-[#f5c619]/20 bg-white/[0.03] p-3 shadow-lg backdrop-blur-sm">
                    <div className="flex items-center gap-4">
                        <div
                            className="w-20 h-20 shrink-0 rounded-lg bg-cover bg-center border border-white/10 relative overflow-hidden bg-[#1A1C2E]"
                            style={serviceImage ? { backgroundImage: `url("${serviceImage}")` } : {}}
                        >
                            <div className="absolute inset-0 bg-black/10"></div>
                        </div>
                        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                            <h3 className="text-white text-lg font-bold leading-tight truncate">{serviceName}</h3>
                            {serviceLocation && (
                                <div className="flex items-center gap-1 text-gray-400">
                                    <span className="text-[#f5c619] text-sm">📍</span>
                                    <p className="text-sm font-medium truncate">{serviceLocation}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Rating Section */}
                <div className="flex flex-col items-center gap-4">
                    <h2 className="text-2xl font-bold text-center text-white">How was your experience?</h2>
                    <div className="flex items-center gap-3">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                className="group transition-transform active:scale-90 focus:outline-none"
                                onMouseEnter={() => setHoverRating(star)}
                                onMouseLeave={() => setHoverRating(0)}
                                onClick={() => setRating(star)}
                            >
                                <Star
                                    className={`w-10 h-10 transition-all ${
                                        star <= activeRating
                                            ? 'text-[#f5c619] fill-[#f5c619] drop-shadow-[0_0_8px_rgba(245,198,25,0.4)]'
                                            : 'text-gray-600'
                                    }`}
                                />
                            </button>
                        ))}
                    </div>
                    {activeRating > 0 && (
                        <span className="text-[#f5c619] font-medium text-sm tracking-wide uppercase">
                            {RATING_LABELS[activeRating]}
                        </span>
                    )}
                </div>

                {/* Review Input Area */}
                <div className="flex flex-col gap-3">
                    <label className="text-white text-base font-semibold pl-1" htmlFor="review">Write your review</label>
                    <div className="relative">
                        <textarea
                            className="w-full h-40 bg-white/[0.03] border border-white/10 rounded-xl p-4 text-base text-white placeholder-gray-500 focus:outline-none focus:border-[#f5c619]/60 focus:ring-1 focus:ring-[#f5c619]/60 transition-all resize-none shadow-inner"
                            id="review"
                            placeholder="Share details of your own experience at this place. What did you like the most?"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            maxLength={1000}
                        />
                        <div className="absolute bottom-3 right-3 pointer-events-none">
                            <Send className="w-5 h-5 text-[#f5c619]/30" />
                        </div>
                    </div>
                </div>

            </main>

            {/* Sticky Bottom Button */}
            <div className="fixed bottom-20 left-0 w-full p-5 bg-gradient-to-t from-[#0B0C15] via-[#0B0C15]/95 to-transparent backdrop-blur-[2px] z-40">
                <button
                    onClick={handleSubmit}
                    disabled={rating === 0 || isSubmitting}
                    className="w-full bg-[#f5c619] text-[#0B0C15] text-lg font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(245,198,25,0.3)] hover:shadow-[0_0_30px_rgba(245,198,25,0.5)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {isSubmitting ? (
                        <><Loader2 className="w-5 h-5 animate-spin" /> Submitting...</>
                    ) : (
                        <><span>Submit Review</span><Send className="w-5 h-5 font-bold" /></>
                    )}
                </button>
            </div>
        </div>
    );
}
