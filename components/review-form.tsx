'use client'

import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { getReviewableBookings, reviewBooking } from '@/lib/actions/dashboard'
import { formatBookingDate } from '@/lib/booking-time'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'

interface ReviewFormProps {
    serviceId: string
}

export function ReviewForm({ serviceId }: ReviewFormProps) {
    const [rating, setRating] = useState(0)
    const [hoverRating, setHoverRating] = useState(0)
    const [comment, setComment] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const router = useRouter()
    const [reviewable, setReviewable] = useState<{ id: string; date: string }[] | null>(null)
    const [bookingId, setBookingId] = useState('')

    useEffect(() => {
        getReviewableBookings(serviceId).then((rows) => { setReviewable(rows); setBookingId(rows[0]?.id ?? '') }).catch(() => setReviewable([]))
    }, [serviceId])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (rating === 0 || !bookingId) return

        setIsSubmitting(true)
        const r = await reviewBooking(bookingId, rating, comment)
        setIsSubmitting(false)
        if (!r.ok) return toast.error(r.error)
        toast.success('Review submitted — thank you!')
        setRating(0)
        setComment('')
        setReviewable((list) => {
            const rest = (list ?? []).filter((b) => b.id !== bookingId)
            setBookingId(rest[0]?.id ?? '')
            return rest
        })
        router.refresh()
    }

    // Only customers with a completed, not-yet-reviewed booking can review.
    if (reviewable === null) return null
    if (reviewable.length === 0) {
        return (
            <div className="mt-8 rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Reviews come from customers who completed a booking for this service.{' '}
                <Link href={`/book/${serviceId}`} className="font-medium text-primary">Book now</Link>
            </div>
        )
    }

    return (
        <div className="mt-8 p-6 border rounded-lg bg-card">
            <h3 className="text-xl font-bold mb-4">Write a Review</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
                {reviewable.length > 1 && (
                    <label className="block space-y-1 text-sm">
                        <span className="font-medium">Which booking?</span>
                        <select value={bookingId} onChange={(e) => setBookingId(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3">
                            {reviewable.map((b) => <option key={b.id} value={b.id}>{formatBookingDate(b.date)}</option>)}
                        </select>
                    </label>
                )}
                <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            type="button"
                            className="focus:outline-none transition-transform hover:scale-110"
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            onClick={() => setRating(star)}
                        >
                            <Star
                                className={`h-8 w-8 ${star <= (hoverRating || rating)
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300'
                                    }`}
                            />
                        </button>
                    ))}
                    <span className="ml-2 text-sm text-muted-foreground">
                        {rating > 0 ? `${rating} stars` : 'Select a rating'}
                    </span>
                </div>

                <Textarea
                    placeholder="Share your experience with this service..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    maxLength={1000}
                    className="min-h-[100px]"
                />

                <div className="flex gap-4">
                    <Button type="submit" disabled={rating === 0 || isSubmitting}>
                        {isSubmitting ? 'Submitting...' : 'Submit Review'}
                    </Button>
                </div>
            </form>
        </div>
    )
}
