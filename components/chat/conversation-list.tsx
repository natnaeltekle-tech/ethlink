'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { BadgeCheck, MessageCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getMyConversations, type Conversation } from '@/lib/actions/chat-messages'
import { cn } from '@/lib/utils'

const when = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const days = Math.floor((now.getTime() - d.getTime()) / 86_400_000)
    if (days < 7) return d.toLocaleDateString(undefined, { weekday: 'short' })
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

/**
 * Inbox rows, one per (service, other person). Refreshes live when a message
 * arrives or is read. Pass `serviceId` to show only that service's threads.
 */
export function ConversationList({ initial, currentUserId, serviceId, emptyText }: {
    initial: Conversation[]
    currentUserId: string
    serviceId?: string
    emptyText?: string
}) {
    const [items, setItems] = useState(initial)
    const [supabase] = useState(() => createClient())
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        const refresh = () => {
            if (timer.current) clearTimeout(timer.current)
            timer.current = setTimeout(() => { void getMyConversations().then(setItems) }, 300)
        }
        const channel = supabase
            .channel(`inbox:${currentUserId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `receiver_id=eq.${currentUserId}` }, refresh)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `sender_id=eq.${currentUserId}` }, refresh)
            .subscribe()
        const onVisible = () => { if (document.visibilityState === 'visible') refresh() }
        document.addEventListener('visibilitychange', onVisible)
        window.addEventListener('ethlinks:messages-read', refresh)
        return () => {
            supabase.removeChannel(channel)
            document.removeEventListener('visibilitychange', onVisible)
            window.removeEventListener('ethlinks:messages-read', refresh)
            if (timer.current) clearTimeout(timer.current)
        }
    }, [supabase, currentUserId])

    const rows = serviceId ? items.filter((c) => c.serviceId === serviceId) : items

    if (rows.length === 0) {
        return (
            <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
                <MessageCircle className="h-10 w-10 text-muted-foreground" />
                <p className="font-medium">No messages yet</p>
                <p className="max-w-xs text-sm text-muted-foreground">
                    {emptyText ?? 'When you message a provider — or a customer contacts you — the conversation shows up here.'}
                </p>
                {!serviceId && (
                    <Link href="/services" className="mt-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">Explore services</Link>
                )}
            </div>
        )
    }

    return (
        <ul className="divide-y divide-border">
            {rows.map((c) => {
                const unread = c.unreadCount > 0
                const mineLast = c.lastSenderId === currentUserId
                return (
                    <li key={`${c.serviceId}:${c.otherUserId}`}>
                        <Link href={`/messages/${c.serviceId}/${c.otherUserId}`}
                            className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-secondary/50 active:bg-secondary">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 font-bold text-primary">
                                {c.otherAvatar ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={c.otherAvatar} alt="" className="h-full w-full object-cover" />
                                ) : c.otherName[0]?.toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-baseline justify-between gap-2">
                                    <p className={cn('flex min-w-0 items-center gap-1 truncate', unread ? 'font-bold' : 'font-semibold')}>
                                        <span className="truncate">{c.otherName}</span>
                                        {c.otherIsVerified && <BadgeCheck className="h-4 w-4 shrink-0 text-green-500" aria-label="Verified" />}
                                    </p>
                                    <span className={cn('shrink-0 text-xs', unread ? 'font-semibold text-primary' : 'text-muted-foreground')}>{when(c.lastAt)}</span>
                                </div>
                                {!serviceId && <p className="truncate text-xs text-muted-foreground">{c.serviceTitle}</p>}
                                <div className="flex items-center justify-between gap-2">
                                    <p className={cn('truncate text-sm', unread ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                                        {mineLast ? 'You: ' : ''}{c.lastMessage}
                                    </p>
                                    {unread && (
                                        <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
                                            {c.unreadCount > 99 ? '99+' : c.unreadCount}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </Link>
                    </li>
                )
            })}
        </ul>
    )
}
