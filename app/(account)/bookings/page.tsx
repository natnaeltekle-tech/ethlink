import type { Metadata } from 'next'
import { getCustomerDashboard } from '@/lib/actions/dashboard'
import { CustomerBookings } from '@/components/dashboard/customer-view'

export const metadata: Metadata = { title: 'My bookings | Eth-Links' }

export default async function BookingsPage() {
    const data = await getCustomerDashboard()
    if (!data) return null // layout redirects
    return <CustomerBookings bookings={data.bookings} />
}
