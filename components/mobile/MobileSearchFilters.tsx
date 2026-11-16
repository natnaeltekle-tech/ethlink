'use client'

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Star, ArrowRight, X } from 'lucide-react';
import {
    SERVICE_CATEGORIES,
    buildServicesHref,
    type ServiceFilters,
} from '@/lib/service-filters';
import { useBackHandler } from '@/lib/native/back-handler'

interface MobileSearchFiltersProps {
    onClose: () => void;
    /** Current filters (from the URL on Explore, or last-used on Home). */
    initialFilters?: ServiceFilters;
}

const CATEGORY_ICONS: Record<string, string> = {
    Hospitality: '🏨',
    Transport: '🚗',
    'Real Estate': '🏠',
    'Professional Services': '💼',
    Cleaning: '🧹',
    'Home Services': '🔧',
    Tech: '💻',
    Events: '🎉',
};

function toNumberOrUndefined(value: string): number | undefined {
    if (value.trim() === '') return undefined;
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : undefined;
}

/**
 * Bottom-sheet filters. Only fields that exist on services_view:
 * category, price, location, avg_rating. Applying navigates to
 * /services?… so the URL carries the state.
 */
export default function MobileSearchFilters({ onClose, initialFilters = {} }: MobileSearchFiltersProps) {
    useBackHandler(onClose)
    const router = useRouter();
    const [category, setCategory] = useState<string | undefined>(initialFilters.category);
    const [minPrice, setMinPrice] = useState(initialFilters.minPrice?.toString() ?? '');
    const [maxPrice, setMaxPrice] = useState(initialFilters.maxPrice?.toString() ?? '');
    const [location, setLocation] = useState(initialFilters.location ?? '');
    const [minRating, setMinRating] = useState<number>(initialFilters.minRating ?? 0);

    // Show a custom category (e.g. from an "Other" listing link) alongside the standard ones.
    const categories: string[] = [...SERVICE_CATEGORIES];
    if (category && !categories.includes(category)) categories.push(category);

    const handleReset = () => {
        setCategory(undefined);
        setMinPrice('');
        setMaxPrice('');
        setLocation('');
        setMinRating(0);
    };

    const handleApply = () => {
        router.push(
            buildServicesHref({
                search: initialFilters.search,
                category,
                minPrice: toNumberOrUndefined(minPrice),
                maxPrice: toNumberOrUndefined(maxPrice),
                location: location.trim() || undefined,
                minRating: minRating || undefined,
            })
        );
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="Filter results">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/70 z-10" onClick={onClose} />

            {/* Bottom Sheet */}
            <div className="fixed inset-x-0 bottom-0 z-20 mx-auto flex w-full max-w-lg flex-col max-h-[92dvh] bg-[#121212] rounded-t-3xl shadow-2xl border-t border-white/5 font-sans">
                {/* Handle */}
                <button type="button" aria-label="Close filters" className="flex h-8 w-full items-center justify-center shrink-0" onClick={onClose}>
                    <div className="h-1.5 w-12 rounded-full bg-[#3d3a30]" />
                </button>

                {/* Header */}
                <div className="flex items-center px-6 py-2 justify-between gap-4 shrink-0">
                    <h2 className="text-white text-xl font-bold tracking-tight flex-1">Filter Results</h2>
                    <button type="button" onClick={handleReset} className="text-[#f5c619] text-base font-bold tracking-wide">Reset</button>
                    <button type="button" onClick={onClose} aria-label="Close" className="text-white/60 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-4 space-y-8">
                    {/* Categories */}
                    <div className="space-y-4">
                        <h3 className="text-white text-lg font-bold tracking-tight">Category</h3>
                        <div className="flex flex-wrap gap-2">
                            {categories.map((id) => {
                                const selected = category === id;
                                return (
                                    <button
                                        type="button"
                                        key={id}
                                        aria-pressed={selected}
                                        onClick={() => setCategory(selected ? undefined : id)}
                                        className={`px-4 py-2.5 rounded-full text-sm font-medium flex items-center gap-2 transition-all ${selected
                                            ? 'bg-[#f5c619] text-black font-bold shadow-md'
                                            : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'}`}
                                    >
                                        <span>{CATEGORY_ICONS[id] ?? '✨'}</span> {id}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Price Range */}
                    <div className="space-y-4">
                        <h3 className="text-white text-lg font-bold tracking-tight">Price (ETB)</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <label className="flex flex-col gap-1.5 bg-white/5 p-3 rounded-lg border border-white/10 focus-within:border-[#f5c619]/60">
                                <span className="text-white/60 text-xs font-medium uppercase tracking-widest">Min</span>
                                <input
                                    type="number"
                                    inputMode="numeric"
                                    min={0}
                                    placeholder="0"
                                    value={minPrice}
                                    onChange={(e) => setMinPrice(e.target.value)}
                                    className="bg-transparent border-none p-0 text-white text-lg font-bold focus:ring-0 outline-none placeholder:text-white/30"
                                />
                            </label>
                            <label className="flex flex-col gap-1.5 bg-white/5 p-3 rounded-lg border border-white/10 focus-within:border-[#f5c619]/60">
                                <span className="text-white/60 text-xs font-medium uppercase tracking-widest">Max</span>
                                <input
                                    type="number"
                                    inputMode="numeric"
                                    min={0}
                                    placeholder="Any"
                                    value={maxPrice}
                                    onChange={(e) => setMaxPrice(e.target.value)}
                                    className="bg-transparent border-none p-0 text-white text-lg font-bold focus:ring-0 outline-none placeholder:text-white/30"
                                />
                            </label>
                        </div>
                    </div>

                    {/* Location */}
                    <div className="space-y-4">
                        <h3 className="text-white text-lg font-bold tracking-tight">Location</h3>
                        <input
                            type="text"
                            maxLength={100}
                            placeholder="e.g. Bole, Piassa, Kazanchis"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            className="w-full bg-white/5 p-4 rounded-lg border border-white/10 text-white text-base focus:border-[#f5c619]/60 focus:ring-0 outline-none placeholder:text-white/30"
                        />
                    </div>

                    {/* Rating */}
                    <div className="space-y-4">
                        <h3 className="text-white text-lg font-bold tracking-tight">Minimum Rating</h3>
                        <div className="flex items-center justify-between bg-white/5 p-4 rounded-lg border border-white/5">
                            <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((s) => (
                                    <button
                                        type="button"
                                        key={s}
                                        aria-label={`${s} stars and up`}
                                        onClick={() => setMinRating(minRating === s ? 0 : s)}
                                        className="p-1"
                                    >
                                        <Star className={`w-6 h-6 transition-colors ${s <= minRating ? 'text-[#f5c619] fill-[#f5c619]' : 'text-white/20'}`} />
                                    </button>
                                ))}
                            </div>
                            <span className="text-white font-bold text-lg">{minRating ? `${minRating}.0+` : 'Any'}</span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="shrink-0 px-6 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] border-t border-white/5 bg-[#121212]">
                    <button
                        type="button"
                        onClick={handleApply}
                        className="w-full bg-[#f5c619] hover:bg-[#f5c619]/90 text-black font-extrabold py-4 rounded-full text-lg shadow-xl shadow-[#f5c619]/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                    >
                        Show Results <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
