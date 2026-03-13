'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Smartphone, Wallet, Loader2 } from 'lucide-react'
import { initiatePayment, verifyPayment } from '@/lib/actions'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface PaymentMethodsProps {
    bookingId: string
    amount: number
}

type PaymentMethodId = 'telebirr' | 'cbe'

interface PaymentOption {
    id: PaymentMethodId
    label: string
    icon: any
    colorClass: string
    activeBorder: string
    activeBg: string
    btnClass: string
}

const PAYMENT_OPTIONS: PaymentOption[] = [
    {
        id: 'telebirr',
        label: 'Telebirr',
        icon: Smartphone,
        colorClass: 'text-blue-600',
        activeBorder: 'border-blue-500',
        activeBg: 'bg-blue-50 dark:bg-blue-900/20',
        btnClass: 'bg-blue-600 hover:bg-blue-700'
    },
    {
        id: 'cbe',
        label: 'CBE Birr',
        icon: Wallet,
        colorClass: 'text-purple-600',
        activeBorder: 'border-purple-500',
        activeBg: 'bg-purple-50 dark:bg-purple-900/20',
        btnClass: 'bg-purple-600 hover:bg-purple-700'
    }
]

export function PaymentMethods({ bookingId, amount }: PaymentMethodsProps) {
    const [selectedMethod, setSelectedMethod] = useState<PaymentMethodId | null>(null)
    const [phoneNumber, setPhoneNumber] = useState('')
    const [isProcessing, setIsProcessing] = useState(false)
    const [loadingMessage, setLoadingMessage] = useState('')
    const router = useRouter()

    const handlePayment = async () => {
        if (!selectedMethod || isProcessing) return

        if (selectedMethod === 'telebirr' && !phoneNumber) {
            toast.error("Please enter your mobile number")
            return
        }

        try {
            setIsProcessing(true)

            if (selectedMethod === 'telebirr') {
                setLoadingMessage("Waiting for confirmation on your phone...")
                // Simulate network delay
                await new Promise(resolve => setTimeout(resolve, 3000))
            } else {
                setLoadingMessage("Processing payment...")
                await new Promise(resolve => setTimeout(resolve, 1000))
            }

            // Step 1: Initiate Payment
            const initResult = await initiatePayment(bookingId, selectedMethod)
            if (!initResult.success) {
                throw new Error("Initialization failed")
            }

            // Step 2: Verify Payment
            setLoadingMessage("Verifying payment...")
            await new Promise(resolve => setTimeout(resolve, 1500))

            const verifyResult = await verifyPayment(bookingId, 'simulated_txn_' + Date.now())

            if (verifyResult.success) {
                toast.success("Payment Successful!")
                router.push(`/book/success?bookingId=${bookingId}`)
            } else {
                throw new Error("Verification failed")
            }
        } catch (error) {
            console.error("Payment error:", error)
            toast.error("Payment failed. Please check your connection and try again.")
        } finally {
            setIsProcessing(false)
        }
    }

    const selectedOption = PAYMENT_OPTIONS.find(opt => opt.id === selectedMethod)

    return (
        <div className="space-y-6">
            <h2 className="text-lg font-semibold mb-4">Select Payment Method</h2>

            <div className="grid grid-cols-2 gap-4">
                {PAYMENT_OPTIONS.map((option) => (
                    <button
                        key={option.id}
                        onClick={() => setSelectedMethod(option.id)}
                        disabled={isProcessing}
                        className={cn(
                            "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all h-32 space-y-2 relative overflow-hidden",
                            selectedMethod === option.id
                                ? cn(option.activeBorder, option.activeBg)
                                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600",
                            isProcessing && selectedMethod !== option.id && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        <div className={cn(
                            "h-12 w-12 rounded-full flex items-center justify-center bg-background/80 backdrop-blur-sm",
                            option.colorClass
                        )}>
                            <option.icon className="h-6 w-6" />
                        </div>
                        <span className={cn("font-bold", option.colorClass)}>
                            {option.label}
                        </span>
                    </button>
                ))}
            </div>

            {/* Telebirr Input */}
            {selectedMethod === 'telebirr' && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                    <label className="block text-sm font-medium mb-2">Enter Mobile Number</label>
                    <Input
                        placeholder="09..."
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="h-14 text-xl px-4 rounded-xl"
                        disabled={isProcessing}
                    />
                </div>
            )}

            {/* Pay Button */}
            <Button
                onClick={handlePayment}
                disabled={!selectedMethod || isProcessing}
                className={cn(
                    "w-full h-14 text-lg font-semibold transition-all",
                    selectedOption?.btnClass || "bg-gray-400 cursor-not-allowed"
                )}
            >
                {isProcessing ? (
                    <span className="flex items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        {loadingMessage}
                    </span>
                ) : (
                    `Pay ${amount} ETB ${selectedOption ? `with ${selectedOption.label}` : ''}`
                )}
            </Button>
        </div>
    )
}
