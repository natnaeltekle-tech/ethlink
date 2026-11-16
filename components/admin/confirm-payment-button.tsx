'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { adminConfirmBookingPayment } from '@/lib/admin-actions'
import { toast } from 'sonner'

type Method = 'telebirr' | 'cbe' | 'cash' | 'other'

/** Confirm a manual transfer: records the method + bank/Telebirr reference shown on the receipt. */
export function ConfirmPaymentButton({
  bookingId,
  amountLabel,
}: {
  bookingId: string
  amountLabel?: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [method, setMethod] = useState<Method>('telebirr')
  const [reference, setReference] = useState('')
  const [loading, setLoading] = useState(false)
  const needsRef = method === 'telebirr' || method === 'cbe'

  const onConfirm = async () => {
    if (loading) return
    if (needsRef && reference.trim().length < 3) {
      toast.error('Enter the transaction reference you verified')
      return
    }
    setLoading(true)
    try {
      await adminConfirmBookingPayment(bookingId, 'admin_dashboard_confirm', { method, reference })
      toast.success('Payment confirmed — receipt issued')
      router.refresh()
    } catch (e) {
      console.error(e)
      toast.error(e instanceof Error ? e.message : 'Failed to confirm payment')
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5 bg-green-600 hover:bg-green-700 text-white">
        <CheckCircle className="h-3.5 w-3.5" />
        Confirm paid
      </Button>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-green-600/40 p-2">
      <span className="w-full text-xs text-muted-foreground">Only confirm after you verified the transfer{amountLabel ? ` of ${amountLabel}` : ''}.</span>
      <select value={method} onChange={(e) => setMethod(e.target.value as Method)} aria-label="Payment method"
        className="h-9 rounded-md border border-input bg-background px-2 text-sm">
        <option value="telebirr">Telebirr</option>
        <option value="cbe">CBE</option>
        <option value="cash">Cash</option>
        <option value="other">Other</option>
      </select>
      <input value={reference} onChange={(e) => setReference(e.target.value)} maxLength={120}
        placeholder={needsRef ? 'Transaction ref' : 'Reference (optional)'} aria-label="Transaction reference"
        className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm" />
      <Button size="sm" onClick={onConfirm} disabled={loading} className="gap-1.5 bg-green-600 hover:bg-green-700 text-white">
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
        Confirm
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
    </div>
  )
}
