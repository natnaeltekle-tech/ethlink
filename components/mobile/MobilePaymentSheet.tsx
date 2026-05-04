'use client'

import React, { useState, useEffect } from 'react';
import { X, Smartphone, ShieldCheck, CreditCard, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { initiatePayment } from '@/lib/actions';

interface MobilePaymentSheetProps {
    bookingId: string;
    amount: number;
    merchantName?: string;
    onClose: () => void;
    onSuccess?: (txnId: string) => void;
}

type PaymentMethod = 'chapa' | 'bank';

export default function MobilePaymentSheet({ bookingId, amount, merchantName, onClose, onSuccess }: MobilePaymentSheetProps) {
    const [method, setMethod] = useState<PaymentMethod>('chapa');
    const [phone, setPhone] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [timeLeft, setTimeLeft] = useState(120);

    // Countdown timer
    useEffect(() => {
        if (timeLeft <= 0) return;
        const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
        return () => clearInterval(timer);
    }, [timeLeft]);

    const circumference = 2 * Math.PI * 45;
    const offset = circumference - (timeLeft / 120) * circumference;
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    const handlePay = async () => {
        if (method === 'chapa' && !phone.trim()) { toast.error('Enter your phone number'); return; }
        setIsProcessing(true);
        try {
            const result = await initiatePayment(bookingId);
            if (result && typeof result === 'object' && 'checkout_url' in result) {
                window.location.href = (result as any).checkout_url;
            } else {
                onSuccess?.(bookingId);
            }
        } catch (error) {
            console.error('Payment failed:', error);
            toast.error('Payment failed. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex flex-col justify-end">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70" onClick={onClose} />

            {/* Bottom Sheet */}
            <div className="relative z-10 w-full max-w-md mx-auto rounded-t-3xl pb-8" style={{ background: 'rgba(30,30,30,0.85)', backdropFilter: 'blur(24px)', boxShadow: '0 -10px 40px rgba(0,0,0,0.5)', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                {/* Handle */}
                <div className="flex w-full items-center justify-center pt-3 pb-2">
                    <div className="h-1.5 w-12 rounded-full bg-white/20" />
                </div>

                <div className="px-6 pb-6 pt-2 flex flex-col gap-6">
                    {/* Header */}
                    <div className="flex flex-col items-center gap-3">
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-[#f5c619]/20 rounded-full blur opacity-75" />
                            <div className="relative w-16 h-16 rounded-full bg-black border border-[#f5c619]/50 flex items-center justify-center">
                                <CreditCard className="w-8 h-8 text-[#f5c619]" />
                            </div>
                        </div>
                        <div className="text-center space-y-1">
                            <h2 className="text-2xl font-bold tracking-tight text-white">Complete Payment</h2>
                            <p className="text-[#f5c619] text-xl font-medium tracking-wide">ETB {amount.toLocaleString()}</p>
                        </div>
                    </div>

                    {/* Payment Method Tabs */}
                    <div className="flex p-1 bg-white/5 rounded-full border border-white/10">
                        <button onClick={() => setMethod('chapa')} className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-all ${method === 'chapa' ? 'bg-[#f5c619] text-black' : 'text-white/50'}`}>
                            Chapa
                        </button>
                        <button onClick={() => setMethod('bank')} className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-all ${method === 'bank' ? 'bg-[#f5c619] text-black' : 'text-white/50'}`}>
                            Bank Transfer
                        </button>
                    </div>

                    {method === 'chapa' ? (
                        <>
                            {/* Phone Input */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-300 pl-1">Phone Number</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-[#f5c619]">
                                        <Smartphone className="w-5 h-5" />
                                    </div>
                                    <input className="block w-full rounded-xl border border-white/10 bg-black/40 py-4 pl-12 pr-4 text-white placeholder-gray-500 focus:border-[#f5c619] focus:ring-1 focus:ring-[#f5c619] text-base outline-none transition-colors"
                                        placeholder="+251 911..." type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                                </div>
                            </div>

                            {/* Timer + Pay Button */}
                            <div className="flex items-center gap-4">
                                <div className="relative h-14 w-14 shrink-0">
                                    <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                                        <circle cx="50" cy="50" r="45" fill="none" strokeWidth="8" stroke="rgba(255,255,255,0.1)" />
                                        <circle cx="50" cy="50" r="45" fill="none" strokeWidth="8" stroke="#f5c619" strokeLinecap="round"
                                            strokeDasharray={circumference} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 1s linear' }} />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-[10px] font-bold text-white">{minutes}:{seconds.toString().padStart(2, '0')}</span>
                                    </div>
                                </div>
                                <button onClick={handlePay} disabled={isProcessing}
                                    className="flex-1 bg-[#f5c619] hover:bg-yellow-400 active:scale-[0.98] transition-all text-[#221e10] font-bold text-lg h-14 rounded-xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-50">
                                    {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>Pay Now</span><ArrowRight className="w-5 h-5" /></>}
                                </button>
                            </div>
                        </>
                    ) : (
                        /* Bank Transfer Info */
                        <div className="flex flex-col gap-4">
                            <div className="rounded-xl bg-black/30 border border-white/10 p-4 space-y-3">
                                <div className="flex justify-between"><span className="text-gray-400 text-sm">Bank</span><span className="text-white font-medium text-sm">Commercial Bank of Ethiopia</span></div>
                                <div className="flex justify-between"><span className="text-gray-400 text-sm">Account</span><span className="text-white font-medium text-sm">1000xxxxxxxx</span></div>
                                <div className="flex justify-between"><span className="text-gray-400 text-sm">Name</span><span className="text-white font-medium text-sm">Eth-Links PLC</span></div>
                                <div className="flex justify-between"><span className="text-gray-400 text-sm">Amount</span><span className="text-[#f5c619] font-bold">ETB {amount.toLocaleString()}</span></div>
                            </div>
                            <button onClick={handlePay} disabled={isProcessing}
                                className="w-full bg-[#f5c619] text-[#221e10] font-bold text-lg h-14 rounded-xl shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50">
                                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'I Have Transferred'}
                            </button>
                        </div>
                    )}

                    {/* Trust Badge */}
                    <div className="flex items-center justify-center gap-2 pt-2 opacity-60">
                        <ShieldCheck className="w-4 h-4 text-[#f5c619]" />
                        <p className="text-xs font-medium tracking-wide uppercase text-gray-400">Secured by Chapa</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
