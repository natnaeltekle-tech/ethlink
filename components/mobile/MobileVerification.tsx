'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Clock, Loader2, Lock, ShieldCheck, XCircle } from 'lucide-react'
import { getMyScreeningState } from '@/lib/actions'
import type { ScreeningState } from '@/lib/actions/provider-screening'

interface MobileVerificationProps {
  onClose?: () => void
}

/**
 * Identity verification status (Capacitor app profile menu).
 * Documents are collected only in the /services/new wizard, which uploads to
 * the private provider-kyc bucket — never to a public bucket.
 */
export default function MobileVerification({ onClose }: MobileVerificationProps) {
  const [state, setState] = useState<ScreeningState | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMyScreeningState().then(setState).catch(() => setState(null)).finally(() => setLoading(false))
  }, [])

  const status = state?.profile?.verification_status ?? 'unsubmitted'

  const view = {
    verified: {
      icon: <ShieldCheck className="h-10 w-10 text-green-400" />,
      title: 'You are verified',
      body: state?.profile?.has_business_license
        ? 'Your ID, phone and business license are verified. Customers see your ✔ badges.'
        : 'Your ID and phone are verified. Customers see your ✔ ID & Phone Verified badge.',
      cta: { href: '/services/new', label: 'List another service' },
    },
    pending: {
      icon: <Clock className="h-10 w-10 text-amber-400" />,
      title: 'Application under review',
      body: 'Our team is reviewing your documents. You will get a notification when you are approved.',
      cta: null,
    },
    rejected: {
      icon: <XCircle className="h-10 w-10 text-red-400" />,
      title: 'Not approved yet',
      body: state?.profile?.rejection_reason
        ? `Reason: ${state.profile.rejection_reason}`
        : 'Please check your documents and submit again.',
      cta: { href: '/services/new', label: 'Fix & re-submit' },
    },
    unsubmitted: {
      icon: <ShieldCheck className="h-10 w-10 text-[#f5c619]" />,
      title: 'Get verified',
      body: 'Verified providers appear in search and can take bookings. You will need your ID, a selfie and your Telebirr or CBE payout details.',
      cta: { href: '/services/new', label: 'Start verification' },
    },
  }[status]

  return (
    <div className="flex min-h-full flex-col bg-[#0B0C15] text-white" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <header className="flex items-center gap-3 border-b border-white/5 px-4 py-4">
        <button onClick={onClose} aria-label="Back" className="rounded-full p-2 hover:bg-white/5">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="text-lg font-bold">Identity Verification</h1>
      </header>

      <main className="flex flex-1 flex-col items-center px-6 py-10 text-center">
        {loading ? (
          <Loader2 className="mt-10 h-8 w-8 animate-spin text-white/50" />
        ) : (
          <>
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-white/5">{view.icon}</div>
            <h2 className="text-2xl font-bold">{view.title}</h2>
            <p className="mt-2 max-w-sm text-sm text-slate-400">{view.body}</p>
            {view.cta && (
              <Link href={view.cta.href}
                className="mt-8 inline-flex min-h-[48px] w-full max-w-sm items-center justify-center rounded-full bg-[#f5c619] font-bold text-black">
                {view.cta.label}
              </Link>
            )}
            <p className="mt-8 flex max-w-sm items-start gap-2 text-left text-xs text-slate-500">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Your documents are stored privately and are only viewed by the Eth-Links verification team through expiring links.
            </p>
          </>
        )}
      </main>
    </div>
  )
}
