'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PROVIDER_TABS } from '@/components/BottomNav'
import { cn } from '@/lib/utils'

/** Desktop only: provider workspace tabs (phones use the bottom navigation). */
export function ProviderTabs() {
    const pathname = usePathname()
    return (
        <nav aria-label="Provider workspace" className="hidden border-b border-border md:block">
            <div className="mx-auto flex max-w-4xl gap-1 px-4">
                {PROVIDER_TABS.map((t) => {
                    const active = pathname === t.href || pathname?.startsWith(`${t.href}/`)
                    return (
                        <Link key={t.href} href={t.href}
                            className={cn('flex min-h-[48px] items-center gap-2 border-b-2 px-3 text-sm font-medium',
                                active ? 'border-[#FACC15] text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}>
                            <t.icon className="h-4 w-4" />{t.label}
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
