'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Inbox, LogIn, MessageCircle } from 'lucide-react'
import { ChatThread } from '@/components/chat/chat-thread'
import { ConversationList } from '@/components/chat/conversation-list'
import { getMyConversations, type Conversation } from '@/lib/actions/chat-messages'

interface ChatBoxProps {
    serviceId: string
    serviceTitle?: string
    providerId: string
    currentUserId: string | null
    provider?: {
        full_name?: string | null
        first_name?: string | null
        avatar_url?: string | null
        is_verified?: boolean
        has_business_license?: boolean
    } | null
}

/**
 * Service-page chat.
 * - Logged out: prompt to log in (returns here afterwards).
 * - Customer: their own conversation with this provider.
 * - Provider (owner): their conversations about this service — never a chat with themselves.
 */
export function ChatBox({ serviceId, serviceTitle, providerId, currentUserId, provider }: ChatBoxProps) {
    const isOwner = Boolean(currentUserId && currentUserId === providerId)
    const [conversations, setConversations] = useState<Conversation[] | null>(null)

    useEffect(() => {
        if (isOwner) void getMyConversations().then(setConversations)
    }, [isOwner])

    if (!currentUserId) {
        return (
            <div className="rounded-xl border border-border bg-card p-5">
                <p className="flex items-center gap-2 font-semibold"><MessageCircle className="h-5 w-5 text-primary" /> Chat with the provider</p>
                <p className="mt-1 text-sm text-muted-foreground">Ask about availability, price or details before you book.</p>
                <Link href={`/auth/login?next=/services/${serviceId}`}
                    className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">
                    <LogIn className="h-4 w-4" /> Log in to message
                </Link>
            </div>
        )
    }

    if (isOwner) {
        return (
            <div className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                    <p className="flex items-center gap-2 font-semibold"><Inbox className="h-5 w-5 text-primary" /> Customer messages</p>
                    <Link href="/messages" className="text-sm font-medium text-primary">All messages</Link>
                </div>
                {conversations === null ? (
                    <div className="space-y-2 p-4">{[0, 1].map((i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-secondary" />)}</div>
                ) : (
                    <ConversationList initial={conversations} currentUserId={currentUserId} serviceId={serviceId}
                        emptyText="Customers who message you about this service will appear here." />
                )}
            </div>
        )
    }

    const name = provider?.full_name?.trim() || provider?.first_name || 'Provider'
    return (
        <ChatThread
            serviceId={serviceId}
            serviceTitle={serviceTitle}
            currentUserId={currentUserId}
            other={{
                id: providerId,
                name,
                avatarUrl: provider?.avatar_url,
                isVerified: provider?.is_verified,
                hasLicense: provider?.has_business_license,
            }}
            quickReplies={['Are you available this week?', 'What does the price include?', 'Can you send more photos?']}
        />
    )
}
