'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, PlusCircle, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useHaptics } from '@/lib/hooks/useHaptics'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function MobileNav() {
    const pathname = usePathname()
    const haptics = useHaptics()
    const [user, setUser] = useState<any>(null)

    useEffect(() => {
        const supabase = createClient()

        // Initial fetch
        supabase.auth.getUser().then(({ data: { user } }) => {
            setUser(user)
        })

        // Listen for changes (login/logout)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null)
        })

        return () => subscription.unsubscribe()
    }, [])

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

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-t border-border md:hidden supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center justify-around h-16">
                {links.map((link) => {
                    if (!link) return null
                    const Icon = link.icon
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
                            <Icon className={cn("w-6 h-6 transition-transform", isActive && "fill-current scale-110")} />
                            <span className="text-[10px] font-medium">{link.label}</span>
                        </Link>
                    )
                })}
            </div>
            <div className="h-[env(safe-area-inset-bottom)] bg-background/80 backdrop-blur-md" />
        </div>
    )
}
