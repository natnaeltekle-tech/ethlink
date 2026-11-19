'use client'

import Link from 'next/link'
import { LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppMode } from '@/context/AppModeContext'

/** Header button: opens the active workspace (provider overview or customer profile). */
export function WorkspaceButton() {
    const { mode } = useAppMode()
    return (
        <Link href={mode === 'provider' ? '/provider/overview' : '/profile'}>
            <Button size="sm" className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">{mode === 'provider' ? 'Provider' : 'Profile'}</span>
            </Button>
        </Link>
    )
}
