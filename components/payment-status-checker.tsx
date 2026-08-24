'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { reconcileBookingPayment } from '@/lib/actions'

const MAX_AUTO_ATTEMPTS = 3
const RETRY_DELAY_MS = 4000

export function PaymentStatusChecker({
    bookingId,
    txRef,
}: {
    bookingId: string
    txRef?: string | null
}) {
    const router = useRouter()
    const [checking, setChecking] = useState(true)
    const [runId, setRunId] = useState(0)
    const attemptsRef = useRef(0)

    const check = useCallback(async () => {
        setChecking(true)
        try {
            const result = await reconcileBookingPayment(bookingId, txRef ?? null)
            if (result.status === 'paid') {
                router.refresh()
                return
            }
        } catch {
            /* keep showing the processing state */
        }
        setChecking(false)
    }, [bookingId, txRef, router])

    useEffect(() => {
        let cancelled = false
        let timer: ReturnType<typeof setTimeout> | null = null

        const tick = async () => {
            if (cancelled) return
            attemptsRef.current += 1
            await check()
            if (cancelled) return
            if (attemptsRef.current < MAX_AUTO_ATTEMPTS) {
                timer = setTimeout(tick, RETRY_DELAY_MS)
            }
        }

        tick()

        return () => {
            cancelled = true
            if (timer) clearTimeout(timer)
        }
    }, [check, runId])

    return (
        <div className="flex flex-col items-center gap-3">
            <Button
                variant="outline"
                onClick={() => {
                    attemptsRef.current = 0
                    setRunId((id) => id + 1)
                }}
                disabled={checking}
                className="gap-2"
            >
                {checking ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <RefreshCw className="h-4 w-4" />
                )}
                {checking ? 'Checking payment…' : 'Refresh status'}
            </Button>
            <p className="text-xs text-gray-500 dark:text-gray-400">
                This page updates automatically once your payment is confirmed.
            </p>
        </div>
    )
}
