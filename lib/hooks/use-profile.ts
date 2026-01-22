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
        }
    )

    return {
        profile: data,
        isLoading,
        isError: error,
        refresh: mutate,
    }
}
