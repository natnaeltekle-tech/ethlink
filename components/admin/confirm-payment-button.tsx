'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { adminConfirmBookingPayment } from '@/lib/admin-actions'
import { toast } from 'sonner'

export function ConfirmPaymentButton({
  bookingId,
  amountLabel,
}: {
  bookingId: string
  amountLabel?: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const onConfirm = async () => {
    if (loading) return
    const ok = window.confirm(
      `Mark this booking as PAID${amountLabel ? ` (${amountLabel})` : ''}?\n\nOnly confirm after you have verified the transfer.`
    )
    if (!ok) return

    setLoading(true)
    try {
      await adminConfirmBookingPayment(bookingId, 'admin_dashboard_confirm')
      toast.success('Payment confirmed')
      router.refresh()
    } catch (e) {
      console.error(e)
      toast.error(e instanceof Error ? e.message : 'Failed to confirm payment')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      size="sm"
      onClick={onConfirm}
      disabled={loading}
      className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <CheckCircle className="h-3.5 w-3.5" />
      )}
      {loading ? 'Confirming…' : 'Confirm paid'}
    </Button>
  )
}
