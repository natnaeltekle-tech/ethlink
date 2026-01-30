'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useHaptics } from '@/lib/hooks/useHaptics'

interface MobileHeaderProps {
    title: string
    showBack?: boolean
    rightAction?: React.ReactNode
    className?: string
}

/**
 * Mobile-optimized header component
 * Follows iOS/Android conventions with centered title and back button
 */
export function MobileHeader({
    title,
    showBack = true,
    rightAction,
    className,
}: MobileHeaderProps) {
    const router = useRouter()
    const haptics = useHaptics()

    const handleBack = () => {
        haptics.light()
        router.back()
    }

    return (
        <header
            className={cn(
                'sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border h-14 flex items-center px-2 pt-[env(safe-area-inset-top)]',
                className
            )}
        >
            {/* Left: Back button or spacer */}
            <div className="flex-shrink-0 w-11">
                {showBack && (
                    <button
                        onClick={handleBack}
                        className="flex items-center justify-center min-w-[44px] min-h-[44px] -ml-2 active:scale-90 transition-transform"
                        aria-label="Go back"
                    >
                        <ChevronLeft className="w-6 h-6 text-foreground" />
                    </button>
                )}
            </div>

            {/* Center: Title */}
            <h1 className="flex-1 text-center text-lg font-semibold text-foreground truncate px-2">
                {title}
            </h1>

            {/* Right: Action or spacer */}
            <div className="flex-shrink-0 w-11 flex items-center justify-end">
                {rightAction}
            </div>
        </header>
    )
}
