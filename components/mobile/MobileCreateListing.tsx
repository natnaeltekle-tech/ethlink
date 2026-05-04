'use client'

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ChevronLeft, Upload, MapPin, Wifi, Car, Dumbbell, Shield, Waves, Coffee, Loader2, ArrowRight, Camera, X } from 'lucide-react';
import { createServiceWithProfile } from '@/lib/actions';

const CATEGORIES = ['Hospitality', 'Transport', 'Dining', 'Tours', 'Events', 'Wellness'];
const AMENITIES = [
    { id: 'wifi', label: 'Wi-Fi', icon: Wifi },
    { id: 'parking', label: 'Parking', icon: Car },
    { id: 'gym', label: 'Gym', icon: Dumbbell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'pool', label: 'Pool', icon: Waves },
    { id: 'dining', label: 'Dining', icon: Coffee },
];

export default function MobileCreateListing({ onClose }: { onClose?: () => void }) {
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('');
    const [price, setPrice] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const router = useRouter();

    const toggleAmenity = (id: string) => {
        setSelectedAmenities(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
    };

    const handleSubmit = async () => {
        if (!title || !category || !price) { toast.error('Please fill all required fields'); return; }
        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.set('title', title);
            formData.set('category', category);
            formData.set('price', price);
            formData.set('description', description);
            formData.set('location', location);
            formData.set('amenities', JSON.stringify(selectedAmenities));
            await createServiceWithProfile(formData);
            toast.success('Listing created successfully!');
            router.push('/dashboard');
            router.refresh();
        } catch (error) {
            console.error('Failed to create listing:', error);
            toast.error('Failed to create listing');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#181611] font-sans text-white flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 flex items-center justify-between p-4 bg-[#181611]/95 backdrop-blur-md border-b border-white/5">
                <button onClick={step === 1 ? onClose : () => setStep(1)} className="flex size-10 items-center justify-center rounded-full hover:bg-white/10 transition-colors">
                    <ChevronLeft className="w-6 h-6 text-white" />
                </button>
                <h1 className="text-lg font-bold tracking-tight">Create Listing</h1>
                {/* Step Indicator */}
                <div className="flex items-center gap-2">
                    <div className={`h-1.5 rounded-full transition-all ${step === 1 ? 'w-6 bg-[#f5c619] shadow-[0_0_10px_rgba(245,198,25,0.5)]' : 'w-1.5 bg-white/20'}`} />
                    <div className={`h-1.5 rounded-full transition-all ${step === 2 ? 'w-6 bg-[#f5c619] shadow-[0_0_10px_rgba(245,198,25,0.5)]' : 'w-1.5 bg-white/20'}`} />
                </div>
            </header>

            <main className="flex-1 px-5 py-6 pb-32 overflow-y-auto">
                {step === 1 ? (
                    /* Step 1: Basic Info */
                    <div className="flex flex-col gap-6">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-1">Basic Details</h2>
                            <p className="text-[#bab39c] text-sm">Tell us about your service</p>
                        </div>

                        {/* Title */}
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-slate-200 pl-1">Service Title *</label>
                            <input className="w-full rounded-xl border border-[#393528] bg-[#221e10] h-14 px-4 text-base text-white placeholder:text-[#6b6655] focus:outline-none focus:border-[#f5c619]/50 focus:ring-1 focus:ring-[#f5c619]/50 transition-all"
                                placeholder="e.g. Luxury Suite with City View" value={title} onChange={(e) => setTitle(e.target.value)} />
                        </div>

                        {/* Category */}
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-slate-200 pl-1">Category *</label>
                            <div className="flex flex-wrap gap-2">
                                {CATEGORIES.map((cat) => (
                                    <button key={cat} onClick={() => setCategory(cat)}
                                        className={`px-4 py-2.5 rounded-full text-sm font-semibold border transition-all ${category === cat
                                            ? 'bg-[#f5c619] text-[#181611] border-[#f5c619] shadow-[0_0_15px_rgba(245,198,25,0.2)]'
                                            : 'bg-white/5 text-white/80 border-white/10 hover:border-white/20'}`}>
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Price */}
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-slate-200 pl-1">Price (ETB) *</label>
                            <input className="w-full rounded-xl border border-[#393528] bg-[#221e10] h-14 px-4 text-base text-white placeholder:text-[#6b6655] focus:outline-none focus:border-[#f5c619]/50 focus:ring-1 focus:ring-[#f5c619]/50 transition-all"
                                placeholder="2,500" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
                        </div>

                        {/* Image Upload */}
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-slate-200 pl-1">Cover Photo</label>
                            {imagePreview ? (
                                <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/10">
                                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                    <button onClick={() => setImagePreview(null)} className="absolute top-2 right-2 bg-black/60 rounded-full p-1"><X className="w-4 h-4 text-white" /></button>
                                </div>
                            ) : (
                                <button className="w-full aspect-video rounded-xl border-2 border-dashed border-[#f5c619]/30 bg-[#f5c619]/5 flex flex-col items-center justify-center gap-3 hover:bg-[#f5c619]/10 transition-colors">
                                    <div className="w-14 h-14 rounded-full bg-[#f5c619]/10 flex items-center justify-center">
                                        <Camera className="w-7 h-7 text-[#f5c619]" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-white font-semibold text-sm">Upload Photos</p>
                                        <p className="text-[#6b6655] text-xs mt-0.5">JPEG, PNG up to 10MB</p>
                                    </div>
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    /* Step 2: Details */
                    <div className="flex flex-col gap-6">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-1">More Details</h2>
                            <p className="text-[#bab39c] text-sm">Help guests find your listing</p>
                        </div>

                        {/* Location */}
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-slate-200 pl-1">Location</label>
                            <div className="relative">
                                <input className="w-full rounded-xl border border-[#393528] bg-[#221e10] h-14 px-4 pl-12 text-base text-white placeholder:text-[#6b6655] focus:outline-none focus:border-[#f5c619]/50 focus:ring-1 focus:ring-[#f5c619]/50 transition-all"
                                    placeholder="Bole, Addis Ababa" value={location} onChange={(e) => setLocation(e.target.value)} />
                                <MapPin className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-[#f5c619]" />
                            </div>
                            {/* Map Placeholder */}
                            <div className="w-full h-36 rounded-xl bg-[#221e10] border border-[#393528] overflow-hidden relative mt-1">
                                <div className="absolute inset-0 bg-[url('https://lh3.googleusercontent.com/aida-public/AB6AXuDzUVMt0LYpavyN9IMdHsaInXESds_JgwTmtaHjgZXKuI46QdCnk79ks7mRPfsS8JfW9EzPfdoqJKWY2jaxY3jeofWrjiqa3dgPlB4Ip07rOYf06BxXK__PPBWu615s_CAkT8jdRD1UAF7sZCTWaDn-p7CN52Y5W-g6uODDCWyuk3Gk4RjMDXgDvSZnmmflvWXRoNUoTiTm62G-BWucfommq9ZCeGyZtpIJbIIDzekt2c8kuynZb5sIw8iczgs5fkqH86PlbQcF95g')] bg-cover bg-center opacity-30 grayscale" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="bg-[#f5c619] p-2 rounded-full shadow-lg"><MapPin className="w-5 h-5 text-[#181611]" /></div>
                                </div>
                            </div>
                        </div>

                        {/* Amenities */}
                        <div className="flex flex-col gap-3">
                            <label className="text-sm font-medium text-slate-200 pl-1">Amenities</label>
                            <div className="grid grid-cols-3 gap-3">
                                {AMENITIES.map(({ id, label, icon: Icon }) => (
                                    <button key={id} onClick={() => toggleAmenity(id)}
                                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${selectedAmenities.includes(id)
                                            ? 'border-[#f5c619]/50 bg-[#f5c619]/10 shadow-[0_0_10px_rgba(245,198,25,0.1)]'
                                            : 'border-white/10 bg-white/[0.03] hover:bg-white/5'}`}>
                                        <Icon className={`w-5 h-5 ${selectedAmenities.includes(id) ? 'text-[#f5c619]' : 'text-white/60'}`} />
                                        <span className={`text-xs font-medium ${selectedAmenities.includes(id) ? 'text-[#f5c619]' : 'text-white/60'}`}>{label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Description */}
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-slate-200 pl-1">Description</label>
                            <textarea className="w-full h-32 rounded-xl border border-[#393528] bg-[#221e10] p-4 text-base text-white placeholder:text-[#6b6655] focus:outline-none focus:border-[#f5c619]/50 focus:ring-1 focus:ring-[#f5c619]/50 transition-all resize-none"
                                placeholder="Describe your service in detail..." value={description} onChange={(e) => setDescription(e.target.value)} />
                        </div>
                    </div>
                )}
            </main>

            {/* Bottom CTA */}
            <div className="fixed bottom-0 left-0 w-full p-5 bg-gradient-to-t from-[#181611] via-[#181611]/95 to-transparent z-40">
                {step === 1 ? (
                    <button onClick={() => { if (!title || !category || !price) { toast.error('Please fill required fields'); return; } setStep(2); }}
                        className="w-full bg-[#f5c619] text-[#181611] font-bold text-lg py-4 rounded-xl shadow-[0_0_20px_rgba(245,198,25,0.3)] active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                        Continue <ArrowRight className="w-5 h-5" />
                    </button>
                ) : (
                    <button onClick={handleSubmit} disabled={isSubmitting}
                        className="w-full bg-[#f5c619] text-[#181611] font-bold text-lg py-4 rounded-xl shadow-[0_0_20px_rgba(245,198,25,0.3)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                        {isSubmitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Creating...</> : 'Publish Listing'}
                    </button>
                )}
            </div>
        </div>
    );
}
