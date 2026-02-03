'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, PlusCircle, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useHaptics } from '@/lib/hooks/useHaptics'

export function MobileNav() {
    const pathname = usePathname()
    const haptics = useHaptics()

    const links = [
        {
            href: '/',
            label: 'Home',
            icon: Home,
            exact: true
        },
        {
            href: '/services',
            label: 'Explore',
            icon: Search,
            exact: false,
            // Explicit exclusion: Don't highlight Explore when on /services/new
            exclude: (path: string) => path === '/services/new' || path?.startsWith('/services/new/')
        },
        {
            href: '/services/new',
            label: 'Add',
            icon: PlusCircle,
            exact: true
        },
        {
            href: '/dashboard',
            label: 'Profile',
            icon: User,
            exact: false
        }
    ]

    const handleNavClick = () => {
        haptics.light()
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-t border-border md:hidden supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center justify-around h-16">
                {links.map((link) => {
                    const Icon = link.icon
                    // Strict path matching with explicit exclusion logic
                    let isActive: boolean
                    if (link.exact) {
                        isActive = pathname === link.href
                    } else {
                        // Strict equality for Explore route + startsWith for sub-routes
                        isActive = pathname === link.href || pathname?.startsWith(link.href + '/')
                    }
                    // Apply explicit exclusion if defined (e.g., don't highlight Explore on /services/new)
                    if (link.exclude && pathname && link.exclude(pathname)) {
                        isActive = false
                    }

                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            prefetch={true}
                            onClick={handleNavClick}
                            className={cn(
                                "flex flex-col items-center justify-center w-full h-full gap-1 transition-all min-h-[44px] min-w-[44px] active:scale-90",
                                isActive
                                    ? "text-primary"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Icon className={cn("w-6 h-6 transition-transform", isActive && "fill-current scale-110")} />
                            <span className="text-[10px] font-medium">{link.label}</span>
                        </Link>
                    )
                })}
            </div>
            {/* Safe area padding for newer iPhones */}
            <div className="h-[env(safe-area-inset-bottom)] bg-background/80 backdrop-blur-md" />
        </div>
    )
}
