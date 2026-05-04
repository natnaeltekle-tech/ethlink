'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function PresenceTracker() {
    const [supabase] = useState(() => createClient())
    const [userId, setUserId] = useState<string | null>(null)

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) setUserId(user.id)
        }
        fetchUser()

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUserId(session?.user?.id || null)
        })

        return () => subscription.unsubscribe()
    }, [supabase])

    useEffect(() => {
        if (!userId) return

        const channel = supabase.channel('global-presence', {
            config: {
                presence: {
                    key: userId,
                },
            },
        })

        channel
            .on('presence', { event: 'sync' }, () => {
                // We don't need to do anything here, just being in the channel tracks us
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({
                        user_id: userId,
                        online_at: new Date().toISOString(),
                    })
                }
            })

        return () => {
            supabase.removeChannel(channel)
        }
    }, [userId, supabase])

    return null
}
