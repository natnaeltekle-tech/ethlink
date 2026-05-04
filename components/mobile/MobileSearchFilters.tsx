'use client'

import React, { useState } from 'react';
import { Star, Wifi, Car, Dumbbell, Waves, ArrowRight } from 'lucide-react';

interface MobileSearchFiltersProps {
    onClose: () => void;
    onApply?: (filters: any) => void;
    resultCount?: number;
}

const CATEGORIES = [
    { id: 'hotels', label: 'Boutique Hotels', icon: '🏨' },
    { id: 'dining', label: 'Fine Dining', icon: '🍽️' },
    { id: 'tours', label: 'Private Tours', icon: '🧭' },
    { id: 'wellness', label: 'Wellness & Spa', icon: '💆' },
    { id: 'events', label: 'Cultural Events', icon: '🎭' },
];

const AMENITIES = [
    { id: 'wifi', label: 'Fast WiFi', icon: Wifi },
    { id: 'pool', label: 'Pool Access', icon: Waves },
    { id: 'parking', label: 'Valet Parking', icon: Car },
    { id: 'gym', label: 'Gym', icon: Dumbbell },
];

export default function MobileSearchFilters({ onClose, onApply, resultCount = 124 }: MobileSearchFiltersProps) {
    const [priceRange, setPriceRange] = useState([120, 850]);
    const [selectedCategories, setSelectedCategories] = useState<string[]>(['hotels']);
    const [minRating, setMinRating] = useState(4);
    const [selectedAmenities, setSelectedAmenities] = useState<string[]>(['pool']);

    const toggleCategory = (id: string) => setSelectedCategories(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
    const toggleAmenity = (id: string) => setSelectedAmenities(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);

    const handleReset = () => { setPriceRange([0, 1000]); setSelectedCategories([]); setMinRating(0); setSelectedAmenities([]); };
    const handleApply = () => { onApply?.({ priceRange, selectedCategories, minRating, selectedAmenities }); onClose(); };

    return (
        <div className="fixed inset-0 z-[70]">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/70 z-10" onClick={onClose} />

            {/* Bottom Sheet */}
            <div className="fixed inset-x-0 bottom-0 z-20 flex flex-col max-h-[92%] bg-[#121212] rounded-t-3xl shadow-2xl border-t border-white/5 font-sans">
                {/* Handle */}
                <button className="flex h-8 w-full items-center justify-center shrink-0" onClick={onClose}>
                    <div className="h-1.5 w-12 rounded-full bg-[#3d3a30]" />
                </button>

                {/* Header */}
                <div className="flex items-center px-6 py-2 justify-between">
                    <h2 className="text-white text-xl font-bold tracking-tight flex-1">Filter Results</h2>
                    <button onClick={handleReset} className="text-[#f5c619] text-base font-bold tracking-wide">Reset</button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-8 pb-44">
                    {/* Price Range */}
                    <div className="space-y-4">
                        <h3 className="text-white text-lg font-bold tracking-tight">Price Range</h3>
                        <div className="bg-white/5 p-6 rounded-lg border border-white/5">
                            <div className="flex justify-between w-full mb-4">
                                <p className="text-white/60 text-sm font-medium uppercase tracking-widest">Per Service (ETB)</p>
                                <p className="text-[#f5c619] text-lg font-bold">{priceRange[0]} — {priceRange[1]}+</p>
                            </div>
                            <div className="flex h-[38px] w-full pt-1.5 px-2">
                                <div className="flex h-1.5 w-full rounded-full bg-[#3d3a30] relative items-center">
                                    <div className="absolute h-1.5 rounded-full bg-[#f5c619] shadow-[0_0_15px_rgba(245,198,25,0.4)]" style={{ left: '20%', right: '30%' }} />
                                    <div className="absolute left-[20%] -translate-x-1/2"><div className="size-6 rounded-full bg-white border-2 border-[#f5c619] shadow-lg cursor-pointer" /></div>
                                    <div className="absolute right-[30%] translate-x-1/2"><div className="size-6 rounded-full bg-white border-2 border-[#f5c619] shadow-lg cursor-pointer" /></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Categories */}
                    <div className="space-y-4">
                        <h3 className="text-white text-lg font-bold tracking-tight">Categories</h3>
                        <div className="flex flex-wrap gap-2">
                            {CATEGORIES.map(({ id, label, icon }) => (
                                <button key={id} onClick={() => toggleCategory(id)}
                                    className={`px-5 py-2.5 rounded-full text-sm font-medium flex items-center gap-2 transition-all ${selectedCategories.includes(id)
                                        ? 'bg-[#f5c619] text-black font-bold shadow-md'
                                        : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'}`}>
                                    <span>{icon}</span> {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Rating */}
                    <div className="space-y-4">
                        <h3 className="text-white text-lg font-bold tracking-tight">Minimum Rating</h3>
                        <div className="flex items-center justify-between bg-white/5 p-4 rounded-lg border border-white/5">
                            <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map(s => (
                                    <button key={s} onClick={() => setMinRating(s)}>
                                        <Star className={`w-6 h-6 transition-colors ${s <= minRating ? 'text-[#f5c619] fill-[#f5c619]' : 'text-white/20'}`} />
                                    </button>
                                ))}
                            </div>
                            <span className="text-white font-bold text-lg">{minRating}.0+</span>
                        </div>
                    </div>

                    {/* Amenities */}
                    <div className="space-y-4">
                        <h3 className="text-white text-lg font-bold tracking-tight">Amenities</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {AMENITIES.map(({ id, label, icon: Icon }) => (
                                <button key={id} onClick={() => toggleAmenity(id)}
                                    className={`flex items-center gap-3 p-4 rounded-lg border transition-all ${selectedAmenities.includes(id)
                                        ? 'bg-white/10 border-[#f5c619]/50 shadow-[0_0_10px_rgba(245,198,25,0.1)]'
                                        : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                                    <Icon className="w-5 h-5 text-[#f5c619]" />
                                    <span className="text-sm font-medium text-white">{label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="absolute bottom-20 left-0 right-0 p-6 bg-gradient-to-t from-[#121212] via-[#121212] to-transparent pt-12">
                    <button onClick={handleApply}
                        className="w-full bg-[#f5c619] hover:bg-[#f5c619]/90 text-black font-extrabold py-4 rounded-full text-lg shadow-xl shadow-[#f5c619]/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98]">
                        Show {resultCount} Results <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
