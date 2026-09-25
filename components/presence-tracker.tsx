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

    const run = async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()

        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!cancelled && user) setUserId(user.id)

        const { data } = supabase.auth.onAuthStateChange(
          (_event: string, session: { user?: { id: string } } | null) => {
            if (!cancelled) setUserId(session?.user?.id || null)
          }
        )
        subscription = data.subscription
      } catch (err) {
        console.warn('[PresenceTracker] init skipped:', err)
      }
    }

    void run()

    return () => {
      cancelled = true
      try {
        subscription?.unsubscribe()
      } catch {
        /* ignore */
      }
    }
  }, [])

  useEffect(() => {
    if (!userId) return

    let cancelled = false
    let channel: { track: (p: object) => Promise<unknown> } | null = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let supabase: any = null

    const run = async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        supabase = createClient()
        channel = supabase.channel('global-presence', {
          config: { presence: { key: userId } },
        })

        channel
          // @ts-expect-error supabase channel chain
          .on('presence', { event: 'sync' }, () => {})
          .subscribe(async (status: string) => {
            if (status === 'SUBSCRIBED' && !cancelled && channel) {
              await channel.track({
                user_id: userId,
                online_at: new Date().toISOString(),
              })
            }
          })
      } catch (err) {
        console.warn('[PresenceTracker] channel skipped:', err)
      }
    }

    void run()

    return () => {
      cancelled = true
      try {
        if (supabase && channel) supabase.removeChannel(channel)
      } catch {
        /* ignore */
      }
    }
  }, [userId])

  return null
}
