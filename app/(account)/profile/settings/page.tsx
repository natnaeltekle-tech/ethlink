import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { getViewer } from '@/lib/viewer'
import { AccountDetailsForm } from '@/components/profile/account-details-form'

export const metadata: Metadata = { title: 'Account settings | Eth-Links' }

export default async function AccountSettingsPage() {
    const viewer = await getViewer()
    if (!viewer) return null // layout redirects
    return (
        <>
            <Link href="/profile" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />Profile
            </Link>
            <h1 className="text-xl font-bold">Account settings</h1>
            <AccountDetailsForm account={viewer} />
            <Link href="/account/delete" className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-red-500/30 text-sm font-medium text-red-500 hover:bg-red-500/10">
                <Trash2 className="h-4 w-4" />Delete account
            </Link>
        </>
    )
}
