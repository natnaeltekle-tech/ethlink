'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, ShieldCheck } from 'lucide-react'
import { initiatePayment, getPublicPaymentMode } from '@/lib/actions'
import { toast } from 'sonner'

interface PaymentMethodsProps {
    bookingId: string
    amount: number
}

export function PaymentMethods({ bookingId, amount }: PaymentMethodsProps) {
    const [isProcessing, setIsProcessing] = useState(false)
    const [mode, setMode] = useState<'simulation' | 'live' | null>(null)

    useEffect(() => {
        getPublicPaymentMode()
            .then(setMode)
            .catch(() => setMode('live'))
    }, [])

    const handlePayment = async () => {
        if (isProcessing) return

        try {
            setIsProcessing(true)

            const result = await initiatePayment(bookingId)

            if (!result.success || !result.checkout_url) {
                throw new Error('Failed to initialize payment')
            }

            if (result.auto_confirmed) {
                toast.success('Payment successful!')
            } else if (result.simulation || result.test_mode) {
                toast.info('Payment submitted.')
            }

            window.location.href = result.checkout_url
        } catch (error) {
            console.error('Payment error:', error)
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Payment failed. Please try again.'
            )
            setIsProcessing(false)
        }
    }

    const simulation = mode === 'simulation'

    return (
        <div className="space-y-5">
            <h2 className="text-lg font-semibold mb-4">Complete Payment</h2>

            <div className="text-center py-3 px-4 rounded-xl bg-muted/50 border border-border">
                <p className="text-sm text-muted-foreground">Amount to pay</p>
                <p className="text-3xl font-bold text-foreground mt-1">{amount} ETB</p>
            </div>

            <Button
                onClick={handlePayment}
                disabled={isProcessing}
                className="w-full h-14 text-lg font-semibold transition-all rounded-xl shadow-lg"
                style={{
                    backgroundColor: isProcessing
                        ? '#6b7280'
                        : simulation
                          ? '#f5c619'
                          : '#00A859',
                    color: simulation ? '#0B0C15' : '#ffffff',
                }}
            >
                {isProcessing ? (
                    <span className="flex items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Processing…
                    </span>
                ) : (
                    <span className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5" />
                        {simulation ? 'Pay now' : 'Pay with Chapa'}
                    </span>
                )}
            </Button>

            <p className="text-xs text-center text-muted-foreground/70">
                {simulation
                    ? 'Secure in-app payment · Receipt available after success'
                    : (
                        <>
                            Supports Bank Cards, Mobile Money &amp; more — powered by{' '}
                            <span className="font-medium" style={{ color: '#00A859' }}>
                                Chapa
                            </span>
                        </>
                    )}
            </p>
        </div>
    )
}
