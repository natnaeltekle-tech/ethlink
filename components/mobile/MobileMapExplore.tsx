'use client'

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, SlidersHorizontal, MapPin, Star, List, Navigation, ChevronLeft } from 'lucide-react';

interface MobileMapExploreProps {
    services?: any[];
    onClose?: () => void;
}

export default function MobileMapExplore({ services = [], onClose }: MobileMapExploreProps) {
    const [activeFilter, setActiveFilter] = useState('All');
    const [selectedIdx, setSelectedIdx] = useState(0);
    const filters = ['All', 'Hotels', 'Dining', 'Experiences'];

    return (
        <div className="relative flex h-screen w-full flex-col overflow-hidden bg-[#1e293b] font-sans antialiased text-white">
            {/* Map Background */}
            <div className="absolute inset-0 z-0 bg-[#1e293b]">
                <div className="w-full h-full bg-cover bg-center opacity-30 mix-blend-overlay grayscale contrast-125"
                    style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuA11Ugpg4DTzLGFkTbi0rCvZeL4QDMLgXGLNPnWnObuS_ptgoypKJbZy_KMlWLaJrfxe34c5-IIY8bXGiRbcxzSP5LZS6Y2qSFzDkVX4ftnUHWXp0kdOsv3DiOBOpLfXVFOea6l6d3WF_egDotrkWm2dgMWkPsw3FRG_uQeK8ukU1Me1StktZlvfwwnHPyQ-7cqv5BsRlDZvdiAEFzN1SYRcMcFiASc5KAHndNM0rZOmzihgDsxtc3qfCMvGM5-yiAcE2bnkoL_TwY')" }} />

                {/* Map Pins */}
                {services.slice(0, 4).map((s, i) => {
                    const positions = [{ top: '30%', left: '20%' }, { top: '45%', right: '15%' }, { top: '25%', right: '35%' }, { top: '55%', left: '40%' }];
                    const pos = positions[i] || positions[0];
                    const isActive = i === selectedIdx;
                    return (
                        <div key={s.id || i} className="absolute flex flex-col items-center cursor-pointer hover:scale-110 transition-transform z-10"
                            style={pos as any} onClick={() => setSelectedIdx(i)}>
                            {isActive && <div className="absolute w-8 h-8 bg-[#f5c619]/40 rounded-full animate-ping opacity-75" />}
                            <div className={`relative ${isActive ? 'bg-[#221e10] p-2 rounded-full border-2 border-[#f5c619] shadow-[0_0_30px_rgba(245,198,25,0.5)]' : ''}`}>
                                <MapPin className={`w-8 h-8 ${isActive ? 'text-[#f5c619]' : 'text-[#f5c619] opacity-80'}`} fill={isActive ? '#f5c619' : 'none'} />
                            </div>
                            {isActive && s.title && (
                                <div className="mt-2 px-3 py-1.5 bg-[#221e10]/90 backdrop-blur-md rounded-full border border-white/10 shadow-xl">
                                    <span className="text-white text-xs font-semibold whitespace-nowrap">{s.title}</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* UI Overlay */}
            <div className="relative z-10 flex flex-col h-full pointer-events-none">
                {/* Header */}
                <div className="w-full px-5 pt-14 pb-4 pointer-events-auto bg-gradient-to-b from-black/60 to-transparent">
                    <div className="flex items-center gap-3 w-full">
                        <button onClick={onClose} className="flex size-12 items-center justify-center rounded-full bg-[#221e10]/40 backdrop-blur-xl border border-white/10 shrink-0">
                            <ChevronLeft className="w-6 h-6 text-white" />
                        </button>
                        <div className="flex-1 h-14 bg-[#221e10]/40 backdrop-blur-xl border border-white/10 rounded-full flex items-center px-4 shadow-2xl focus-within:border-[#f5c619]/50 transition-all">
                            <Search className="w-5 h-5 text-white/60" />
                            <input className="bg-transparent border-none text-white placeholder-white/60 focus:ring-0 w-full ml-2 text-base font-normal h-full outline-none" placeholder="Search luxury stays..." />
                        </div>
                        <button className="h-14 w-14 shrink-0 rounded-full bg-[#221e10]/40 backdrop-blur-xl border border-white/10 flex items-center justify-center shadow-2xl active:bg-[#f5c619] transition-colors">
                            <SlidersHorizontal className="w-5 h-5 text-[#f5c619]" />
                        </button>
                    </div>

                    {/* Filter Chips */}
                    <div className="flex gap-3 mt-4 overflow-x-auto pb-2">
                        {filters.map(f => (
                            <button key={f} onClick={() => setActiveFilter(f)}
                                className={`px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeFilter === f
                                    ? 'bg-[#f5c619] text-[#221e10] font-bold shadow-lg shadow-[#f5c619]/20'
                                    : 'bg-[#221e10]/40 backdrop-blur-md text-white border border-white/10 hover:bg-white/10'}`}>
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Spacer + FABs */}
                <div className="flex-1 flex flex-col justify-end pb-2">
                    <div className="flex justify-end px-5 mb-4 pointer-events-auto gap-3">
                        <button className="h-12 px-4 rounded-full bg-[#221e10]/90 text-white shadow-xl flex items-center justify-center border border-white/10 active:scale-95 transition-transform gap-2 backdrop-blur-md">
                            <List className="w-4 h-4" /><span className="text-xs font-bold uppercase tracking-wider">List</span>
                        </button>
                        <button className="h-12 w-12 rounded-full bg-[#221e10]/90 text-[#f5c619] shadow-xl flex items-center justify-center border border-white/10 active:scale-95 transition-transform backdrop-blur-md">
                            <Navigation className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Bottom Carousel */}
                    <div className="pointer-events-auto w-full">
                        <div className="flex overflow-x-auto px-5 pb-6 gap-4 snap-x snap-mandatory scroll-smooth">
                            {(services.length > 0 ? services.slice(0, 5) : [{ id: '1', title: 'Explore Listings', price: 0 }]).map((s, i) => {
                                const img = s.gallery?.[0] || s.image_url || '';
                                const isSelected = i === selectedIdx;
                                return (
                                    <Link key={s.id} href={`/services/${s.id}`}
                                        className={`snap-center shrink-0 w-[88%] max-w-[340px] rounded-[2rem] p-3.5 relative overflow-hidden group backdrop-blur-xl transition-all ${isSelected
                                            ? 'bg-[#1a160d]/90 border border-[#f5c619]/40 shadow-2xl'
                                            : 'bg-[#221e10]/80 border border-white/5 shadow-xl hover:scale-[1.02]'}`}
                                        onClick={() => setSelectedIdx(i)}>
                                        {isSelected && <div className="absolute top-0 right-0 w-40 h-40 bg-[#f5c619]/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />}
                                        <div className="flex gap-4 items-center">
                                            <div className="w-24 h-24 rounded-2xl bg-gray-800 bg-cover bg-center shrink-0 shadow-inner border border-white/10"
                                                style={img ? { backgroundImage: `url("${img}")` } : {}} />
                                            <div className="flex flex-col justify-center flex-1 min-w-0 py-0.5">
                                                <h3 className="text-white font-bold text-lg leading-tight truncate pr-2">{s.title}</h3>
                                                <div className="flex items-center gap-2 mb-2 mt-1">
                                                    <div className="flex items-center gap-1 bg-white/5 px-1.5 py-0.5 rounded-md border border-white/5">
                                                        <Star className="w-3.5 h-3.5 text-[#f5c619] fill-[#f5c619]" />
                                                        <span className="text-white text-xs font-bold">5.0</span>
                                                    </div>
                                                    {s.location && <span className="text-white/40 text-xs truncate">{s.location}</span>}
                                                </div>
                                                {s.price > 0 && (
                                                    <div className="flex items-baseline gap-1">
                                                        <p className="text-[#f5c619] font-bold text-xl">{s.price}</p>
                                                        <span className="text-xs text-white/50 font-normal">ETB</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
