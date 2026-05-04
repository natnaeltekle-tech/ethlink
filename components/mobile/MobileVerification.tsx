'use client'

import React, { useState } from 'react';
import { ChevronLeft, BookOpen, CreditCard, Car, ArrowRight, Camera, Scan, Lock, CheckCircle, Star, ShieldCheck, Sparkles, Diamond } from 'lucide-react';
import { toast } from 'sonner';

type VerifStep = 'select' | 'capture' | 'success';
type DocType = 'passport' | 'national_id' | 'driver_license';

interface MobileVerificationProps {
    onClose?: () => void;
}

const DOC_OPTIONS: { id: DocType; label: string; desc: string; icon: React.ElementType }[] = [
    { id: 'passport', label: 'Passport', desc: 'Recommended for tourists', icon: BookOpen },
    { id: 'national_id', label: 'National ID', desc: 'For Ethiopian residents', icon: CreditCard },
    { id: 'driver_license', label: 'Driver License', desc: 'International license', icon: Car },
];

const BENEFITS = [
    { icon: Star, label: 'Priority Support', desc: '24/7 dedicated concierge' },
    { icon: ShieldCheck, label: 'Verified Badge', desc: 'Build trust instantly' },
    { icon: Sparkles, label: 'Higher Booking Limits', desc: 'Unlimited reservations' },
    { icon: Diamond, label: 'Exclusive Listings', desc: 'Access hidden gems' },
];

