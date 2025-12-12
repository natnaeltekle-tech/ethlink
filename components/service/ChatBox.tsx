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

    // Initial Fetch
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

    useEffect(() => {
        // Check online status based on last message from provider
        const checkOnlineStatus = () => {
            const providerMessages = messages.filter(m => m.sender_id === providerId)
            if (providerMessages.length === 0) {
                setIsOnline(false)
                return
            }

            const lastMessage = providerMessages[providerMessages.length - 1]
            const lastActive = new Date(lastMessage.created_at).getTime()
            const now = new Date().getTime()
            const diffInMinutes = (now - lastActive) / (1000 * 60)

            // Online if active in last 15 minutes
            setIsOnline(diffInMinutes <= 15)
        }

        checkOnlineStatus()
        // Re-check every minute
        const interval = setInterval(checkOnlineStatus, 60000)
        return () => clearInterval(interval)
    }, [messages, providerId])

    useEffect(() => {
        if (!serviceId) return

        const channel = supabase
            .channel(`room-${serviceId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `service_id=eq.${serviceId}`
            }, (payload) => {
                const newMsg = payload.new as Message

                setMessages((prev) => {
                    // Deduplication logic:
                    // If the new message is from ME, check if we have a temporary message with same content
                    if (newMsg.sender_id === currentUserId) {
                        const tempMatchIndex = prev.findIndex(m =>
                            m.id.startsWith('temp-') &&
                            m.content === newMsg.content
                        )

                        if (tempMatchIndex !== -1) {
                            // Replace temp message with real message
                            const newMessages = [...prev]
                            newMessages[tempMatchIndex] = newMsg
                            return newMessages
                        }
                    }

                    // Check if message ID already exists (just in case)
                    if (prev.some(m => m.id === newMsg.id)) {
                        return prev
                    }

                    return [...prev, newMsg]
                })
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [serviceId, supabase, currentUserId])

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
            created_at: new Date().toISOString()
        }

        // Optimistic Update
        setMessages((prev) => [...prev, tempMessage])
        setNewMessage('')
        setLoading(true)

        try {
            await sendMessage(serviceId, providerId, tempMessage.content)
            // We rely on Realtime to bring the "real" message with real ID.
        } catch (error) {
            console.error('Failed to send message:', error)
            // Rollback optimistic update
            setMessages((prev) => prev.filter(m => m.id !== tempId))
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

    if (currentUserId === providerId) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Owner View</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-sm">You are the provider of this service. You cannot chat with yourself.</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="flex flex-col h-[400px]">
            <CardHeader className="py-3 border-b flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-lg">Direct Chat</CardTitle>
                <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <span className={`text-sm font-medium ${isOnline ? 'text-green-600' : 'text-gray-500'}`}>
                        {isOnline ? 'Online' : 'Offline'}
                    </span>
                </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
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
