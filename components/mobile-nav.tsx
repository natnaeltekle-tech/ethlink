'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, PlusCircle, User, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useHaptics } from '@/lib/hooks/useHaptics'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUnreadMessages, isChatThreadPath } from '@/lib/hooks/use-unread-messages'

export function MobileNav() {
    const pathname = usePathname()
    const haptics = useHaptics()
    const [user, setUser] = useState<any>(null)

    useEffect(() => {
        const supabase = createClient()

        // Initial fetch — .catch() prevents unhandled rejection on expired tokens
        supabase.auth.getUser()
            .then(({ data: { user } }) => { setUser(user) })
            .catch(() => { /* expired/corrupt session — stay as guest */ })

        // Listen for changes (login/logout)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null)
        })

        return () => subscription.unsubscribe()
    }, [])

    const unreadMessages = useUnreadMessages(user?.id)

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
            exclude: (path: string) => path === '/services/new' || path?.startsWith('/services/new/')
        },
        {
            href: '/services/new',
            label: 'Add',
            icon: PlusCircle,
            exact: true
        },
        {
            href: user ? '/messages' : '/auth/login?next=/messages',
            label: 'Messages',
            icon: MessageCircle,
            exact: false,
            badge: unreadMessages,
        },
        // Profile tab logic
        user
            ? {
                href: '/dashboard',
                label: 'Profile',
                icon: User,
                exact: false
            }
            : {
                href: '/auth/login',
                label: 'Login',
                icon: User,
                exact: false
            }
    ]

    const handleNavClick = () => {
        haptics.light()
    }

    // A conversation is full-screen with its own composer at the bottom
    if (isChatThreadPath(pathname)) return null

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-t border-border md:hidden supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center justify-around h-16">
                {links.map((link) => {
                    if (!link) return null
                    const Icon = link.icon
                    const badge = 'badge' in link ? (link.badge ?? 0) : 0
                    let isActive: boolean
                    if (link.exact) {
                        isActive = pathname === link.href
                    } else {
                        isActive = pathname === link.href || pathname?.startsWith(link.href + '/')
                    }
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
                            <span className="relative">
                                <Icon className={cn("w-6 h-6 transition-transform", isActive && "fill-current scale-110")} />
                                {badge > 0 && (
                                    <span className="absolute -right-2.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-background"
                                        aria-label={`${badge} unread messages`}>
                                        {badge > 99 ? '99+' : badge}
                                    </span>
                                )}
                            </span>
                            <span className="text-[10px] font-medium">{link.label}</span>
                        </Link>
                    )
                })}
            </div>
            <div className="h-[env(safe-area-inset-bottom)] bg-background/80 backdrop-blur-md" />
        </div>
    )
}