export default function MobileVerification({ onClose }: MobileVerificationProps) {
    const [step, setStep] = useState<VerifStep>('select');
    const [docType, setDocType] = useState<DocType>('passport');
    const [isCapturing, setIsCapturing] = useState(false);

    const stepIndex = step === 'select' ? 0 : step === 'capture' ? 1 : 2;

    const handleCapture = () => {
        setIsCapturing(true);
        // Simulate capture delay
        setTimeout(() => { setIsCapturing(false); setStep('success'); }, 2000);
    };

    if (step === 'success') {
        return (
            <div className="min-h-screen bg-[#0B0C15] font-sans text-white flex flex-col">
                <main className="flex-1 flex flex-col px-6 pt-12 pb-6">
                    {/* Hero */}
                    <div className="flex flex-col items-center justify-center text-center mt-4 mb-8">
                        <div className="relative flex items-center justify-center mb-6">
                            <div className="absolute inset-0 bg-[#f5c619]/20 blur-xl rounded-full" />
                            <div className="relative flex items-center justify-center w-32 h-32 rounded-full border-2 border-[#f5c619]/30 bg-[#0B0C15] shadow-[0_0_30px_rgba(245,198,25,0.15)]">
                                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#f5c619]/20 to-transparent flex items-center justify-center">
                                    <CheckCircle className="w-16 h-16 text-[#f5c619] drop-shadow-[0_2px_10px_rgba(245,198,25,0.5)]" />
                                </div>
                            </div>
                        </div>
                        <h1 className="text-[32px] font-extrabold leading-tight tracking-tight px-4 pb-2">Verification Successful</h1>
                        <p className="text-gray-400 text-base font-medium leading-relaxed px-4 max-w-[300px]">You are now a verified member of our exclusive network.</p>
                    </div>

                    {/* Benefits */}
                    <div className="flex flex-col gap-3 w-full mt-2">
                        <h2 className="text-xs font-bold text-[#f5c619]/80 uppercase tracking-widest mb-2 px-2">Unlocked Benefits</h2>
                        {BENEFITS.map(({ icon: Icon, label, desc }) => (
                            <div key={label} className="flex items-center gap-4 bg-[#13141f] border border-white/5 rounded-2xl px-4 py-4 transition-colors hover:bg-[#1a1c29]">
                                <div className="flex items-center justify-center rounded-full bg-gradient-to-br from-[#393528] to-[#181611] shrink-0 size-12 border border-[#f5c619]/20">
                                    <Icon className="w-6 h-6 text-[#f5c619]" />
                                </div>
                                <div><p className="text-white text-base font-bold">{label}</p><p className="text-gray-400 text-sm font-medium">{desc}</p></div>
                            </div>
                        ))}
                    </div>

                    <div className="flex-grow" />
                    <div className="mt-8 mb-4">
                        <button onClick={() => { onClose?.(); toast.success('Identity verified successfully!'); }} className="w-full bg-gradient-to-r from-[#f5c619] to-[#d4a000] text-black font-extrabold text-lg py-4 rounded-full shadow-[0_4px_20px_rgba(245,198,25,0.25)] active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                            Return to Profile
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    if (step === 'capture') {
        return (
            <div className="relative flex h-screen w-full flex-col overflow-hidden bg-black font-sans text-white">
                {/* Camera Background */}
                <div className="absolute inset-0 z-0 bg-[#181611]" />

                {/* Camera Cutout Overlay */}
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
                    <div className="relative h-[240px] w-[340px] rounded-2xl" style={{ boxShadow: '0 0 0 100vmax rgba(0,0,0,0.75)' }}>
                        <div className="absolute -left-[2px] -top-[2px] h-8 w-8 rounded-tl-xl border-l-4 border-t-4 border-[#f5c619]" />
                        <div className="absolute -right-[2px] -top-[2px] h-8 w-8 rounded-tr-xl border-r-4 border-t-4 border-[#f5c619]" />
                        <div className="absolute -bottom-[2px] -left-[2px] h-8 w-8 rounded-bl-xl border-b-4 border-l-4 border-[#f5c619]" />
                        <div className="absolute -bottom-[2px] -right-[2px] h-8 w-8 rounded-br-xl border-b-4 border-r-4 border-[#f5c619]" />
                        {/* Scanning Line */}
                        <div className="absolute inset-x-4 h-0.5 bg-[#f5c619]/50 shadow-[0_0_15px_rgba(245,198,25,0.8)] animate-bounce" style={{ top: '40%' }} />
                    </div>
                    <p className="mt-8 text-center text-slate-300 text-sm font-medium tracking-wide">Position your document within the frame</p>
                </div>

                {/* Top Header */}
                <div className="relative z-20 flex w-full items-center justify-between bg-gradient-to-b from-black/80 to-transparent p-4 pb-12">
                    <button onClick={() => setStep('select')} className="flex size-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-md"><ChevronLeft className="w-5 h-5 text-white" /></button>
                    <h2 className="text-white text-lg font-bold tracking-tight">Verification</h2>
                    <div className="w-10" />
                </div>

                <div className="flex-1" />

                {/* Bottom Controls */}
                <div className="relative z-20 flex w-full flex-col items-center bg-gradient-to-t from-[#221e10] via-[#221e10]/90 to-transparent pb-10 pt-16">
                    <div className="mb-8 flex items-center gap-3">
                        <div className="h-1.5 w-1.5 rounded-full bg-white/20" />
                        <div className="h-1.5 w-8 rounded-full bg-[#f5c619] shadow-[0_0_10px_rgba(245,198,25,0.4)]" />
                        <div className="h-1.5 w-1.5 rounded-full bg-white/20" />
                    </div>
                    <div className="flex w-full items-center justify-between px-10">
                        <button className="flex size-12 items-center justify-center rounded-full bg-white/5 text-white/80 backdrop-blur-sm"><Scan className="w-6 h-6" /></button>
                        <button onClick={handleCapture} disabled={isCapturing}
                            className="group relative flex size-20 items-center justify-center rounded-full border-4 border-white/20 bg-transparent active:scale-95 transition-all">
                            <div className="absolute inset-1 rounded-full bg-[#f5c619] shadow-[0_0_20px_rgba(245,198,25,0.3)]" />
                            <Camera className="relative z-10 w-8 h-8 text-[#221e10]" />
                        </button>
                        <div className="w-12" />
                    </div>
                    <p className="mt-6 text-xs font-medium text-white/40">Step 2 of 3</p>
                </div>
            </div>
        );
    }

    // Step: Select document type
    return (
        <div className="min-h-screen bg-[#221e10] font-sans text-white flex flex-col relative overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[40%] bg-[#f5c619]/10 blur-[100px] rounded-full pointer-events-none" />

            {/* Nav */}
            <div className="relative z-10 w-full px-6 py-6 flex items-center justify-between">
                <button onClick={onClose} className="flex size-10 items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-all border border-white/5 backdrop-blur-sm">
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                    {[0, 1, 2].map(i => (
                        <div key={i} className={`h-1.5 rounded-full transition-all ${i === stepIndex ? 'w-6 bg-[#f5c619] shadow-[0_0_10px_rgba(245,198,25,0.5)]' : 'w-1.5 bg-white/20'}`} />
                    ))}
                </div>
                <div className="w-10" />
            </div>

            <main className="relative z-10 flex-1 flex flex-col px-6 pb-44">
                <div className="mt-4 mb-8">
                    <h1 className="text-3xl font-bold mb-3 tracking-wide">Choose <span className="text-[#f5c619]">Document Type</span></h1>
                    <p className="text-white/60 text-[15px] leading-relaxed">To ensure the safety of our exclusive community, please verify your identity.</p>
                </div>

                <div className="flex flex-col gap-4">
                    {DOC_OPTIONS.map(({ id, label, desc, icon: Icon }) => (
                        <button key={id} onClick={() => setDocType(id)}
                            className={`flex items-center gap-5 p-5 w-full rounded-[24px] border transition-all backdrop-blur-xl ${docType === id
                                ? 'bg-gradient-to-br from-[#f5c619]/15 to-[#f5c619]/3 border-[#f5c619] shadow-[0_0_20px_rgba(245,198,25,0.15)]'
                                : 'bg-gradient-to-br from-white/[0.08] to-white/[0.02] border-white/10 hover:bg-white/10'}`}>
                            <div className={`shrink-0 w-14 h-14 rounded-full flex items-center justify-center transition-colors ${docType === id ? 'bg-[#f5c619] text-[#221e10] shadow-lg' : 'bg-white/5 text-white/70'}`}>
                                <Icon className="w-7 h-7" />
                            </div>
                            <div className="flex-1 text-left">
                                <h3 className="text-white text-lg font-bold leading-tight mb-1">{label}</h3>
                                <p className="text-white/40 text-sm font-medium">{desc}</p>
                            </div>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${docType === id ? 'border-[#f5c619] bg-[#f5c619]' : 'border-white/20'}`}>
                                {docType === id && <CheckCircle className="w-4 h-4 text-[#221e10]" />}
                            </div>
                        </button>
                    ))}
                </div>
            </main>

            {/* Footer CTA */}
            <div className="fixed bottom-20 left-0 right-0 z-20 px-6 pb-8 pt-4 bg-gradient-to-t from-[#0B0C15] via-[#0B0C15]/95 to-transparent backdrop-blur-md">
                <button onClick={() => setStep('capture')} className="w-full h-16 rounded-full bg-[#f5c619] text-[#221e10] font-bold text-lg shadow-[0_0_25px_rgba(245,198,25,0.35)] active:scale-[0.98] transition-all flex items-center justify-center gap-3">
                    Start Verification <ArrowRight className="w-5 h-5 font-bold" />
                </button>
                <div className="text-center mt-3">
                    <p className="text-white/20 text-xs flex items-center justify-center gap-1"><Lock className="w-3 h-3" /> Encrypted & Secure Verification</p>
                </div>
            </div>
        </div>
    );
}
