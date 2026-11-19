import { Banknote, Check, Clock, Wallet } from 'lucide-react'
import { formatETB } from '@/lib/money'
import type { WalletSummary } from '@/lib/actions/earnings'
import { cn } from '@/lib/utils'

/** Balances straight from the ledger (no stored balance anywhere). */
export function WalletCards({ summary }: { summary: WalletSummary }) {
    const cards = [
        { label: 'Available to withdraw', value: summary.available_cents, hint: summary.pending_payout_cents > 0 ? `${formatETB(summary.pending_payout_cents)} withdrawal processing` : 'Released to you, ready to send', icon: Wallet, tone: 'text-green-600 dark:text-green-400', strong: true },
        { label: 'Held in escrow', value: summary.held_in_escrow_cents, hint: 'Paid by customers, released when the job is done', icon: Clock, tone: 'text-violet-500' },
        { label: 'Total earned', value: summary.total_earned_cents, hint: 'All released jobs, after commission', icon: Banknote, tone: 'text-foreground' },
        { label: 'Paid out', value: summary.paid_out_cents, hint: 'Sent to your bank / Telebirr', icon: Check, tone: 'text-foreground' },
    ]
    return (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {cards.map((c) => (
                <div key={c.label} className={cn('min-w-0 rounded-2xl border bg-card p-4', c.strong ? 'border-green-500/40' : 'border-border')}>
                    <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><c.icon className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{c.label}</span></p>
                    <p className={cn('mt-1 break-words text-lg font-bold tabular-nums sm:text-xl', c.tone)}>{formatETB(c.value)}</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{c.hint}</p>
                </div>
            ))}
        </div>
    )
}
