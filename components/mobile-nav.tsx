'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, PlusCircle, User } from 'lucide-react'
import { cn } from '@/lib/utils'

export function MobileNav() {
    const pathname = usePathname()

    const links = [
        {
            href: '/',
            label: 'Home',
            icon: Home
        },
        {
            href: '/services',
            label: 'Explore',
            icon: Search
        },
        {
            href: '/services/new',
            label: 'Add',
            icon: PlusCircle
        },
        {
            href: '/dashboard',
            label: 'Profile',
            icon: User
        }
    ]

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t border-border md:hidden">
            <div className="flex items-center justify-around h-16">
                {links.map((link) => {
                    const Icon = link.icon
                    const isActive = pathname === link.href || (link.href !== '/' && pathname?.startsWith(link.href))

                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            prefetch={true}
                            className={cn(
                                "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors",
                                isActive
                                    ? "text-yellow-500"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Icon className={cn("w-6 h-6", isActive && "fill-current")} />
                            <span className="text-[10px] font-medium">{link.label}</span>
                        </Link>
                    )
                })}
            </div>
            {/* Safe area padding for newer iPhones */}
            <div className="h-[env(safe-area-inset-bottom)] bg-background/95 backdrop-blur" />
        </div>
    )
}
