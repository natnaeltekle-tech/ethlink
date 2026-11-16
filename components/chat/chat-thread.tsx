'use client'

import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, ArrowUp, Check, CheckCheck, ChevronLeft, Loader2, MessageCircle, RotateCw, X } from 'lucide-react'
import { useChatThread } from '@/lib/hooks/use-chat-thread'
import { TrustBadges } from '@/components/provider/trust-badges'
import { cn } from '@/lib/utils'

export type ChatParticipant = {
    id: string
    name: string
    avatarUrl?: string | null
    isVerified?: boolean
    hasLicense?: boolean
}

interface ChatThreadProps {
    serviceId: string
    serviceTitle?: string | null
    other: ChatParticipant
    currentUserId: string
    /** 'embedded' = card on a page; 'full' = full-screen thread (mobile/app) */
    variant?: 'embedded' | 'full'
    onBack?: () => void
    backHref?: string
    /** Suggested first messages for customers starting a conversation */
    quickReplies?: string[]
    className?: string
}

const dayLabel = (iso: string) => {
    const d = new Date(iso)
    const today = new Date()
    const yesterday = new Date(); yesterday.setDate(today.getDate() - 1)
    if (d.toDateString() === today.toDateString()) return 'Today'
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
    return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
}
const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

function Avatar({ name, url, size = 40 }: { name: string; url?: string | null; size?: number }) {
    return (
        <div className="flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-primary/15 font-bold text-primary"
            style={{ width: size, height: size, fontSize: size * 0.4 }}>
            {url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt="" className="h-full w-full object-cover" />
            ) : (name?.[0]?.toUpperCase() || '?')}
        </div>
    )
}

