'use client'

import useSWR from 'swr'
import { getUserBookings } from '@/lib/actions'

export function useBookings() {
    const { data, error, isLoading, mutate } = useSWR(
        'bookings',
        getUserBookings,
        {
            revalidateOnFocus: true,
            revalidateOnReconnect: true,
            dedupingInterval: 2000,
            // Prevent ghost-state retries after logout — server action returns []
            // when session is gone, so no crash, but we avoid unnecessary calls.
            shouldRetryOnError: false,
            onError: (err) => {
                // Silently ignore auth errors during logout transition
                if (err?.message?.includes('auth') || err?.message?.includes('session')) return
                console.error('[useBookings] SWR error:', err)
            },
        }
    )

    return {
        bookings: data || [],
        isLoading,
        isError: error,
        refresh: mutate,
    }
}
