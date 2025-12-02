'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Calendar, CheckCircle } from 'lucide-react'
import { createBookingJson } from '@/lib/actions'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface BookingFormProps {
    serviceId: string
    price: number
}

export function BookingForm({ serviceId, price }: BookingFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsSubmitting(true)

        const formData = new FormData(e.currentTarget)

        try {
            const result = await createBookingJson(formData)

            if (result.error) {
                toast.error(result.error)
            } else if (result.success && result.bookingId) {
                toast.success("Booking Initiated! Redirecting to payment...")
                router.push(`/payment/${result.bookingId}`)
            }
        } catch (error) {
            console.error('Booking error:', error)
            toast.error("Failed to create booking. Please try again.")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <input type="hidden" name="serviceId" value={serviceId} />

            <div className="space-y-2">
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Select Date & Time
                </label>
                <div className="relative">
                    <Input
                        type="datetime-local"
                        name="date"
                        id="date"
                        required
                        className="pl-10 h-12 text-lg"
                        min={new Date().toISOString().slice(0, 16)}
                    />
                    <Calendar className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg flex gap-3 items-start">
                <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800 dark:text-blue-200">
                    <p className="font-medium">Free Cancellation</p>
                    <p>You can cancel up to 24 hours before your appointment.</p>
                </div>
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700">
                {isSubmitting ? 'Processing...' : 'Confirm Booking'}
            </Button>
        </form>
    )
}
