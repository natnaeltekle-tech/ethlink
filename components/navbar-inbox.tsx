'use client'

import Link from 'next/link'
import { MessageCircle } from 'lucide-react'
import { NotificationBell } from '@/components/notification-bell'
import { useUnreadMessages } from '@/lib/hooks/use-unread-messages'

/** Web navbar: Messages (unread badge) + notification bell for signed-in users. */
export function NavbarInbox({ userId }: { userId: string }) {
    const unread = useUnreadMessages(userId)
    return (
        <div className="flex items-center gap-1">
            <Link href="/messages" aria-label={unread ? `Messages, ${unread} unread` : 'Messages'}
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground">
                <MessageCircle className="h-5 w-5" />
                {unread > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                        {unread > 99 ? '99+' : unread}
                    </span>
                )}
            </Link>
            <NotificationBell userId={userId} />
        </div>
    )
}
