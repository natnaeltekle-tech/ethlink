'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, useMotionValue } from 'framer-motion';
import { ArrowRight, Bot, Loader2, MapPin, MessageCircle, RefreshCw, Send, Star, WifiOff, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { askConcierge, type ConciergeReply } from '@/lib/actions/concierge';
import type { ConciergeListing } from '@/lib/concierge/search';
import { formatPrice } from '@/lib/provider-screening';
import { NewBadge } from '@/components/service/new-badge';
import { ChatBookingForm } from './chat-booking-form';
import { useBackHandler } from '@/lib/native/back-handler';

type Lang = 'en' | 'am';
type Message = {
    id: string;
    role: 'user' | 'ai';
    text: string;
    lang?: Lang;
    listings?: ConciergeListing[];
    browseHref?: string | null;
    action?: { label: string; href: string };
    /** Failed or offline: offer to send this text again */
    retry?: string;
};

// Browsing controls, long forms, full-screen chats and sign-in: no bubble on top of them.
const HIDDEN_PREFIXES = ['/services/new', '/add', '/admin', '/messages', '/account', '/dashboard', '/profile', '/bookings', '/saved', '/provider', '/receipt', '/r', '/payment', '/book', '/auth', '/checkout'];
const HIDDEN_EXACT = ['/services', '/explore'];

/** Service detail page: the sticky "Price / Book & Pay" bar sits above the bottom nav. */
const isServiceDetail = (path: string) => /^\/services\/(?!new(\/|$))[^/]+\/?$/.test(path);

const ETHIOPIC = /[ሀ-፿]/;
const WELCOME = 'Hi! What service are you looking for?\nሰላም! ምን አይነት አገልግሎት ይፈልጋሉ?';
const SUGGESTIONS = ['Cleaning in Bole', 'Taxi to the airport', 'ሆቴል አዲስ አበባ', 'Wedding photographer'];
const L = {
    en: { view: 'View', book: 'Book', all: 'See all results', placeholder: 'Ask for a service…', reviews: 'reviews', offline: 'You’re offline. Check your connection and try again.', failed: 'Something went wrong. Please try again.', retry: 'Retry', pay: 'Complete payment', booked: 'Booking request sent! Pay now to confirm it — your money is held in escrow until the job is done.' },
    am: { view: 'ይመልከቱ', book: 'ያስይዙ', all: 'ሁሉንም ውጤቶች ይመልከቱ', placeholder: 'አገልግሎት ይጠይቁ…', reviews: 'ግምገማዎች', offline: 'ኢንተርኔት የለም። ግንኙነትዎን አረጋግጠው እንደገና ይሞክሩ።', failed: 'ችግር ተፈጥሯል። እባክዎ እንደገና ይሞክሩ።', retry: 'እንደገና ይሞክሩ', pay: 'ክፍያ ይፈጽሙ', booked: 'የቦታ ማስያዝ ጥያቄዎ ተልኳል! ለማረጋገጥ አሁን ይክፈሉ — ክፍያዎ ስራው እስኪጠናቀቅ በጥበቃ (escrow) ይቆያል።' },
};
const welcome = (): Message => ({ id: 'welcome', role: 'ai', text: WELCOME });

export function FloatingChat() {
    const pathname = usePathname() ?? '';
    if (HIDDEN_EXACT.includes(pathname) || HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))) return null;
    return <FloatingChatInner aboveBookingBar={isServiceDetail(pathname)} />;
}

