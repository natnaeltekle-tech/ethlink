'use client'

import { useState, useTransition } from 'react'
import { Share2, Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { toggleFavorite } from '@/lib/actions'
import { cn } from '@/lib/utils'

interface ServiceActionsProps {
    serviceId: string
    initialIsFavorite: boolean
    isLoggedIn: boolean
}

export function ServiceActions({ serviceId, initialIsFavorite, isLoggedIn }: ServiceActionsProps) {
    const [isFavorite, setIsFavorite] = useState(initialIsFavorite)
    const [isPending, startTransition] = useTransition()

    const handleShare = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href)
            toast.success('Link copied to clipboard!')
        } catch (err) {
            toast.error('Failed to copy link')
        }
    }

    const handleToggleFavorite = () => {
        if (!isLoggedIn) {
            toast.error('Please log in to save services')
            return
        }

        // Optimistic update
        setIsFavorite(!isFavorite)

        startTransition(async () => {
            try {
                const result = await toggleFavorite(serviceId)
                // Ensure state matches server response
                setIsFavorite(result.isFavorite)
                if (result.isFavorite) {
                    toast.success('Added to favorites')
                } else {
                    toast.success('Removed from favorites')
                }
            } catch (error) {
                // Revert on error
                setIsFavorite(!isFavorite)
                toast.error('Failed to update favorites')
            }
        })
    }

    return (
        <div className="flex items-center gap-2">
            <Button
                variant="outline"
                size="icon"
                onClick={handleShare}
                title="Share"
            >
                <Share2 className="w-5 h-5" />
            </Button>
            <Button
                variant="outline"
                size="icon"
                onClick={handleToggleFavorite}
                disabled={isPending}
                title={isFavorite ? 'Remove from favorites' : 'Save to favorites'}
                className={cn(isFavorite && "text-red-500 hover:text-red-600")}
            >
                <Heart className={cn("w-5 h-5", isFavorite && "fill-current")} />
            </Button>
        </div>
    )
}
