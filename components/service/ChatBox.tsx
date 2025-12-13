'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Send } from 'lucide-react'
import { getMessages, sendMessage } from '@/lib/actions'

interface Message {
    id: string
    content: string
    sender_id: string
    receiver_id: string
    created_at: string
}

interface ChatBoxProps {
    serviceId: string
    providerId: string
    currentUserId: string | null
}

export function ChatBox({ serviceId, providerId, currentUserId }: ChatBoxProps) {
    const [messages, setMessages] = useState<Message[]>([])
    const [newMessage, setNewMessage] = useState('')
    const [loading, setLoading] = useState(false)
    const [isOnline, setIsOnline] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Stable client instance
    const [supabase] = useState(() => createClient())

    // Presence State
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())

    // Initial Fetch (History)
    useEffect(() => {
        const fetchMessages = async () => {
            const initialMessages = await getMessages(serviceId)
            if (initialMessages) {
                setMessages(initialMessages as Message[])
            }
        }

        if (currentUserId) {
            fetchMessages()
        }
    }, [serviceId, currentUserId])

    // Realtime & Presence Subscription
    useEffect(() => {
        if (!serviceId || !currentUserId) return

        const channel = supabase.channel(`room-${serviceId}`)

        channel
            // 1. Listen for new messages
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `service_id=eq.${serviceId}`
            }, (payload) => {
                const newMsg = payload.new as Message
                console.log('Realtime Event Received:', payload) // Keep debug log for now

                // Privacy Check: REMOVED by request to allow all messages in the room
                // if (newMsg.sender_id !== currentUserId && newMsg.receiver_id !== currentUserId) {
                //     return;
                // }

                setMessages((prev) => {
                    // Deduplication: Check if we have a temp message from ourselves
                    if (newMsg.sender_id === currentUserId) {
                        const tempMatchIndex = prev.findIndex(m =>
                            String(m.id).startsWith('temp-') &&
                            m.content === newMsg.content
                        )
                        if (tempMatchIndex !== -1) {
                            const newMessages = [...prev]
                            newMessages[tempMatchIndex] = newMsg // Replace temp with real
                            return newMessages
                        }
                    }
                    // Standard Deduplication
                    if (prev.some(m => m.id === newMsg.id)) return prev

                    return [...prev, newMsg]
                })
            })
            // 2. Presence: Track who is online
            .on('presence', { event: 'sync' }, () => {
                const newState = channel.presenceState()
                const onlineIds = new Set<string>()

                for (const key in newState) {
                    const users = newState[key] as any[]
                    users.forEach(u => {
                        // Support both user_id directly or nested in a custom object if that's how it's sent
                        // But based on our track call below, it should be at the top level of the payload.
                        if (u.user_id) onlineIds.add(u.user_id)
                    })
                }

                // Debug logging
                console.log('Presence Sync:', Array.from(onlineIds))
                setOnlineUsers(onlineIds)
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    // Announce my presence
                    console.log('Subscribed to presence channel')
                    await channel.track({
                        online_at: new Date().toISOString(),
                        user_id: currentUserId,
                    })
                }
            })

        return () => {
            supabase.removeChannel(channel)
        }
    }, [serviceId, supabase, currentUserId])

    // Update isOnline based on Presence
    useEffect(() => {
        const isProviderOnline = onlineUsers.has(providerId)
        console.log(`Checking Status: Provider=${providerId}, Online=${isProviderOnline}, AllOnline=${Array.from(onlineUsers)}`)
        setIsOnline(isProviderOnline)
    }, [onlineUsers, providerId])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const handleSend = async () => {
        if (!newMessage.trim() || !currentUserId) return

        const tempId = `temp-${Date.now()}`
        const tempMessage: Message = {
            id: tempId,
            content: newMessage,
            sender_id: currentUserId,
            receiver_id: providerId,
            created_at: new Date().toISOString()
        }

        // Optimistic Update
        setMessages((prev) => [...prev, tempMessage])
        setNewMessage('')
        setLoading(true)

        try {
            await sendMessage(serviceId, providerId, tempMessage.content)
            // Realtime listener will handle the success case (replacing temp msg)
        } catch (error) {
            console.error('Failed to send message:', error)
            setMessages((prev) => prev.filter(m => m.id !== tempId)) // Rollback
            const errorMessage = error instanceof Error ? error.message : 'Failed to send message'
            alert(`Error: ${errorMessage}`)
        } finally {
            setLoading(false)
        }
    }

    if (!currentUserId) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Chat with Provider</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-sm">Please log in to chat with this provider.</p>
                </CardContent>
            </Card>
        )
    }

    // Owner View Restriction REMOVED by request to make chat visible to everyone
    // if (currentUserId === providerId) {
    //     return (
    //         <Card>
    //             <CardHeader>
    //                 <CardTitle className="text-lg">Owner View</CardTitle>
    //             </CardHeader>
    //             <CardContent>
    //                 <p className="text-muted-foreground text-sm">You are the provider of this service. You cannot chat with yourself.</p>
    //             </CardContent>
    //         </Card>
    //     )
    // }

    return (
        <Card className="flex flex-col h-[400px]">
            <CardHeader className="py-3 border-b flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-lg">Direct Chat</CardTitle>
                <div className="flex items-center gap-2">
                    {currentUserId === providerId ? (
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                            <span className="text-sm font-medium text-green-600">You (Online)</span>
                        </div>
                    ) : (
                        <>
                            <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                            <span className={`text-sm font-medium ${isOnline ? 'text-green-600' : 'text-gray-500'}`}>
                                {isOnline ? 'Online' : 'Offline'}
                            </span>
                        </>
                    )}
                </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                {messages.length === 0 && (
                    <div className="text-center text-muted-foreground text-sm py-4">
                        No messages yet. Say hello!
                    </div>
                )}
                {messages.map((msg) => {
                    const isMe = msg.sender_id === currentUserId
                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${isMe ? 'bg-primary text-primary-foreground' : 'bg-muted'
                                }`}>
                                {msg.content}
                            </div>
                        </div>
                    )
                })}
                <div ref={messagesEndRef} />
            </CardContent>
            <div className="p-3 border-t flex gap-2">
                <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    disabled={loading}
                />
                <Button size="icon" onClick={handleSend} disabled={loading || !newMessage.trim()}>
                    <Send className="h-4 w-4" />
                </Button>
            </div>
        </Card>
    )
}
