'use client'

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Phone, Info, PlusCircle, Camera, ArrowUp, Loader2 } from 'lucide-react';
import { sendMessage, getMessages } from '@/lib/actions';

interface ChatMessage {
    id: string;
    content: string;
    sender_id: string;
    created_at: string;
    image_url?: string;
}

interface MobileChatRoomProps {
    providerId: string;
    providerName: string;
    providerAvatar?: string;
    providerStatus?: string;
    currentUserId: string;
    serviceId?: string;
    onClose?: () => void;
}

const QUICK_REPLIES = ['Yes, please!', 'Tell me more', "What's the price?"];

export default function MobileChatRoom({
    providerId, providerName, providerAvatar, providerStatus = 'Online',
    currentUserId, serviceId, onClose
}: MobileChatRoomProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        const load = async () => {
            try {
                if (serviceId) { const msgs = await getMessages(serviceId); setMessages(msgs || []); }
            } catch (e) { console.error('Failed to load messages:', e); }
            finally { setIsLoading(false); }
        };
        load();
    }, [serviceId]);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);

    const handleSend = async (content?: string) => {
        const text = content || input.trim();
        if (!text || !serviceId) return;
        setIsSending(true); setInput('');
        const opt: ChatMessage = { id: `temp-${Date.now()}`, content: text, sender_id: currentUserId, created_at: new Date().toISOString() };
        setMessages(prev => [...prev, opt]);
        try { await sendMessage(serviceId, providerId, text); } catch { setMessages(prev => prev.filter(m => m.id !== opt.id)); }
        finally { setIsSending(false); }
    };

    const formatTime = (d: string) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
        <div className="relative flex h-screen w-full flex-col bg-[#0a0907] overflow-hidden font-sans text-white">
            {/* Header */}
            <div className="sticky top-0 z-20 flex flex-col" style={{ background: 'rgba(10,9,7,0.75)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(245,198,25,0.1)' }}>
                <div className="h-10 w-full" />
                <div className="flex items-center px-4 pb-4 justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <button onClick={onClose || (() => router.back())} className="flex size-10 items-center justify-center rounded-full hover:bg-white/10 transition-colors">
                            <ChevronLeft className="w-6 h-6 text-white" />
                        </button>
                        <div className="relative">
                            <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-11 border-2 border-[#f5c619]/20 bg-[#1A1C2E] flex items-center justify-center text-[#f5c619] font-bold"
                                style={providerAvatar ? { backgroundImage: `url("${providerAvatar}")` } : {}}>
                                {!providerAvatar && providerName[0]?.toUpperCase()}
                            </div>
                            <div className="absolute bottom-0 right-0 size-3 rounded-full bg-green-500 border-2 border-[#0a0907]" />
                        </div>
                        <div className="flex flex-col">
                            <h2 className="text-white text-base font-bold leading-tight tracking-tight">{providerName}</h2>
                            <p className="text-[#bab39c] text-xs font-medium">{providerStatus} • Premium Provider</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <button className="flex size-10 items-center justify-center rounded-full bg-white/5 text-white hover:bg-white/10 transition-colors"><Phone className="w-5 h-5" /></button>
                        <button className="flex size-10 items-center justify-center rounded-full bg-white/5 text-white hover:bg-white/10 transition-colors"><Info className="w-5 h-5" /></button>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
                {isLoading ? (
                    <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 text-[#f5c619] animate-spin" /></div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center"><Camera className="w-8 h-8 text-[#bab39c]" /></div>
                        <p className="text-[#bab39c] text-sm">Start a conversation</p>
                    </div>
                ) : (
                    <>
                        <div className="flex justify-center"><span className="bg-white/5 px-3 py-1 rounded-full text-[10px] uppercase tracking-widest text-[#bab39c] font-semibold">Today</span></div>
                        {messages.map((msg) => {
                            const isSent = msg.sender_id === currentUserId;
                            return (
                                <div key={msg.id} className={`flex items-end gap-3 ${isSent ? 'justify-end' : ''}`}>
                                    {!isSent && (
                                        <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-8 shrink-0 border border-white/10 bg-[#1A1C2E] flex items-center justify-center text-xs text-[#f5c619] font-bold"
                                            style={providerAvatar ? { backgroundImage: `url("${providerAvatar}")` } : {}}>
                                            {!providerAvatar && providerName[0]?.toUpperCase()}
                                        </div>
                                    )}
                                    <div className={`flex flex-col gap-1.5 ${isSent ? 'items-end' : 'items-start'} max-w-[80%]`}>
                                        <div className={`text-sm font-medium leading-relaxed px-4 py-3 shadow-lg ${isSent ? 'rounded-2xl rounded-br-none bg-[#f5c619] text-black font-semibold' : 'rounded-2xl rounded-bl-none bg-[#28251e] text-white border border-white/5'}`}>
                                            {msg.content}
                                        </div>
                                        <p className="text-[#bab39c]/60 text-[10px] font-medium mx-1">{formatTime(msg.created_at)}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </>
                )}
            </div>

            {/* Composer */}
            <div style={{ background: 'rgba(10,9,7,0.75)', backdropFilter: 'blur(12px)', borderTop: '1px solid rgba(245,198,25,0.1)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
                <div className="flex flex-col px-4 pt-3 pb-2">
                    <div className="flex items-center gap-3">
                        <button className="flex size-10 items-center justify-center rounded-full text-[#bab39c] hover:bg-white/5"><PlusCircle className="w-6 h-6" /></button>
                        <div className="flex flex-1 items-center bg-white/5 rounded-full border border-white/10 focus-within:border-[#f5c619]/50 transition-all px-4 py-1.5">
                            <input className="w-full bg-transparent border-none text-white focus:ring-0 focus:outline-none placeholder:text-[#bab39c]/50 text-sm font-medium py-2"
                                placeholder={`Message ${providerName}...`} value={input} onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} />
                            <button onClick={() => handleSend()} disabled={!input.trim() || isSending}
                                className="ml-2 flex size-8 items-center justify-center rounded-full bg-[#f5c619] text-black shadow-lg active:scale-90 transition-all disabled:opacity-40">
                                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4 font-bold" />}
                            </button>
                        </div>
                    </div>
                    <div className="flex gap-2 py-3 overflow-x-auto">
                        {QUICK_REPLIES.map((r) => (
                            <button key={r} onClick={() => handleSend(r)} className="whitespace-nowrap rounded-full px-4 py-1.5 bg-white/5 border border-white/10 text-[11px] font-semibold text-[#bab39c] hover:text-[#f5c619] hover:border-[#f5c619]/30 transition-colors">{r}</button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
