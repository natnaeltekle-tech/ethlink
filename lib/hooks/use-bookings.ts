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
        }
    )

    return {
        bookings: data || [],
        isLoading,
        isError: error,
        refresh: mutate,
    }
}
