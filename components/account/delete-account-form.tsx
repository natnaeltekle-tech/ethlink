'use client'

import { useState } from 'react'
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { deleteMyAccount } from '@/lib/actions/account'

export function DeleteAccountForm({ blockers: initialBlockers }: { blockers: string[] }) {
    const [blockers, setBlockers] = useState(initialBlockers)
    const [confirm, setConfirm] = useState('')
    const [busy, setBusy] = useState(false)
    const ready = confirm.trim().toUpperCase() === 'DELETE'

    const submit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!ready || busy) return
        setBusy(true)
        const r = await deleteMyAccount(confirm)
        if (!r.ok) {
            setBusy(false)
            if (r.blockers?.length) setBlockers(r.blockers)
            toast.error(r.error)
            return
        }
        try { await createClient().auth.signOut() } catch { /* already gone */ }
        window.location.href = '/account/deleted'
    }

    if (blockers.length > 0) {
        return (
            <section className="space-y-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
                <h2 className="flex items-center gap-2 font-semibold text-amber-200"><AlertTriangle className="h-5 w-5" />Your account can&apos;t be deleted yet</h2>
                <ul className="list-disc space-y-1 pl-5 text-sm text-amber-100">
                    {blockers.map((b) => <li key={b}>{b}</li>)}
                </ul>
                <p className="text-xs text-amber-200/80">This protects money held in escrow for you or your customers. Once these are finished you can delete your account here.</p>
            </section>
        )
    }

    return (
        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-red-500/40 bg-red-500/5 p-4">
            <label className="block space-y-1.5 text-sm">
                <span className="font-medium">Type <b className="font-mono">DELETE</b> to confirm</span>
                <input value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" autoCapitalize="characters" spellCheck={false}
                    className="h-12 w-full rounded-lg border border-input bg-background px-3 font-mono tracking-widest" aria-label="Type DELETE to confirm" />
            </label>
            <button type="submit" disabled={!ready || busy}
                className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white disabled:opacity-50">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Permanently delete my account
            </button>
        </form>
    )
}
