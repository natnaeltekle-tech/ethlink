'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { submitReview } from '@/lib/actions'
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (rating === 0) return

        setIsSubmitting(true)
        try {
            await submitReview(serviceId, rating, comment)
            toast.success("Review submitted successfully!")
            setRating(0)
            setComment('')
            router.refresh()
        } catch (error) {
            console.error('Failed to submit review:', error)
            toast.error("Failed to submit review. Please try again.")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="mt-8 p-6 border rounded-lg bg-white dark:bg-gray-950">
            <h3 className="text-xl font-bold mb-4">Write a Review</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                    required
                    className="min-h-[100px]"
                />

                <div className="flex gap-4">
                    <Button type="submit" disabled={rating === 0 || isSubmitting}>
                        {isSubmitting ? 'Submitting...' : 'Submit Review'}
                    </Button>
                    <Button asChild variant="outline">
                        <Link href={`/book/${serviceId}`}>Book Now</Link>
                    </Button>
                </div>
            </form>
        </div>
    )
}
