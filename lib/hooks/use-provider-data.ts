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
        }
    )

    const { data: stats, error: statsError, isLoading: statsLoading, mutate: mutateStats } = useSWR(
        'provider-stats',
        getProviderStats,
        {
            revalidateOnFocus: true,
            revalidateOnReconnect: true,
            dedupingInterval: 2000,
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
