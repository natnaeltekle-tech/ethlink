import React, { useState } from 'react';
import Link from 'next/link';
import { 
  ChevronLeft, Share, Heart, MapPin, Star, 
  Wifi, Waves, Shield, Dumbbell, MessageSquare, Edit2 
} from 'lucide-react';
import MobileChatRoom from './MobileChatRoom';
import MobileReviewForm from './MobileReviewForm';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface MobileServiceDetailsProps {
    service: any;
    reviews: any[];
    provider: any;
    averageRating: number;
    reviewCount: number;
    isFavorite?: boolean;
    currentUser?: any;
}

export default function MobileServiceDetails({ 
    service, 
    reviews, 
    provider,
    averageRating,
    reviewCount,
    isFavorite = false,
    currentUser
}: MobileServiceDetailsProps) {
    const router = useRouter();
    const [showChat, setShowChat] = useState(false);
    const [showReviewForm, setShowReviewForm] = useState(false);
    const [isSaved, setIsSaved] = useState(isFavorite);
    
    const coverImage = service?.gallery?.[0] || service?.image_url || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800';

    const handleShare = async () => {
        try {
            if (navigator.share) {
                await navigator.share({ url: window.location.href, title: service?.title });
            } else if (navigator.clipboard) {
                await navigator.clipboard.writeText(window.location.href);
                toast.success('Link copied to clipboard!');
            }
        } catch (e) {
            console.log('Share error', e);
        }
    };

    if (showChat && provider) {
        return <div className="fixed inset-0 z-[100] bg-black"><MobileChatRoom serviceId={service.id} providerId={provider.id} providerName={provider.first_name} currentUserId={currentUser?.id || ''} onClose={() => setShowChat(false)} /></div>;
    }

    if (showReviewForm) {
        return <div className="fixed inset-0 z-[100] bg-black"><MobileReviewForm serviceId={service.id} serviceName={service.title} onClose={() => setShowReviewForm(false)} /></div>;
    }

    return (
        <div className="bg-background-light dark:bg-[#121212] text-slate-900 dark:text-white antialiased font-sans min-h-screen">
            {/* Hero Image Header with Floating Icons */}
            <div className="relative w-full h-[45vh]">
                <div 
                    className="w-full h-full bg-center bg-no-repeat bg-cover" 
                    style={{ backgroundImage: `url("${coverImage}")` }}
                >
                    {/* Floating Top Bar */}
                    <div className="absolute top-0 left-0 right-0 p-4 pt-12 flex items-center justify-between z-10">
                        <Link href="/" className="bg-black/40 backdrop-blur-md size-12 rounded-full flex items-center justify-center text-white border border-white/10">
                            <ChevronLeft className="w-6 h-6 ml-[-2px]" />
                        </Link>
                        <div className="flex gap-2">
                            <button onClick={handleShare} className="bg-black/40 backdrop-blur-md size-12 rounded-full flex items-center justify-center text-white border border-white/10 hover:bg-black/60 transition-colors">
                                <Share className="w-5 h-5" />
                            </button>
                            <button onClick={() => { setIsSaved(!isSaved); toast.success(isSaved ? 'Removed from favorites' : 'Saved to favorites!'); }} className="bg-black/40 backdrop-blur-md size-12 rounded-full flex items-center justify-center border border-white/10 hover:bg-black/60 transition-colors">
                                <Heart className={`w-5 h-5 transition-colors ${isSaved ? 'text-red-500 fill-red-500' : 'text-[#f5c619]'}`} />
                            </button>
                        </div>
                    </div>
                    {/* Bottom Gradient Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#f8f8f5] dark:from-[#121212] to-transparent"></div>
                </div>
            </div>

            {/* Main Content */}
            <main className="relative -mt-6 bg-[#f8f8f5] dark:bg-[#121212] rounded-t-2xl px-4 pb-44">
                {/* Header Info */}
                <div className="pt-6">
                    <h1 className="text-3xl font-bold leading-tight tracking-tight text-slate-900 dark:text-white">
                        {service.title}
                    </h1>
                    <div className="flex flex-col items-start gap-2 mt-3">
                        <div className="flex items-center gap-1 text-[#f5c619]">
                            <MapPin className="w-5 h-5" />
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                                {service.location || 'Location not specified'}
                            </span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Star className="w-5 h-5 text-[#f5c619] fill-[#f5c619]" />
                            <span className="text-sm font-bold text-slate-900 dark:text-white">
                                {averageRating.toFixed(1)} <span className="text-slate-500 font-normal">({reviewCount} reviews)</span>
                            </span>
                        </div>
                    </div>
                </div>

                {/* Provider Info */}
                {provider && (
                    <div className="mt-8 flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-[#1A1C2E] border-2 border-[#f5c619]/20 flex items-center justify-center text-[#f5c619] font-bold bg-cover bg-center"
                                style={provider.avatar_url ? { backgroundImage: `url("${provider.avatar_url}")` } : {}}>
                                {!provider.avatar_url && (provider.first_name?.[0] || 'P')}
                            </div>
                            <div>
                                <p className="font-bold text-lg">{provider.first_name} {provider.last_name || ''}</p>
                                <p className="text-xs text-slate-400">Host</p>
                            </div>
                        </div>
                        <button onClick={() => setShowChat(true)} className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 hover:bg-white/20 transition-colors">
                            <MessageSquare className="w-4 h-4 text-[#f5c619]" />
                            <span className="text-sm font-bold">Message</span>
                        </button>
                    </div>
                )}

                {/* Amenities Grid */}
                {(service.amenities?.length > 0 || service.features?.length > 0) && (
                    <div className="mt-8">
                        <h3 className="text-lg font-bold mb-4">Amenities</h3>
                        <div className="grid grid-cols-4 gap-3">
                            {/* Dynamically rendering logic could go here in V2, for now we conditionally hide if empty */}
                            <div className="flex flex-col items-center gap-2">
                                <div className="size-14 rounded-full bg-slate-100 dark:bg-[#f5c619]/10 flex items-center justify-center border border-slate-200 dark:border-[#f5c619]/20">
                                    <Wifi className="w-6 h-6 text-[#f5c619]" />
                                </div>
                                <span className="text-[12px] font-medium text-slate-500 dark:text-slate-400">Wi-Fi</span>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <div className="size-14 rounded-full bg-slate-100 dark:bg-[#f5c619]/10 flex items-center justify-center border border-slate-200 dark:border-[#f5c619]/20">
                                    <Waves className="w-6 h-6 text-[#f5c619]" />
                                </div>
                                <span className="text-[12px] font-medium text-slate-500 dark:text-slate-400">Pool</span>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <div className="size-14 rounded-full bg-slate-100 dark:bg-[#f5c619]/10 flex items-center justify-center border border-slate-200 dark:border-[#f5c619]/20">
                                    <Shield className="w-6 h-6 text-[#f5c619]" />
                                </div>
                                <span className="text-[12px] font-medium text-slate-500 dark:text-slate-400">Security</span>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <div className="size-14 rounded-full bg-slate-100 dark:bg-[#f5c619]/10 flex items-center justify-center border border-slate-200 dark:border-[#f5c619]/20">
                                    <Dumbbell className="w-6 h-6 text-[#f5c619]" />
                                </div>
                                <span className="text-[12px] font-medium text-slate-500 dark:text-slate-400">Gym</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Description */}
                <div className="mt-8">
                    <h3 className="text-lg font-bold mb-3">About this service</h3>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-base whitespace-pre-line">
                        {service.description}
                    </p>
                </div>

                {/* Location Map Placeholder - DELETED */}

                {/* Reviews Summary Section */}
                <div className="mt-8 mb-4">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold">Reviews</h3>
                        <button onClick={() => setShowReviewForm(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f5c619]/10 text-[#f5c619] border border-[#f5c619]/20 hover:bg-[#f5c619]/20 transition-colors">
                            <Edit2 className="w-4 h-4" />
                            <span className="text-sm font-bold">Write a Review</span>
                        </button>
                    </div>
                    {reviews?.length > 0 ? (
                        <div className="space-y-4">
                            {reviews.slice(0, 3).map((r, i) => (
                                <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="flex text-[#f5c619]">
                                            {[...Array(5)].map((_, j) => <Star key={j} className={`w-3.5 h-3.5 ${j < (r.rating || 5) ? 'fill-[#f5c619]' : 'text-slate-600'}`} />)}
                                        </div>
                                        <span className="text-xs text-slate-500 ml-2">{new Date(r.created_at || Date.now()).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-sm text-slate-300">{r.comment || 'Great experience!'}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-slate-400 text-sm italic">No reviews yet. Be the first!</p>
                    )}
                </div>
            </main>

            {/* Sticky Bottom Action Bar */}
            <div className="fixed bottom-20 left-0 right-0 z-50 bg-[#0B0C15]/95 backdrop-blur-xl border-t border-white/10 px-6 py-5 flex items-center justify-between shadow-2xl">
                <div className="flex flex-col">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Starting from</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-[#f5c619]">{service.price}</span>
                        <span className="text-sm font-semibold text-slate-900 dark:text-white uppercase">ETB</span>
                    </div>
                </div>
                <Link href={'/book/' + service?.id} className="bg-[#f5c619] flex items-center justify-center text-[#121212] px-8 py-4 rounded-full font-bold text-base shadow-[0_0_20px_rgba(245,198,25,0.3)] hover:scale-[1.02] active:scale-95 transition-all">
                    Book & Pay
                </Link>
            </div>
        </div>
    );
}
