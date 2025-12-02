'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Send } from 'lucide-react'
import { sendMessage } from '@/lib/actions'

interface Message {
    id: string
    content: string
    sender_id: string
    created_at: string
}

interface ChatBoxProps {
    serviceId: string
    providerId: string
    initialMessages: Message[]
    currentUserId: string | null
}

export function ChatBox({ serviceId, providerId, initialMessages, currentUserId }: ChatBoxProps) {
    const [messages, setMessages] = useState<Message[]>(initialMessages)
    const [newMessage, setNewMessage] = useState('')
    const [loading, setLoading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const supabase = createClient()

    useEffect(() => {
        const channel = supabase
            .channel('realtime messages')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `service_id=eq.${serviceId}`
            }, (payload) => {
                const newMsg = payload.new as Message
                // Only add if it's relevant to this chat (sender or receiver is current user)
                // Actually, the filter `service_id` is broad. We should filter by user IDs too if possible,
                // but for now let's just append.
                setMessages((prev) => [...prev, newMsg])
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [serviceId, supabase])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const handleSend = async () => {
        if (!newMessage.trim() || !currentUserId) return

        setLoading(true)
        try {
            // Optimistic update could go here, but for simplicity we'll wait for the server action
            // or the realtime event.
            // Let's use the server action to send.
            await sendMessage(serviceId, providerId, newMessage)
            setNewMessage('')
        } catch (error) {
            console.error('Failed to send message:', error)
            // Extract error message if possible
            const errorMessage = error instanceof Error ? error.message : 'Failed to send message'
            alert(`Error: ${errorMessage}`) // Temporary: Alert the user to the error
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

    return (
        <Card className="flex flex-col h-[400px]">
            <CardHeader className="py-3 border-b">
                <CardTitle className="text-lg">Direct Chat</CardTitle>
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
