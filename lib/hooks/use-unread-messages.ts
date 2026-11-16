'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getUnreadMessageCount } from '@/lib/actions/chat-messages'

/**
 * Live count of unread incoming messages for the nav badge. Recounts on new
 * or read messages (realtime), when a thread is marked read, and when the app
 * returns to the foreground.
 */
export function useUnreadMessages(userId: string | null | undefined) {
    const [count, setCount] = useState(0)
    const [supabase] = useState(() => createClient())
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        if (!userId) {
            setCount(0)
            return
        }
        const recount = () => {
            if (timer.current) clearTimeout(timer.current)
            timer.current = setTimeout(() => { void getUnreadMessageCount().then(setCount) }, 250)
        }
        recount()
        const channel = supabase
            .channel(`unread:${userId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `receiver_id=eq.${userId}` }, recount)
            .subscribe()
        const onVisible = () => { if (document.visibilityState === 'visible') recount() }
        document.addEventListener('visibilitychange', onVisible)
        window.addEventListener('ethlinks:messages-read', recount)
        return () => {
            supabase.removeChannel(channel)
            document.removeEventListener('visibilitychange', onVisible)
            window.removeEventListener('ethlinks:messages-read', recount)
            if (timer.current) clearTimeout(timer.current)
        }
    }, [userId, supabase])

    return count
}

/** Full-screen conversation route: /messages/{serviceId}/{userId} */
export const isChatThreadPath = (path: string | null | undefined) => Boolean(path && /^\/messages\/[^/]+\/[^/]+\/?$/.test(path))
