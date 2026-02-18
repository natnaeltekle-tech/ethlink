'use client'

import useSWR from 'swr'
import { getProfile } from '@/lib/actions'

export function useProfile() {
    const { data, error, isLoading, mutate } = useSWR(
        'profile',
        getProfile,
        {
            revalidateOnFocus: true,
            revalidateOnReconnect: true,
            dedupingInterval: 2000,
            // Prevent ghost-state retries after logout
            shouldRetryOnError: false,
            onError: (err) => {
                if (err?.message?.includes('auth') || err?.message?.includes('session')) return
                console.error('[useProfile] SWR error:', err)
            },
        }
    )

    return {
        profile: data,
        isLoading,
        isError: error,
        refresh: mutate,
    }
}
