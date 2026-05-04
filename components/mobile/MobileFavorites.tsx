'use client'

import React, { useState } from 'react';
import Link from 'next/link';
import { Heart, Star, Share2, MapPin, Loader2 } from 'lucide-react';
import { toggleFavorite } from '@/lib/actions';
import { toast } from 'sonner';

interface FavoriteItem {
    id: string;
    title: string;
    image_url?: string;
    gallery?: string[];
    price: number;
    location?: string;
    category?: string;
    rating?: number;
}

interface MobileFavoritesProps {
    favorites: FavoriteItem[];
}

export default function MobileFavorites({ favorites }: MobileFavoritesProps) {
    const [items, setItems] = useState<FavoriteItem[]>(favorites);
    const [removingId, setRemovingId] = useState<string | null>(null);

    const handleRemove = async (serviceId: string) => {
        setRemovingId(serviceId);
        try {
            await toggleFavorite(serviceId);
            setItems(prev => prev.filter(f => f.id !== serviceId));
            toast.success('Removed from favorites');
        } catch {
            toast.error('Failed to update');
        } finally {
            setRemovingId(null);
        }
    };

    return (
        <div className="min-h-screen bg-[#0B0C15] font-sans text-white pb-24">
            {/* Header */}
            <header className="sticky top-0 z-50 flex items-center justify-between px-5 py-4 bg-[#0B0C15]/90 backdrop-blur-md border-b border-white/5">
                <h1 className="text-2xl font-extrabold tracking-tight text-white">Saved</h1>
                <button className="flex items-center gap-1 text-[#f5c619] text-sm font-bold">
                    <Share2 className="w-4 h-4" /> Share All
                </button>
            </header>

            <main className="px-4 pt-4">
                {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="relative">
                            <div className="absolute inset-0 bg-[#f5c619]/20 blur-xl rounded-full" />
                            <Heart className="relative w-16 h-16 text-[#f5c619] opacity-60" />
                        </div>
                        <h3 className="text-white text-lg font-bold">No saved listings yet</h3>
                        <p className="text-gray-500 text-sm text-center max-w-[260px]">Tap the heart icon on any listing to save it here for later.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        {items.map((item) => {
                            const img = item.gallery?.[0] || item.image_url || '';
                            return (
                                <Link key={item.id} href={`/services/${item.id}`} className="group flex flex-col rounded-2xl overflow-hidden bg-white/[0.03] border border-white/5 backdrop-blur-sm">
                                    <div className="relative aspect-[4/3] overflow-hidden">
                                        <div className="absolute inset-0 bg-center bg-cover transition-transform duration-500 group-hover:scale-110" style={{ backgroundImage: `url("${img}")` }} />
                                        <button
                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemove(item.id); }}
                                            className="absolute top-2 right-2 bg-black/50 backdrop-blur-md rounded-full p-1.5 z-10"
                                        >
                                            {removingId === item.id
                                                ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                                                : <Heart className="w-4 h-4 text-red-500 fill-red-500" />}
                                        </button>
                                        {item.category && (
                                            <div className="absolute bottom-2 left-2 bg-[#f5c619] text-black text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">{item.category}</div>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-1.5 p-3">
                                        <h3 className="text-white text-sm font-bold leading-tight truncate">{item.title}</h3>
                                        {item.location && (
                                            <div className="flex items-center gap-1 text-gray-400">
                                                <MapPin className="w-3 h-3 text-[#f5c619]" />
                                                <span className="text-[11px] truncate">{item.location}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between mt-1">
                                            <span className="text-[#f5c619] text-sm font-bold">{item.price} ETB</span>
                                            {item.rating && (
                                                <div className="flex items-center gap-0.5">
                                                    <Star className="w-3 h-3 text-[#f5c619] fill-[#f5c619]" />
                                                    <span className="text-white text-[11px] font-bold">{item.rating}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}
