'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getThread, markThreadRead, sendChatMessage, type ChatMessage } from '@/lib/actions/chat-messages'
import { uniqueChannel } from '@/lib/realtime'

export type ThreadMessage = ChatMessage & {
    /** Client-only id for optimistic messages ("pending-…") */
    clientId?: string
    status: 'sent' | 'sending' | 'failed'
    error?: string
}

const belongsToThread = (m: ChatMessage, serviceId: string, me: string, other: string) =>
    m.service_id === serviceId &&
    ((m.sender_id === me && m.receiver_id === other) || (m.sender_id === other && m.receiver_id === me))

/**
 * One conversation (service + me + other person) with realtime updates.
 * - Optimistic sends are reconciled by the id the server returns, so a message
 *   never appears twice even if the realtime event arrives first.
 * - Failed sends stay in the list as "failed" with a retry.
 * - Incoming messages are marked read while the thread is open and visible.
 */
export function useChatThread(serviceId: string, otherUserId: string, currentUserId: string | null) {
    const [messages, setMessages] = useState<ThreadMessage[]>([])
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState(false)
    const [supabase] = useState(() => createClient())
    const markTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    const enabled = Boolean(currentUserId && serviceId && otherUserId && currentUserId !== otherUserId)

    const scheduleMarkRead = useCallback(() => {
        if (!enabled || typeof document === 'undefined' || document.visibilityState !== 'visible') return
        if (markTimer.current) clearTimeout(markTimer.current)
        markTimer.current = setTimeout(() => {
            void markThreadRead(serviceId, otherUserId).then((n) => {
                if (n > 0) window.dispatchEvent(new CustomEvent('ethlinks:messages-read'))
            })
        }, 400)
    }, [enabled, serviceId, otherUserId])

    const load = useCallback(async () => {
        if (!enabled) {
            setLoading(false)
            return
        }
        try {
            const rows = await getThread(serviceId, otherUserId)
            setMessages((prev) => {
                // Keep unsent/failed local messages when refreshing
                const local = prev.filter((m) => m.status !== 'sent')
                return [...rows.map((r) => ({ ...r, status: 'sent' as const })), ...local]
            })
            setLoadError(false)
            scheduleMarkRead()
        } catch {
            setLoadError(true)
        } finally {
            setLoading(false)
        }
    }, [enabled, serviceId, otherUserId, scheduleMarkRead])

    useEffect(() => {
        setMessages([])
        setLoading(true)
        void load()
    }, [load])

    // Realtime: inserts (new messages) and updates (read receipts) for this service,
    // filtered client-side to this pair. RLS limits events to my own messages.
    useEffect(() => {
        if (!enabled || !currentUserId) return
        const channel = supabase
            .channel(uniqueChannel(`thread:${serviceId}:${[currentUserId, otherUserId].sort().join(':')}`))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `service_id=eq.${serviceId}` }, (payload) => {
                const row = payload.new as ChatMessage
                if (!row?.id || !belongsToThread(row, serviceId, currentUserId, otherUserId)) return
                if (payload.eventType === 'INSERT') {
                    setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, { ...row, status: 'sent' }]))
                    if (row.receiver_id === currentUserId) scheduleMarkRead()
                } else if (payload.eventType === 'UPDATE') {
                    setMessages((prev) => prev.map((m) => (m.id === row.id ? { ...m, is_read: row.is_read, read_at: row.read_at } : m)))
                }
            })
            .subscribe()

        // Catch up after the app was backgrounded / the phone slept
        const onVisible = () => { if (document.visibilityState === 'visible') void load() }
        document.addEventListener('visibilitychange', onVisible)

        return () => {
            document.removeEventListener('visibilitychange', onVisible)
            supabase.removeChannel(channel)
            if (markTimer.current) clearTimeout(markTimer.current)
        }
    }, [enabled, supabase, serviceId, otherUserId, currentUserId, load, scheduleMarkRead])

    const deliver = useCallback(async (clientId: string, text: string) => {
        const result = await sendChatMessage(serviceId, otherUserId, text).catch(() => ({ ok: false as const, error: 'Message not sent. Check your connection and try again.' }))
        setMessages((prev) => {
            if (!result.ok) {
                return prev.map((m) => (m.clientId === clientId ? { ...m, status: 'failed', error: result.error } : m))
            }
            const saved: ThreadMessage = { ...result.message, status: 'sent' }
            // Realtime may already have added the saved row: drop the placeholder then.
            if (prev.some((m) => m.id === saved.id)) return prev.filter((m) => m.clientId !== clientId)
            return prev.map((m) => (m.clientId === clientId ? saved : m))
        })
        return result
    }, [serviceId, otherUserId])

    const send = useCallback(async (raw: string) => {
        const text = raw.trim()
        if (!text || !enabled || !currentUserId) return { ok: false as const, error: 'Nothing to send' }
        const clientId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
        setMessages((prev) => [...prev, {
            id: -Date.now(), clientId, status: 'sending',
            service_id: serviceId, sender_id: currentUserId, receiver_id: otherUserId,
            content: text, created_at: new Date().toISOString(), is_read: false, read_at: null,
        }])
        return deliver(clientId, text)
    }, [enabled, currentUserId, serviceId, otherUserId, deliver])

    const retry = useCallback((clientId: string) => {
        const msg = messages.find((m) => m.clientId === clientId)
        if (!msg) return
        setMessages((prev) => prev.map((m) => (m.clientId === clientId ? { ...m, status: 'sending', error: undefined } : m)))
        void deliver(clientId, msg.content)
    }, [messages, deliver])

    const discard = useCallback((clientId: string) => {
        setMessages((prev) => prev.filter((m) => m.clientId !== clientId))
    }, [])

    return { messages, loading, loadError, send, retry, discard, reload: load, enabled }
}
