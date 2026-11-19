import type { Metadata } from 'next'
import { getCustomerDashboard } from '@/lib/actions/dashboard'
import { SavedAndSearches } from '@/components/dashboard/customer-view'

export const metadata: Metadata = { title: 'Saved | Eth-Links' }

export default async function SavedPage() {
    const data = await getCustomerDashboard()
    if (!data) return null // layout redirects
    return <SavedAndSearches favorites={data.favorites} recentSearches={data.recentSearches} />
}