function FloatingChatInner({ aboveBookingBar }: { aboveBookingBar: boolean }) {
    const router = useRouter();
    // Mobile: always clear of the bottom nav (64px) — and of the booking bar on service pages.
    const bottomClass = aboveBookingBar
        ? 'bottom-[calc(148px+env(safe-area-inset-bottom))]'
        : 'bottom-[calc(84px+env(safe-area-inset-bottom))]';
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([welcome()]);
    const [input, setInput] = useState('');
    const [busy, setBusy] = useState(false);
    const [lang, setLang] = useState<Lang>('en');
    const [bookingServiceId, setBookingServiceId] = useState<string | null>(null);
    const [showNudge, setShowNudge] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const constraintsRef = useRef(null);
    // The closed bubble can be dragged; the open panel always snaps back to its corner so it stays on screen.
    const dragX = useMotionValue(0);
    const dragY = useMotionValue(0);
    useBackHandler(() => (bookingServiceId ? setBookingServiceId(null) : setIsOpen(false)), isOpen);

    useEffect(() => {
        const timer = setTimeout(() => { if (!isOpen) setShowNudge(true); }, 3000);
        return () => clearTimeout(timer);
    }, [isOpen]);

    // Closing the panel starts a fresh conversation next time.
    useEffect(() => {
        if (!isOpen) { setMessages([welcome()]); setBookingServiceId(null); setInput(''); setLang('en'); }
        else { dragX.set(0); dragY.set(0); }
    }, [isOpen, dragX, dragY]);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages, busy, isOpen, bookingServiceId]);

    const add = (m: Omit<Message, 'id'>) => setMessages((prev) => [...prev, { ...m, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }]);

    const send = useCallback(async (raw: string, { echo = true } = {}) => {
        const text = raw.trim();
        if (!text || busy) return;
        const msgLang: Lang = ETHIOPIC.test(text) ? 'am' : 'en';
        if (echo) add({ role: 'user', text });
        setInput('');
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            add({ role: 'ai', text: L[msgLang].offline, lang: msgLang, retry: text });
            return;
        }
        setBusy(true);
        try {
            const r: ConciergeReply = await askConcierge(text);
            setLang(r.lang);
            add({ role: 'ai', text: r.text, lang: r.lang, listings: r.listings, browseHref: r.browseHref });
        } catch {
            const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
            add({ role: 'ai', text: offline ? L[msgLang].offline : L[msgLang].failed, lang: msgLang, retry: text });
        } finally {
            setBusy(false);
        }
    }, [busy]);

    const retry = (m: Message) => {
        setMessages((prev) => prev.filter((x) => x.id !== m.id));
        void send(m.retry ?? '', { echo: false });
    };

    const open = (href: string) => { setIsOpen(false); router.push(href); };

    const handleBooked = (bookingId: string) => {
        setBookingServiceId(null);
        add({ role: 'ai', text: L[lang].booked, lang, action: { label: L[lang].pay, href: `/payment/${bookingId}` } });
    };

    return (
        <>
            <div ref={constraintsRef} className={cn('pointer-events-none fixed left-4 right-4 top-4 z-[39] md:bottom-4', bottomClass)} />
            <motion.div
                drag={!isOpen}
                dragConstraints={constraintsRef}
                dragMomentum={false}
                dragElastic={0.1}
                style={{ x: dragX, y: dragY }}
                className={cn('fixed right-4 z-[60] flex flex-col items-end gap-3 sm:right-6 md:bottom-6', bottomClass)}
            >
                {showNudge && !isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className="relative mb-1 rounded-2xl rounded-br-none bg-[#FACC15] px-4 py-2 text-sm font-semibold text-[#121214] shadow-xl"
                    >
                        How can I help you?
                        <button type="button" aria-label="Dismiss" onClick={(e) => { e.stopPropagation(); setShowNudge(false); }}
                            className="absolute -right-2 -top-2 rounded-full border border-white/10 bg-[#121214] p-0.5 text-white/70">
                            <X className="h-3 w-3" />
                        </button>
                        <div className="absolute -bottom-2 right-4 -z-10 h-4 w-4 rotate-45 bg-[#FACC15]" />
                    </motion.div>
                )}

                {isOpen && (
                    <div role="dialog" aria-label="Eth-Links assistant"
                        className="flex h-[min(480px,calc(100dvh-180px))] min-h-[280px] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#121214] text-white shadow-2xl animate-in fade-in slide-in-from-bottom-10 duration-200 sm:w-[360px]">
                        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
                            <div className="flex items-center gap-2">
                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FACC15]/15"><Bot className="h-4 w-4 text-[#FACC15]" /></span>
                                <div className="leading-tight">
                                    <p className="text-sm font-semibold">Eth-Links Assistant</p>
                                    <p className="text-[11px] text-white/50">English · አማርኛ</p>
                                </div>
                            </div>
                            <button type="button" aria-label="Close" onClick={() => setIsOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full text-white/70 hover:bg-white/10">
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {bookingServiceId ? (
                            <ChatBookingForm serviceId={bookingServiceId} onCancel={() => setBookingServiceId(null)} onSuccess={handleBooked} />
                        ) : (
                            <>
                                <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3" aria-live="polite">
                                    {messages.map((m) => (
                                        <div key={m.id} className={cn('flex w-full flex-col', m.role === 'user' ? 'items-end' : 'items-start')}>
                                            <div className={cn('max-w-[88%] whitespace-pre-wrap px-3.5 py-2 text-sm leading-relaxed',
                                                m.role === 'user' ? 'rounded-2xl rounded-tr-sm bg-[#FACC15] text-[#121214]' : 'rounded-2xl rounded-tl-sm bg-white/[0.06] text-white')}>
                                                {m.retry && <WifiOff className="mr-1.5 inline h-3.5 w-3.5 text-white/60" />}{m.text}
                                            </div>
                                            {m.listings && m.listings.length > 0 && (
                                                <div className="mt-2 w-full space-y-2">
                                                    {m.listings.map((s) => (
                                                        <ListingCard key={s.id} s={s} lang={m.lang ?? 'en'} onView={() => open(`/services/${s.id}`)} onBook={() => setBookingServiceId(s.id)} />
                                                    ))}
                                                    {m.browseHref && (
                                                        <button type="button" onClick={() => open(m.browseHref!)} className="flex min-h-[40px] w-full items-center justify-center gap-1 rounded-xl border border-white/10 text-xs font-semibold text-[#FACC15]">
                                                            {L[m.lang ?? 'en'].all}<ArrowRight className="h-3.5 w-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                            {m.action && (
                                                <Link href={m.action.href} onClick={() => setIsOpen(false)} className="mt-2 inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[#FACC15] px-4 text-sm font-bold text-[#121214]">
                                                    {m.action.label}<ArrowRight className="h-4 w-4" />
                                                </Link>
                                            )}
                                            {m.retry && (
                                                <button type="button" onClick={() => retry(m)} disabled={busy} className="mt-1.5 inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-white/15 px-3 text-xs font-semibold text-white/80 disabled:opacity-50">
                                                    <RefreshCw className="h-3.5 w-3.5" />{L[m.lang ?? 'en'].retry}
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    {messages.length === 1 && !busy && (
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            {SUGGESTIONS.map((q) => (
                                                <button key={q} type="button" onClick={() => void send(q)} className="min-h-[34px] rounded-full border border-white/15 px-3 text-xs text-white/80 hover:border-[#FACC15]/60">{q}</button>
                                            ))}
                                        </div>
                                    )}
                                    {busy && (
                                        <div className="flex items-center gap-2 text-xs text-white/50"><Loader2 className="h-3.5 w-3.5 animate-spin" />…</div>
                                    )}
                                </div>

                                <form onSubmit={(e) => { e.preventDefault(); void send(input); }} className="flex shrink-0 gap-2 border-t border-white/10 p-3">
                                    <input
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder={L[lang].placeholder}
                                        maxLength={500}
                                        enterKeyHint="send"
                                        aria-label="Message"
                                        className="h-10 min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white placeholder:text-white/40 focus:border-[#FACC15]/60 focus:outline-none"
                                    />
                                    <button type="submit" aria-label="Send" disabled={busy || !input.trim()}
                                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FACC15] text-[#121214] disabled:opacity-50">
                                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                    </button>
                                </form>
                            </>
                        )}
                    </div>
                )}

                <button
                    type="button"
                    aria-label={isOpen ? 'Close assistant' : 'Open assistant'}
                    onClick={() => { setIsOpen(!isOpen); setShowNudge(false); }}
                    className="flex h-14 w-14 items-center justify-center rounded-full border border-[#FACC15]/40 bg-[#121214] text-[#FACC15] shadow-lg shadow-black/40 transition-transform active:scale-95"
                >
                    {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
                </button>
            </motion.div>
        </>
    );
}

/** Real listing from the database: tap to view, or book inside the chat. */
function ListingCard({ s, lang, onView, onBook }: { s: ConciergeListing; lang: Lang; onView: () => void; onBook: () => void }) {
    const t = L[lang];
    return (
        <div className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-2">
            <button type="button" onClick={onView} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-white/5" aria-label={`${t.view}: ${s.title}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.image} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
            <div className="min-w-0 flex-1">
                <button type="button" onClick={onView} className="line-clamp-1 text-left text-sm font-semibold hover:text-[#FACC15]">{s.title}</button>
                <p className="text-xs font-bold text-[#FACC15]">{formatPrice(s.price, s.pricingUnit)}</p>
                <div className="mt-0.5 flex min-w-0 items-center gap-2 text-[11px] text-white/60">
                    {s.reviewCount > 0 ? (
                        <span className="inline-flex shrink-0 items-center gap-0.5"><Star className="h-3 w-3 fill-[#FACC15] text-[#FACC15]" />{s.avgRating.toFixed(1)} ({s.reviewCount})</span>
                    ) : (
                        <NewBadge createdAt={s.createdAt} reviewCount={s.reviewCount} className="px-1.5 py-0 text-[9px]" />
                    )}
                    {s.location && <span className="flex min-w-0 items-center gap-0.5"><MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{s.location}</span></span>}
                </div>
            </div>
            <div className="flex shrink-0 flex-col justify-center gap-1">
                <button type="button" onClick={onBook} className="min-h-[32px] rounded-lg bg-[#FACC15] px-3 text-xs font-bold text-[#121214]">{t.book}</button>
                <button type="button" onClick={onView} className="min-h-[32px] rounded-lg border border-white/15 px-3 text-xs font-semibold text-white/80">{t.view}</button>
            </div>
        </div>
    );
}
