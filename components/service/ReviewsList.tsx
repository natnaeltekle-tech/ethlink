import { Star, User } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface Review {
    id: string
    rating: number
    comment: string
    created_at: string
    profiles?: {
        full_name: string | null
        avatar_url: string | null
    } | null
}

interface ReviewsListProps {
    reviews: Review[]
}

export function ReviewsList({ reviews }: ReviewsListProps) {
    if (!reviews || reviews.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                No reviews yet. Be the first to review!
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <h3 className="text-2xl font-bold mb-4">Reviews</h3>
            <div className="grid gap-4">
                {reviews.map((review) => (
                    <Card key={review.id}>
                        <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                                        {review.profiles?.avatar_url ? (
                                            <img src={review.profiles.avatar_url} alt={review.profiles.full_name || 'User'} className="h-full w-full object-cover" />
                                        ) : (
                                            <User className="h-4 w-4 text-gray-500" />
                                        )}
                                    </div>
                                    <span className="font-semibold">{review.profiles?.full_name || 'Anonymous User'}</span>
                                </div>
                                <div className="flex items-center">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <Star
                                            key={i}
                                            className={`h-4 w-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                                        />
                                    ))}
                                </div>
                            </div>
                            <p className="text-gray-700 dark:text-gray-300">{review.comment}</p>
                            <div className="text-xs text-muted-foreground mt-2">
                                {new Date(review.created_at).toLocaleDateString()}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
