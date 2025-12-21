'use client'

import { useState, useEffect } from 'react'
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

interface Notification {
    id: string
    user_id?: string // Added for client-side filtering
    content: string
    link?: string
    type: 'booking' | 'payment' | 'message' | 'info'
    is_read: boolean
    created_at: string
}

export function NotificationBell({ userId }: { userId: string | null }) {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [isOpen, setIsOpen] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        if (!userId) return

        // Fetch initial notifications
        const fetchNotifications = async () => {
            const { data } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(10)

            if (data) {
                setNotifications(data)
                setUnreadCount(data.filter(n => !n.is_read).length)
            }
        }

        fetchNotifications()

        // Subscribe to realtime updates
        const channel = supabase
            .channel('notifications-all')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications'
                },
                (payload) => {
                    console.log('New Notification!', payload)
                    const newNotification = payload.new as Notification

                    // Client-side filtering since we removed the subscription filter
                    if (newNotification.user_id === userId || !newNotification.user_id) {
                        // Note: !newNotification.user_id check is just for safety/broadcasts if any
                        setNotifications(prev => [newNotification, ...prev])
                        setUnreadCount(prev => prev + 1)
                        toast.info(newNotification.content)
                    }

                    // Optional: Play a sound
                    // const audio = new Audio('/notification.mp3')
                    // audio.play().catch(e => console.log('Audio play failed', e))
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [userId, supabase])

    const handleMarkAsRead = async (notificationId: string, link?: string) => {
        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n))
        setUnreadCount(prev => Math.max(0, prev - 1))
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
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
        setUnreadCount(0)

        await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', userId)
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
                {notifications.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                        No notifications yet
                    </div>
                ) : (
                    <div className="max-h-[300px] overflow-y-auto">
                        {notifications.map((notification) => (
                            <DropdownMenuItem
                                key={notification.id}
                                className={cn(
                                    "flex flex-col items-start gap-1 p-3 cursor-pointer",
                                    !notification.is_read && "bg-secondary/50"
                                )}
                                onClick={() => handleMarkAsRead(notification.id, notification.link)}
                            >
                                <div className="font-medium text-sm leading-none">
                                    {notification.content}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {new Date(notification.created_at).toLocaleTimeString()}
                                </div>
                            </DropdownMenuItem>
                        ))}
                    </div>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
