'use client'

import React from 'react';
import { ChevronLeft, X, CheckCircle, Download, Share2, CreditCard, Copy, Wallet } from 'lucide-react';
import { toast } from 'sonner';

interface MobileReceiptProps {
    transactionId: string;
    merchantName: string;
    amount: number;
    date: string;
    paymentMethod?: string;
    onClose?: () => void;
}

export default function MobileReceipt({ transactionId, merchantName, amount, date, paymentMethod = 'Chapa Wallet', onClose }: MobileReceiptProps) {
    const shortTxn = transactionId?.slice(0, 14).toUpperCase() || '#TXN-0000';
    const copyTxn = () => { navigator.clipboard.writeText(transactionId || ''); toast.success('Copied!'); };
    const formattedDate = new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const formattedTime = new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
        <div className="min-h-screen bg-[#221e10] font-sans antialiased text-white flex flex-col items-center justify-between overflow-x-hidden selection:bg-[#f5c619] selection:text-black">
            {/* Nav */}
            <nav className="w-full flex items-center justify-between p-4 z-10">
                <button onClick={onClose} className="flex items-center justify-center p-2 rounded-full hover:bg-white/5 transition-colors text-white/80">
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <h1 className="text-base font-semibold tracking-wide uppercase text-white/90">Transaction Details</h1>
                <button onClick={onClose} className="flex items-center justify-center p-2 rounded-full hover:bg-white/5 transition-colors text-white/80">
                    <X className="w-6 h-6" />
                </button>
            </nav>

            {/* Main */}
            <main className="flex-1 w-full max-w-md px-4 flex flex-col items-center relative z-0 pb-28 pt-4">
                {/* Status Badge */}
                <div className="flex items-center gap-2 mb-8 bg-[#f5c619]/10 px-4 py-2 rounded-full border border-[#f5c619]/20">
                    <CheckCircle className="w-5 h-5 text-[#f5c619]" />
                    <span className="text-[#f5c619] text-sm font-bold uppercase tracking-wider">Payment Successful</span>
                </div>

                {/* Receipt Card */}
                <div className="w-full relative drop-shadow-2xl">
                    {/* Top Section */}
                    <div className="w-full rounded-t-2xl p-6 pb-8 relative overflow-hidden border border-[#f5c619]/20" style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(16px)', boxShadow: '0 4px 30px rgba(0,0,0,0.3)' }}>
                        <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#f5c619]/20 rounded-full blur-[60px] pointer-events-none" />

                        {/* Logo */}
                        <div className="flex justify-between items-start mb-8 relative z-10">
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2 text-[#f5c619] mb-1">
                                    <Wallet className="w-7 h-7" />
                                    <span className="font-extrabold text-xl tracking-tight">Eth-Links</span>
                                </div>
                                <span className="text-xs text-white/40 font-medium tracking-widest uppercase ml-1">Digital Receipt</span>
                            </div>
                            <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                                <CheckCircle className="w-5 h-5 text-white/60" />
                            </div>
                        </div>

                        {/* Amount */}
                        <div className="text-center py-6">
                            <p className="text-sm text-white/50 mb-1 font-medium uppercase tracking-wide">Total Paid</p>
                            <h2 className="text-4xl font-bold text-[#f5c619] tracking-tight">{amount.toLocaleString()} <span className="text-xl font-normal text-[#f5c619]/70">ETB</span></h2>
                        </div>

                        {/* Details */}
                        <div className="space-y-4 mt-4">
                            <div className="flex justify-between items-center border-b border-white/5 pb-3">
                                <span className="text-white/40 text-sm">Merchant</span>
                                <span className="text-white font-medium text-right max-w-[60%] truncate">{merchantName}</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-white/5 pb-3">
                                <span className="text-white/40 text-sm">Date & Time</span>
                                <div className="text-right"><div className="text-white font-medium text-sm">{formattedDate}</div><div className="text-white/50 text-xs">{formattedTime}</div></div>
                            </div>
                            <div className="flex justify-between items-center border-b border-white/5 pb-3">
                                <span className="text-white/40 text-sm">Payment Method</span>
                                <div className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-white/60" /><span className="text-white font-medium text-sm">{paymentMethod}</span></div>
                            </div>
                        </div>
                    </div>

                    {/* Perforation */}
                    <div className="w-full h-4 relative flex overflow-hidden">
                        <div className="w-full h-full flex items-center justify-between px-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
                            <div className="w-full h-[1px] border-t-2 border-dashed border-white/10" />
                        </div>
                    </div>

                    {/* Bottom: Transaction ID */}
                    <div className="w-full rounded-b-xl p-6 pt-4 relative border border-t-0 border-[#f5c619]/20" style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(16px)' }}>
                        <div className="bg-black/40 rounded-lg p-4 border border-white/5 flex justify-between items-end">
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Transaction ID</span>
                                <span className="text-[#f5c619] font-mono text-lg tracking-wider">{shortTxn}</span>
                            </div>
                            <button onClick={copyTxn} className="text-white/40 hover:text-[#f5c619] transition-colors"><Copy className="w-4 h-4" /></button>
                        </div>
                    </div>
                </div>
            </main>

            {/* Bottom Actions */}
            <footer className="fixed bottom-0 left-0 w-full bg-[#221e10]/80 backdrop-blur-md p-6 border-t border-white/5 z-50">
                <div className="max-w-md mx-auto flex gap-4">
                    <button className="flex-1 h-14 rounded-xl border border-white/20 text-white font-bold flex items-center justify-center gap-2 hover:bg-white/5 transition-colors">
                        <Download className="w-5 h-5 text-white/70" /> Download
                    </button>
                    <button className="flex-1 h-14 rounded-xl bg-[#f5c619] text-[#221e10] font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,198,25,0.3)] active:scale-[0.98] transition-all">
                        <Share2 className="w-5 h-5" /> Share
                    </button>
                </div>
            </footer>
        </div>
    );
}
