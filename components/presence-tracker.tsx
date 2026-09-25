'use client'

import { useEffect, useState } from 'react'

/**
 * Tracks online presence. Must never crash the app if Supabase is unavailable.
 */
export function PresenceTracker() {
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let subscription: { unsubscribe: () => void } | null = null
    let channel: { unsubscribe?: () => void } | null = null
    let supabase: any = null

    const run = async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        supabase = createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!cancelled && user) setUserId(user.id)

        const { data } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
          if (!cancelled) setUserId(session?.user?.id || null)
        })
        subscription = data.subscription
      } catch (e) {
        console.warn('[PresenceTracker] init skipped:', e)
      }
    }

    run()

    return () => {
      cancelled = true
      try {
        subscription?.unsubscribe()
      } catch { /* ignore */ }
    }
  }, [])

  useEffect(() => {
    if (!userId) return

    let channel: any = null
    let supabase: any = null
    let cancelled = false

    const run = async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        supabase = createClient()
        channel = supabase.channel('global-presence', {
          config: { presence: { key: userId } },
        })

        channel
          .on('presence', { event: 'sync' }, () => {})
          .subscribe(async (status: string) => {
            if (status === 'SUBSCRIBED' && !cancelled) {
              await channel.track({
                user_id: userId,
                online_at: new Date().toISOString(),
              })
            }
          })
      } catch (e) {
        console.warn('[PresenceTracker] channel skipped:', e)
      }
    }

    run()

    return () => {
      cancelled = true
      try {
        if (supabase && channel) supabase.removeChannel(channel)
      } catch { /* ignore */ }
    }
  }, [userId])

  return null
}
