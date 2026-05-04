'use client'

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Star, Camera, X, Send, ChevronLeft, Loader2 } from 'lucide-react';
import { submitReview } from '@/lib/actions';

interface MobileReviewFormProps {
    serviceId: string;
    serviceName: string;
    serviceImage?: string;
    serviceLocation?: string;
    onClose?: () => void;
}

const RATING_LABELS = ['', 'Poor', 'Fair', 'Good', 'Excellent', 'Outstanding'];

export default function MobileReviewForm({
    serviceId,
    serviceName,
    serviceImage,
    serviceLocation,
    onClose
}: MobileReviewFormProps) {
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [photos, setPhotos] = useState<string[]>([]);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (rating === 0) {
            toast.error('Please select a rating');
            return;
        }

        setIsSubmitting(true);
        try {
            await submitReview(serviceId, rating, comment);
            toast.success('Review submitted successfully!');
            router.refresh();
            onClose?.();
        } catch (error) {
            console.error('Failed to submit review:', error);
            toast.error('Failed to submit review. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const removePhoto = (index: number) => {
        setPhotos(prev => prev.filter((_, i) => i !== index));
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
            <main className="flex-1 flex flex-col px-5 pb-32 pt-6 gap-8">
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
                        />
                        <div className="absolute bottom-3 right-3 pointer-events-none">
                            <Send className="w-5 h-5 text-[#f5c619]/30" />
                        </div>
                    </div>
                </div>

                {/* Photo Upload Section */}
                <div className="flex flex-col gap-3">
                    <label className="text-white text-base font-semibold pl-1">Add Photos</label>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                        {/* Upload Button */}
                        <button className="flex flex-col items-center justify-center w-24 h-24 shrink-0 rounded-xl border border-dashed border-[#f5c619]/40 bg-[#f5c619]/5 hover:bg-[#f5c619]/10 transition-colors gap-2 group">
                            <Camera className="w-6 h-6 text-[#f5c619] group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] font-bold text-[#f5c619] uppercase tracking-wide">Upload</span>
                        </button>
                        {/* Preview Images */}
                        {photos.map((photo, index) => (
                            <div key={index} className="relative w-24 h-24 shrink-0 rounded-xl overflow-hidden group border border-white/10">
                                <img className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" src={photo} alt={`Review photo ${index + 1}`} />
                                <button
                                    onClick={() => removePhoto(index)}
                                    className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            {/* Sticky Bottom Button */}
            <div className="fixed bottom-0 left-0 w-full p-5 bg-gradient-to-t from-[#0B0C15] via-[#0B0C15]/95 to-transparent backdrop-blur-[2px] z-40">
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
