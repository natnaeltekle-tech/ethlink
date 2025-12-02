'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CreditCard, Smartphone, Building2, Wallet } from 'lucide-react'
import { processPayment } from '@/lib/actions'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface PaymentMethodsProps {
    bookingId: string
    amount: number
}

type PaymentMethod = 'telebirr' | 'cbe' | 'chapa' | 'boa'

export function PaymentMethods({ bookingId, amount }: PaymentMethodsProps) {
    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null)
    const [phoneNumber, setPhoneNumber] = useState('')
    const [isProcessing, setIsProcessing] = useState(false)
    const [loadingMessage, setLoadingMessage] = useState('')

    const handlePayment = async () => {
        if (!selectedMethod) return

        if (selectedMethod === 'telebirr' && !phoneNumber) {
            toast.error("Please enter your mobile number")
            return
        }

        setIsProcessing(true)

        if (selectedMethod === 'telebirr') {
            setLoadingMessage("Waiting for confirmation on your phone...")
            // Simulate 3s delay
            await new Promise(resolve => setTimeout(resolve, 3000))
        } else {
            setLoadingMessage("Processing payment...")
            // Simulate 1s delay for others
            await new Promise(resolve => setTimeout(resolve, 1000))
        }

        try {
            // Call the server action to "complete" the payment
            await processPayment(bookingId)
            // The server action redirects, so we might not reach here, but just in case:
            toast.success("Payment Successful!")
        } catch (error) {
            console.error("Payment failed", error)
            toast.error("Payment failed. Please try again.")
            setIsProcessing(false)
        }
    }

    return (
        <div className="space-y-6">
            <h2 className="text-lg font-semibold mb-4">Select Payment Method</h2>

            <div className="grid grid-cols-2 gap-4">
                {/* Telebirr */}
                <button
                    onClick={() => setSelectedMethod('telebirr')}
                    className={cn(
                        "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all h-32 space-y-2",
                        selectedMethod === 'telebirr'
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                            : "border-gray-200 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800"
                    )}
                >
                    <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                        <Smartphone className="h-6 w-6" />
                    </div>
                    <span className="font-bold text-blue-700 dark:text-blue-300">Telebirr</span>
                </button>

                {/* CBE Birr */}
                <button
                    onClick={() => setSelectedMethod('cbe')}
                    className={cn(
                        "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all h-32 space-y-2",
                        selectedMethod === 'cbe'
                            ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                            : "border-gray-200 dark:border-gray-700 hover:border-purple-200 dark:hover:border-purple-800"
                    )}
                >
                    <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                        <Wallet className="h-6 w-6" />
                    </div>
                    <span className="font-bold text-purple-700 dark:text-purple-300">CBE Birr</span>
                </button>

                {/* Chapa */}
                <button
                    onClick={() => setSelectedMethod('chapa')}
                    className={cn(
                        "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all h-32 space-y-2",
                        selectedMethod === 'chapa'
                            ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                            : "border-gray-200 dark:border-gray-700 hover:border-green-200 dark:hover:border-green-800"
                    )}
                >
                    <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                        <CreditCard className="h-6 w-6" />
                    </div>
                    <span className="font-bold text-green-700 dark:text-green-300">Chapa</span>
                </button>

                {/* BoA */}
                <button
                    onClick={() => setSelectedMethod('boa')}
                    className={cn(
                        "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all h-32 space-y-2",
                        selectedMethod === 'boa'
                            ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20"
                            : "border-gray-200 dark:border-gray-700 hover:border-orange-200 dark:hover:border-orange-800"
                    )}
                >
                    <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                        <Building2 className="h-6 w-6" />
                    </div>
                    <span className="font-bold text-orange-700 dark:text-orange-300">BoA</span>
                </button>
            </div>

            {/* Telebirr Input */}
            {selectedMethod === 'telebirr' && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                    <label className="block text-sm font-medium mb-2">Enter Mobile Number</label>
                    <Input
                        placeholder="+251 9..."
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="h-12 text-lg"
                    />
                </div>
            )}

            {/* Pay Button */}
            <Button
                onClick={handlePayment}
                disabled={!selectedMethod || isProcessing}
                className={cn(
                    "w-full h-14 text-lg font-semibold transition-all",
                    selectedMethod === 'telebirr' ? "bg-blue-600 hover:bg-blue-700" :
                        selectedMethod === 'cbe' ? "bg-purple-600 hover:bg-purple-700" :
                            selectedMethod === 'chapa' ? "bg-green-600 hover:bg-green-700" :
                                selectedMethod === 'boa' ? "bg-orange-600 hover:bg-orange-700" :
                                    "bg-gray-400 cursor-not-allowed"
                )}
            >
                {isProcessing ? (
                    <span className="flex items-center gap-2">
                        <span className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        {loadingMessage}
                    </span>
                ) : (
                    `Pay ${amount} ETB ${selectedMethod ? `with ${selectedMethod === 'boa' ? 'Bank of Abyssinia' : selectedMethod === 'cbe' ? 'CBE Birr' : selectedMethod.charAt(0).toUpperCase() + selectedMethod.slice(1)}` : ''}`
                )}
            </Button>
        </div>
    )
}
