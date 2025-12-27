'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Calendar, CheckCircle, Users } from 'lucide-react'
import { createBookingJson } from '@/lib/actions'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface BookingFormProps {
    serviceId: string
    price: number
    category: string
}

export function BookingForm({ serviceId, price, category }: BookingFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const router = useRouter()

    // Determine if we should show the guest selector
    const showGuestSelector = ['Hospitality', 'Transport', 'Events'].includes(category)

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsSubmitting(true)

        const formData = new FormData(e.currentTarget)

        // If guest selector is hidden, ensure we send 1
        if (!showGuestSelector) {
            formData.set('guests', '1')
        }

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

            <div className="space-y-4">
                <div className="space-y-2">
                    <label htmlFor="date" className="block text-sm font-medium text-foreground">
                        Select Date & Time
                    </label>
                    <div className="relative">
                        <Input
                            type="datetime-local"
                            name="date"
                            id="date"
                            required
                            className="pl-10 h-12 text-lg bg-secondary text-foreground border-border focus:ring-primary focus:border-primary"
                            min={new Date().toISOString().slice(0, 16)}
                        />
                        <Calendar className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                    </div>
                </div>

                {showGuestSelector && (
                    <div className="space-y-2">
                        <label htmlFor="guests" className="block text-sm font-medium text-foreground">
                            Guests / Qty
                        </label>
                        <div className="relative">
                            <Select name="guests" defaultValue="1">
                                <SelectTrigger className="h-12 text-lg pl-10 bg-secondary text-foreground border-border focus:ring-primary focus:border-primary">
                                    <SelectValue placeholder="Select quantity" />
                                </SelectTrigger>
                                <SelectContent className="bg-popover text-popover-foreground border-border">
                                    <SelectItem value="1">1 Person</SelectItem>
                                    <SelectItem value="2">2 People</SelectItem>
                                    <SelectItem value="3">3 People</SelectItem>
                                    <SelectItem value="4">4 People</SelectItem>
                                    <SelectItem value="5">5+ Group</SelectItem>
                                </SelectContent>
                            </Select>
                            <Users className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground pointer-events-none" />
                        </div>
                    </div>
                )}
            </div>

            <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 text-lg font-bold bg-primary text-black hover:bg-yellow-500 transition-colors"
            >
                {isSubmitting ? 'Processing...' : 'Confirm Booking'}
            </Button>
        </form>
    )
}
