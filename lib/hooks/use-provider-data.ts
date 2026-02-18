'use client'

import useSWR from 'swr'
import { getProviderServices, getProviderStats } from '@/lib/actions'

export function useProviderData() {
    const { data: services, error: servicesError, isLoading: servicesLoading, mutate: mutateServices } = useSWR(
        'provider-services',
        getProviderServices,
        {
            revalidateOnFocus: true,
            revalidateOnReconnect: true,
            dedupingInterval: 2000,
            // Prevent ghost-state retries after logout
            shouldRetryOnError: false,
            onError: (err) => {
                if (err?.message?.includes('auth') || err?.message?.includes('session')) return
                console.error('[useProviderData] services SWR error:', err)
            },
        }
    )

    const { data: stats, error: statsError, isLoading: statsLoading, mutate: mutateStats } = useSWR(
        'provider-stats',
        getProviderStats,
        {
            revalidateOnFocus: true,
            revalidateOnReconnect: true,
            dedupingInterval: 2000,
            // Prevent ghost-state retries after logout
            shouldRetryOnError: false,
            onError: (err) => {
                if (err?.message?.includes('auth') || err?.message?.includes('session')) return
                console.error('[useProviderData] stats SWR error:', err)
            },
        }
    )

    return {
        services: services || [],
        stats: stats || null,
        isLoading: servicesLoading || statsLoading,
        isError: servicesError || statsError,
        refresh: () => {
            mutateServices()
            mutateStats()
        },
    }
}
