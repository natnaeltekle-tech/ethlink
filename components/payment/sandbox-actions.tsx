'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { simulateSandboxPayment } from '@/lib/actions/payments'

export function SandboxActions({ txRef }: { txRef: string }) {
    const router = useRouter()
    const [busy, setBusy] = useState<'success' | 'failed' | null>(null)

    const run = async (outcome: 'success' | 'failed') => {
        if (busy) return
        setBusy(outcome)
        try {
            const r = await simulateSandboxPayment(txRef, outcome)
            toast[outcome === 'success' ? 'success' : 'error'](outcome === 'success' ? 'Payment confirmed — held in escrow' : 'Payment failed (simulated)')
            router.push(r.redirect)
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Simulation failed')
            setBusy(null)
        }
    }

    return (
        <div className="space-y-3">
            <button type="button" onClick={() => run('success')} disabled={!!busy}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#00A859] text-base font-semibold text-white disabled:opacity-60">
                {busy === 'success' ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}Simulate Successful Payment
            </button>
            <button type="button" onClick={() => run('failed')} disabled={!!busy}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-red-500/50 text-sm font-semibold text-red-600 disabled:opacity-60 dark:text-red-400">
                {busy === 'failed' ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}Simulate Failed Payment
            </button>
        </div>
    )
}

/** Customers waiting for an admin in sandbox mode: re-check every few seconds. */
export function SandboxAutoRefresh() {
    const router = useRouter()
    useEffect(() => {
        const t = setInterval(() => router.refresh(), 5000)
        return () => clearInterval(t)
    }, [router])
    return <p className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />Checking…</p>
}
