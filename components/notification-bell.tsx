'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

import { Database } from '@/lib/types/database'
import { uniqueChannel } from '@/lib/realtime'
import { useBackHandler } from '@/lib/native/back-handler'
import { useAppMode } from '@/context/AppModeContext'
import { modeForLink, type AppMode } from '@/lib/app-mode'

type Notification = Database['public']['Tables']['notifications']['Row']

/** Shared notifications (messages, account) show in both workspaces. */
const inMode = (n: Notification, mode: AppMode) => {
    const role = modeForLink(n.link)
    return role === null || role === mode
}

export function NotificationBell({ userId }: { userId: string | null }) {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [isOpen, setIsOpen] = useState(false)
    // Workspace isolation: customer mode never shows provider job alerts (and vice versa).
    const { mode } = useAppMode()
    const modeRef = useRef(mode)
    modeRef.current = mode
    const visible = notifications.filter((n) => inMode(n, mode))
    const unreadCount = visible.filter((n) => !n.is_read).length
    useBackHandler(() => setIsOpen(false), isOpen)
    const router = useRouter()
    const [supabase] = useState(() => createClient())

    useEffect(() => {
        if (!userId) return

        // Notifications only — unread chat messages have their own badge
        // (Messages tab / navbar), so they are not double-counted here.
        const fetchNotifications = async () => {
            const { data: notificationsData } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(30)

            if (notificationsData) {
                setNotifications(notificationsData)
            }
        }

        fetchNotifications()
        // A conversation opened elsewhere marks its message notification read
        window.addEventListener('ethlinks:messages-read', fetchNotifications)

        // Subscribe to realtime updates
        const channel = supabase
            .channel(uniqueChannel('bell'))
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`
                },
                (payload) => {
                    const newNotification = payload.new as Notification
                    setNotifications(prev => [newNotification, ...prev].slice(0, 30))
                    // Don't toast a message for the conversation already on screen,
                    // or a job alert while in customer mode (and vice versa).
                    if (newNotification.link && newNotification.link === window.location.pathname) return
                    if (!inMode(newNotification, modeRef.current)) return
                    toast.info(newNotification.content ?? newNotification.title ?? 'New notification', {
                        action: newNotification.link
                            ? { label: 'Open', onClick: () => router.push(newNotification.link as string) }
                            : undefined,
                    })
                }
            )
            .subscribe()

        return () => {
            window.removeEventListener('ethlinks:messages-read', fetchNotifications)
            supabase.removeChannel(channel)
        }
    }, [userId, supabase, router])

    const handleMarkAsRead = async (notificationId: string, link?: string) => {
        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n))
        setIsOpen(false) // Close dropdown

        // Database update
        await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId)

        if (link) {
            router.push(link)
        }
    }

    const handleMarkAllRead = async () => {
        if (!userId) return
        const ids = visible.filter(n => !n.is_read).map(n => n.id)
        if (!ids.length) return
        setNotifications(prev => prev.map(n => ids.includes(n.id) ? { ...n, is_read: true } : n))

        await supabase
            .from('notifications')
            .update({ is_read: true })
            .in('id', ids)
    }

    if (!userId) return null

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-red-600 animate-pulse border border-background" />
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between">
                    <span>Notifications</span>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-6 px-2 text-muted-foreground hover:text-primary"
                            onClick={(e) => {
                                e.preventDefault()
                                handleMarkAllRead()
                            }}
                        >
                            Mark all read
                        </Button>
                    )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {visible.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                        No notifications yet
                    </div>
                ) : (
                    <div className="max-h-[300px] overflow-y-auto">
                        {visible.map((notification) => (
                            <DropdownMenuItem
                                key={notification.id}
                                className={cn(
                                    "flex flex-col items-start gap-1 p-3 cursor-pointer",
                                    !notification.is_read && "bg-secondary/50"
                                )}
                                onClick={() => handleMarkAsRead(notification.id, notification.link ?? undefined)}
                            >
                                <div className="font-medium text-sm leading-snug line-clamp-2">
                                    {notification.content ?? notification.title}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {new Date(notification.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                </div>
                            </DropdownMenuItem>
                        ))}
                    </div>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
