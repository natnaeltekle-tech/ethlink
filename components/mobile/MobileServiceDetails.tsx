import React from 'react';
import Link from 'next/link';
import { 
  ChevronLeft, Share, Heart, MapPin, Star, 
  Wifi, Waves, Shield, Dumbbell 
} from 'lucide-react';

interface MobileServiceDetailsProps {
    service: any;
    reviews: any[];
    provider: any;
    averageRating: number;
    reviewCount: number;
    isFavorite?: boolean;
}

export default function MobileServiceDetails({ 
    service, 
    reviews, 
    provider,
    averageRating,
    reviewCount,
    isFavorite = false
}: MobileServiceDetailsProps) {
    const imageUrl = service.gallery?.[0] || service.image_url || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800';

    return (
        <div className="bg-background-light dark:bg-[#121212] text-slate-900 dark:text-white antialiased font-sans min-h-screen">
            {/* Hero Image Header with Floating Icons */}
            <div className="relative w-full h-[45vh]">
                <div 
                    className="w-full h-full bg-center bg-no-repeat bg-cover" 
                    style={{ backgroundImage: `url("${imageUrl}")` }}
                >
                    {/* Floating Top Bar */}
                    <div className="absolute top-0 left-0 right-0 p-4 pt-12 flex items-center justify-between z-10">
                        <Link href="/" className="bg-black/40 backdrop-blur-md size-12 rounded-full flex items-center justify-center text-white border border-white/10">
                            <ChevronLeft className="w-6 h-6 ml-[-2px]" />
                        </Link>
                        <div className="flex gap-2">
                            <button className="bg-black/40 backdrop-blur-md size-12 rounded-full flex items-center justify-center text-white border border-white/10">
                                <Share className="w-5 h-5" />
                            </button>
                            <button className="bg-black/40 backdrop-blur-md size-12 rounded-full flex items-center justify-center border border-white/10">
                                <Heart className={`w-5 h-5 ${isFavorite ? 'text-red-500 fill-red-500' : 'text-[#f5c619]'}`} />
                            </button>
                        </div>
                    </div>
                    {/* Bottom Gradient Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#f8f8f5] dark:from-[#121212] to-transparent"></div>
                </div>
            </div>

            {/* Main Content */}
            <main className="relative -mt-6 bg-[#f8f8f5] dark:bg-[#121212] rounded-t-2xl px-4 pb-32">
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

                {/* Amenities Grid */}
                <div className="mt-8">
                    <h3 className="text-lg font-bold mb-4">Amenities</h3>
                    <div className="grid grid-cols-4 gap-3">
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

                {/* Description */}
                <div className="mt-8">
                    <h3 className="text-lg font-bold mb-3">About this service</h3>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-base whitespace-pre-line">
                        {service.description}
                    </p>
                </div>

                {/* Location Map Placeholder */}
                <div className="mt-8">
                    <h3 className="text-lg font-bold mb-4">Location</h3>
                    <div className="w-full h-48 bg-slate-200 dark:bg-slate-800 rounded-xl overflow-hidden relative">
                        <img 
                            className="w-full h-full object-cover opacity-50 dark:opacity-40 grayscale" 
                            alt="Map view" 
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDzUVMt0LYpavyN9IMdHsaInXESds_JgwTmtaHjgZXKuI46QdCnk79ks7mRPfsS8JfW9EzPfdoqJKWY2jaxY3jeofWrjiqa3dgPlB4Ip07rOYf06BxXK__PPBWu615s_CAkT8jdRD1UAF7sZCTWaDn-p7CN52Y5W-g6uODDCWyuk3Gk4RjMDXgDvSZnmmflvWXRoNUoTiTm62G-BWucfommq9ZCeGyZtpIJbIIDzekt2c8kuynZb5sIw8iczgs5fkqH86PlbQcF95g"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-[#f5c619] p-3 rounded-full shadow-lg">
                                <MapPin className="w-6 h-6 text-[#121212] fill-[#121212]" />
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Sticky Bottom Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/5 backdrop-blur-xl border-t border-white/10 px-6 py-5 flex items-center justify-between">
                <div className="flex flex-col">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Starting from</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-[#f5c619]">{service.price}</span>
                        <span className="text-sm font-semibold text-slate-900 dark:text-white uppercase">ETB</span>
                    </div>
                </div>
                <button className="bg-[#f5c619] text-[#121212] px-8 py-4 rounded-full font-bold text-base shadow-[0_0_20px_rgba(245,198,25,0.3)] active:scale-95 transition-transform">
                    Book Now
                </button>
            </div>
        </div>
    );
}
