import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Check, Lock, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/navbar'
import { DeleteAccountForm } from '@/components/account/delete-account-form'
import { getAccountDeletionBlockers } from '@/lib/actions/account'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
    title: 'Delete your account | Eth-Links',
    description: 'How to permanently delete your Eth-Links account and what happens to your data.',
}

const DELETED = [
    'Your profile, name, phone number, photo and bio',
    'Provider verification: ID documents, selfie, licence and payout numbers',
    'All your chat messages, reviews, saved services, searches and notifications',
    'Listings that were never booked; booked listings are hidden and their photos, description and location removed',
    'Your sign-in (email and password) — you will be signed out everywhere',
]
const KEPT = [
    'Booking and payment records (amount, date, receipt number, payment reference) are kept for accounting and tax purposes, with your name removed. They show as “Deleted account”.',
    'Unpaid booking requests are cancelled.',
]

/** Public page (linked from Google Play) + the in-app deletion flow. */
export default async function DeleteAccountPage() {
    const supabase = await createClient()
    let email: string | null = null
    try { const { data } = await supabase.auth.getUser(); email = data.user?.email ?? (data.user ? '' : null) } catch { /* signed out */ }
    const signedIn = email !== null
    const blockers = signedIn ? (await getAccountDeletionBlockers()) ?? [] : []

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Navbar hideSearch />
            <main className="mx-auto w-full max-w-xl space-y-5 px-4 pb-28 pt-4 md:pb-12 md:pt-8">
                {signedIn && (
                    <Link href="/dashboard?tab=account" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="h-4 w-4" />Back to my account
                    </Link>
                )}
                <header className="space-y-1">
                    <h1 className="flex items-center gap-2 text-2xl font-bold"><Trash2 className="h-6 w-6 text-red-500" />Delete your Eth-Links account</h1>
                    <p className="text-sm text-muted-foreground">Deletion is permanent and can&apos;t be undone.</p>
                </header>

                <section className="space-y-2 rounded-2xl border border-border bg-card p-4">
                    <h2 className="font-semibold">What gets deleted</h2>
                    <ul className="space-y-1.5 text-sm">
                        {DELETED.map((t) => <li key={t} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />{t}</li>)}
                    </ul>
                    <h2 className="pt-2 font-semibold">What we keep</h2>
                    <ul className="space-y-1.5 text-sm text-muted-foreground">
                        {KEPT.map((t) => <li key={t} className="flex gap-2"><Lock className="mt-0.5 h-4 w-4 shrink-0" />{t}</li>)}
                    </ul>
                    <p className="pt-1 text-xs text-muted-foreground">You can&apos;t delete your account while a payment is held in escrow, a dispute is open, or Eth-Links still owes you a payout.</p>
                </section>

                {signedIn ? (
                    <>
                        {email && <p className="text-sm">Signed in as <b>{email}</b></p>}
                        <DeleteAccountForm blockers={blockers} />
                    </>
                ) : (
                    <section className="space-y-3 rounded-2xl border border-border bg-card p-4 text-sm">
                        <p>Sign in to delete your account. Deletion happens immediately after you confirm.</p>
                        <Link href="/auth/login?next=/account/delete" className="inline-flex min-h-[44px] items-center rounded-lg bg-primary px-5 font-semibold text-primary-foreground">Sign in to continue</Link>
                        <p className="text-muted-foreground">Can&apos;t sign in? Email <a href="mailto:support@ethlinks.app?subject=Delete%20my%20Eth-Links%20account" className="font-medium text-primary underline">support@ethlinks.app</a> from the email address on your account, and we&apos;ll delete it within 7 days.</p>
                    </section>
                )}
            </main>
        </div>
    )
}
