'use client'

import { useEffect, useState } from 'react'

/**
 * Tracks online presence. Must never crash the app if Supabase is unavailable.
 */
export function PresenceTracker() {
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let unsubscribe: (() => void) | null = null

    const run = async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()

        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!cancelled && user) setUserId(user.id)

        const { data } = supabase.auth.onAuthStateChange((_event, session) => {
          if (!cancelled) setUserId(session?.user?.id || null)
        })
        unsubscribe = () => data.subscription.unsubscribe()
      } catch (err) {
        console.warn('[PresenceTracker] init skipped:', err)
      }
    }

    void run()

    return () => {
      cancelled = true
      try {
        unsubscribe?.()
      } catch {
        /* ignore */
      }
    }
  }, [])

  useEffect(() => {
    if (!userId) return

    let cancelled = false
    let cleanup: (() => void) | null = null

    const run = async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const channel = supabase.channel('global-presence', {
          config: { presence: { key: userId } },
        })

        channel
          .on('presence', { event: 'sync' }, () => {})
          .subscribe(async (status) => {
            if (status === 'SUBSCRIBED' && !cancelled) {
              await channel.track({
                user_id: userId,
                online_at: new Date().toISOString(),
              })
            }
          })

        cleanup = () => {
          void supabase.removeChannel(channel)
        }
      } catch (err) {
        console.warn('[PresenceTracker] channel skipped:', err)
      }
    }

    void run()

    return () => {
      cancelled = true
      try {
        cleanup?.()
      } catch {
        /* ignore */
      }
    }
  }, [userId])

  return null
}
