'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, ShieldCheck } from 'lucide-react'
import { initiatePayment } from '@/lib/actions'
import { toast } from 'sonner'

interface PaymentMethodsProps {
    bookingId: string
    amount: number
}

export function PaymentMethods({ bookingId, amount }: PaymentMethodsProps) {
    const [isProcessing, setIsProcessing] = useState(false)

    const handlePayment = async () => {
        if (isProcessing) return

        try {
            setIsProcessing(true)

            // Call backend to initialize a Chapa transaction
            const result = await initiatePayment(bookingId)

            if (!result.success || !result.checkout_url) {
                throw new Error('Failed to initialize payment')
            }

            if (result.test_mode) {
                toast.info('Running in test mode — redirecting to success page.')
            }

            // Redirect to Chapa's hosted checkout page
            window.location.href = result.checkout_url
        } catch (error) {
            console.error('Payment error:', error)
            toast.error('Payment failed. Please check your connection and try again.')
            setIsProcessing(false)
        }
        // Note: we don't setIsProcessing(false) on success because
        // the page will navigate away to Chapa's checkout.
    }

    return (
        <div className="space-y-5">
            <h2 className="text-lg font-semibold mb-4">Complete Payment</h2>

            {/* Amount display */}
            <div className="text-center py-3 px-4 rounded-xl bg-muted/50 border border-border">
                <p className="text-sm text-muted-foreground">Amount to pay</p>
                <p className="text-3xl font-bold text-foreground mt-1">{amount} ETB</p>
            </div>

            {/* Pay with Chapa button */}
            <Button
                onClick={handlePayment}
                disabled={isProcessing}
                className="w-full h-14 text-lg font-semibold transition-all rounded-xl shadow-lg hover:shadow-xl"
                style={{
                    backgroundColor: isProcessing ? '#6b7280' : '#00A859',
                    color: '#ffffff',
                }}
                onMouseEnter={(e) => {
                    if (!isProcessing) {
                        e.currentTarget.style.backgroundColor = '#008A49'
                        e.currentTarget.style.transform = 'translateY(-1px)'
                    }
                }}
                onMouseLeave={(e) => {
                    if (!isProcessing) {
                        e.currentTarget.style.backgroundColor = '#00A859'
                        e.currentTarget.style.transform = 'translateY(0)'
                    }
                }}
            >
                {isProcessing ? (
                    <span className="flex items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Connecting to Chapa...
                    </span>
                ) : (
                    <span className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5" />
                        Pay with Chapa
                    </span>
                )}
            </Button>

            {/* Trust badge */}
            <p className="text-xs text-center text-muted-foreground/70">
                Supports TeleBirr, CBE Birr, Bank Cards &amp; more — powered by{' '}
                <span className="font-medium" style={{ color: '#00A859' }}>Chapa</span>
            </p>
        </div>
    )
}