export function ChatThread({
    serviceId, serviceTitle, other, currentUserId, variant = 'embedded',
    onBack, backHref, quickReplies, className,
}: ChatThreadProps) {
    const { messages, loading, loadError, send, retry, discard, reload } = useChatThread(serviceId, other.id, currentUserId)
    const [draft, setDraft] = useState('')
    const listRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)
    const stickToBottom = useRef(true)

    // Scroll only the message list (never the page). Stay pinned to the newest
    // message unless the user scrolled up to read history.
    useLayoutEffect(() => {
        const list = listRef.current
        if (list && stickToBottom.current) list.scrollTop = list.scrollHeight
    }, [messages, loading])

    // Keep the newest message visible when the mobile keyboard resizes the view
    useEffect(() => {
        const vv = typeof window !== 'undefined' ? window.visualViewport : null
        if (!vv) return
        const onResize = () => { const l = listRef.current; if (l && stickToBottom.current) l.scrollTop = l.scrollHeight }
        vv.addEventListener('resize', onResize)
        return () => vv.removeEventListener('resize', onResize)
    }, [])

    // Auto-grow the composer up to ~5 lines
    useEffect(() => {
        const el = inputRef.current
        if (!el) return
        el.style.height = 'auto'
        el.style.height = `${Math.min(el.scrollHeight, 120)}px`
    }, [draft])

    const submit = (text = draft) => {
        if (!text.trim()) return
        stickToBottom.current = true
        setDraft('')
        void send(text)
        inputRef.current?.focus()
    }

    const lastOwnSentId = [...messages].reverse().find((m) => m.sender_id === currentUserId && m.status === 'sent')?.id
    const full = variant === 'full'

    const header = (
        <div className={cn('flex items-center gap-3 border-b border-border bg-card/95 px-3 py-2.5 backdrop-blur', full && 'sticky top-0 z-10')}>
            {(onBack || backHref) && (
                backHref ? (
                    <Link href={backHref} aria-label="Back to messages" className="-ml-1 rounded-full p-2 hover:bg-secondary"><ChevronLeft className="h-5 w-5" /></Link>
                ) : (
                    <button type="button" onClick={onBack} aria-label="Back" className="-ml-1 rounded-full p-2 hover:bg-secondary"><ChevronLeft className="h-5 w-5" /></button>
                )
            )}
            <Avatar name={other.name} url={other.avatarUrl} />
            <div className="min-w-0 flex-1">
                <p className="truncate font-semibold leading-tight">{other.name}</p>
                {serviceTitle && (
                    <Link href={`/services/${serviceId}`} className="block truncate text-xs text-muted-foreground hover:text-primary">
                        {serviceTitle}
                    </Link>
                )}
                <TrustBadges isVerified={other.isVerified} hasLicense={other.hasLicense} className="mt-1" />
            </div>
        </div>
    )

    return (
        <div className={cn(
            'flex flex-col overflow-hidden bg-background',
            full ? 'h-[100dvh]' : 'h-[60vh] min-h-[380px] rounded-xl border border-border shadow-sm',
            className,
        )}
            style={full ? { paddingTop: 'env(safe-area-inset-top)' } : undefined}>
            {header}

            <div
                ref={listRef}
                onScroll={(e) => {
                    const el = e.currentTarget
                    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
                }}
                className="flex-1 space-y-1 overflow-y-auto overscroll-contain px-3 py-4"
                aria-live="polite"
            >
                {loading ? (
                    <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : loadError ? (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                        <AlertCircle className="h-6 w-6" />
                        Couldn&apos;t load messages.
                        <button type="button" onClick={() => void reload()} className="font-semibold text-primary">Retry</button>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
                        <MessageCircle className="h-8 w-8 text-muted-foreground" />
                        <p className="font-medium">Start the conversation</p>
                        <p className="text-sm text-muted-foreground">Ask {other.name.split(' ')[0]} about availability, price or details.</p>
                    </div>
                ) : (
                    messages.map((m, i) => {
                        const mine = m.sender_id === currentUserId
                        const prev = messages[i - 1]
                        const newDay = !prev || new Date(prev.created_at).toDateString() !== new Date(m.created_at).toDateString()
                        return (
                            <Fragment key={m.clientId ?? m.id}>
                                {newDay && (
                                    <div className="flex justify-center py-2">
                                        <span className="rounded-full bg-secondary px-3 py-0.5 text-[11px] font-medium text-muted-foreground">{dayLabel(m.created_at)}</span>
                                    </div>
                                )}
                                <div className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                                    <div className={cn('flex max-w-[80%] flex-col', mine ? 'items-end' : 'items-start')}>
                                        <div className={cn(
                                            'whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-[15px] leading-snug',
                                            mine ? 'rounded-br-md bg-primary text-primary-foreground' : 'rounded-bl-md bg-secondary text-foreground',
                                            m.status === 'sending' && 'opacity-70',
                                            m.status === 'failed' && 'bg-red-500/15 text-foreground ring-1 ring-red-500/50',
                                        )}>
                                            {m.content}
                                        </div>
                                        <div className="mt-0.5 flex items-center gap-1 px-1 text-[10px] text-muted-foreground">
                                            {m.status === 'failed' ? (
                                                <span className="flex items-center gap-2 text-red-500">
                                                    {m.error ?? 'Not sent'}
                                                    <button type="button" onClick={() => m.clientId && retry(m.clientId)} className="inline-flex items-center gap-0.5 font-semibold underline"><RotateCw className="h-3 w-3" />Retry</button>
                                                    <button type="button" onClick={() => m.clientId && discard(m.clientId)} aria-label="Discard message"><X className="h-3 w-3" /></button>
                                                </span>
                                            ) : (
                                                <>
                                                    {timeLabel(m.created_at)}
                                                    {mine && m.status === 'sending' && <Loader2 className="h-3 w-3 animate-spin" />}
                                                    {mine && m.status === 'sent' && (m.is_read ? <CheckCheck className="h-3.5 w-3.5 text-sky-500" aria-label="Seen" /> : <Check className="h-3.5 w-3.5" aria-label="Sent" />)}
                                                    {mine && m.id === lastOwnSentId && m.is_read && <span>Seen</span>}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Fragment>
                        )
                    })
                )}
            </div>

            {quickReplies && messages.length === 0 && !loading && (
                <div className="flex gap-2 overflow-x-auto px-3 pb-2 scrollbar-hide">
                    {quickReplies.map((q) => (
                        <button key={q} type="button" onClick={() => submit(q)}
                            className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary">
                            {q}
                        </button>
                    ))}
                </div>
            )}

            <form
                onSubmit={(e) => { e.preventDefault(); submit() }}
                className="flex items-end gap-2 border-t border-border bg-card/95 px-3 py-2.5"
                style={full ? { paddingBottom: 'max(0.625rem, env(safe-area-inset-bottom))' } : undefined}
            >
                <textarea
                    ref={inputRef}
                    rows={1}
                    value={draft}
                    maxLength={2000}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                        // Enter sends on desktop; on phones the keyboard's return adds a line
                        if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia('(pointer: fine)').matches) {
                            e.preventDefault()
                            submit()
                        }
                    }}
                    placeholder={`Message ${other.name.split(' ')[0]}…`}
                    aria-label="Message"
                    enterKeyHint="send"
                    className="max-h-[120px] min-h-[44px] flex-1 resize-none rounded-2xl border border-input bg-background px-3.5 py-2.5 text-base leading-snug outline-none focus:border-primary md:text-sm"
                />
                <button type="submit" disabled={!draft.trim()} aria-label="Send message"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-40">
                    <ArrowUp className="h-5 w-5" />
                </button>
            </form>
        </div>
    )
}
