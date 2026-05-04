'use client'

import React from 'react';
import { ChevronLeft, Wallet, AlertCircle, RefreshCw, CreditCard } from 'lucide-react';

interface MobilePaymentErrorProps {
    errorMessage?: string;
    gatewayCode?: string;
    transactionId?: string;
    onRetry?: () => void;
    onChangeMethod?: () => void;
    onBack?: () => void;
}

export default function MobilePaymentError({
    errorMessage = 'It looks like there is an insufficient balance in your selected account.',
    gatewayCode = '502',
    transactionId = '#TXN-000000-ET',
    onRetry, onChangeMethod, onBack
}: MobilePaymentErrorProps) {
    return (
        <div className="min-h-screen bg-[#221e10] font-sans text-white flex flex-col">
            {/* Header */}
            <header className="flex items-center justify-between p-4 sticky top-0 z-50 bg-[#221e10]/95 backdrop-blur-sm">
                <button onClick={onBack} className="flex size-10 items-center justify-center rounded-full hover:bg-white/10 transition-colors">
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <h2 className="text-lg font-bold tracking-tight">Payment Status</h2>
                <div className="w-10" />
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center justify-center px-6 py-6">
                {/* Status Icon */}
                <div className="relative mb-8">
                    <div className="absolute inset-0 bg-[#f5c619]/20 rounded-full blur-xl scale-110 opacity-50" />
                    <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-[#2a261a] to-[#1a180e] flex items-center justify-center border border-[#f5c619]/20 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
                        <Wallet className="w-12 h-12 text-[#f5c619]/90" />
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-[#221e10] flex items-center justify-center border-2 border-[#221e10]">
                        <AlertCircle className="w-8 h-8 text-[#f5c619]" />
                    </div>
                </div>

                {/* Error Message */}
                <div className="text-center space-y-4 max-w-[340px]">
                    <h1 className="text-2xl font-extrabold tracking-tight leading-tight">Transaction Declined</h1>
                    <p className="text-sm text-[#bab39c] leading-relaxed">{errorMessage}</p>
                    <div className="pt-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-900/10 border border-red-500/20">
                            <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                            <span className="text-xs font-semibold text-red-400">Gateway Response: {gatewayCode}</span>
                        </div>
                    </div>
                </div>

                {/* Divider */}
                <div className="w-full h-px bg-gradient-to-r from-transparent via-[#393528] to-transparent my-8 opacity-50" />

                {/* Verification Steps */}
                <div className="w-full max-w-[340px] space-y-3 opacity-60">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-[#f5c619] shadow-[0_0_8px_rgba(245,198,25,0.8)]" />
                        <p className="text-xs font-medium">Request initiated</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-[#f5c619] shadow-[0_0_8px_rgba(245,198,25,0.8)]" />
                        <p className="text-xs font-medium">Connecting to provider...</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative flex items-center justify-center w-2 h-2">
                            <div className="absolute w-2 h-2 rounded-full bg-red-500 animate-ping opacity-75" />
                            <div className="relative w-2 h-2 rounded-full bg-red-500" />
                        </div>
                        <div className="flex-1 h-3 rounded bg-[#393528] animate-pulse w-24" />
                    </div>
                </div>
            </main>

            {/* Bottom Actions */}
            <div className="px-6 pb-6 pt-2">
                <div className="flex flex-col gap-3">
                    <button onClick={onRetry}
                        className="relative group flex items-center justify-center w-full h-14 rounded-xl bg-[#f5c619] text-[#221e10] font-bold text-base overflow-hidden transition-all hover:shadow-[0_0_20px_rgba(245,198,25,0.4)] active:scale-[0.98]">
                        <span className="flex items-center gap-2"><RefreshCw className="w-5 h-5" /> Retry Payment</span>
                    </button>
                    <button onClick={onChangeMethod}
                        className="flex items-center justify-center w-full h-14 rounded-xl border border-[#393528] text-[#f5c619] font-bold text-base hover:bg-[#f5c619]/5 transition-colors active:scale-[0.98]">
                        <CreditCard className="w-5 h-5 mr-2" /> Change Payment Method
                    </button>
                </div>
                <div className="mt-6 text-center">
                    <p className="text-[10px] uppercase tracking-widest text-[#6b6655] font-semibold">Transaction ID: {transactionId}</p>
                </div>
            </div>
        </div>
    );
}
