import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'

export const metadata: Metadata = { title: 'Account deleted | Eth-Links', robots: { index: false } }

export default function AccountDeletedPage() {
    return (
        <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <h1 className="text-2xl font-bold">Your account has been deleted</h1>
            <p className="text-sm text-muted-foreground">Your personal data has been removed and you have been signed out. Thank you for using Eth-Links.</p>
            <Link href="/" className="inline-flex min-h-[44px] items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground">Back to home</Link>
        </main>
    )
}
