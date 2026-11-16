'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, LogIn } from 'lucide-react'
import { ChatThread } from '@/components/chat/chat-thread'

interface MobileChatRoomProps {
    providerId: string
    providerName: string
    providerAvatar?: string | null
    providerIsVerified?: boolean
    providerHasLicense?: boolean
    currentUserId: string
    serviceId?: string
    serviceTitle?: string
    onClose?: () => void
}

/**
 * Full-screen chat (Capacitor app) between the signed-in customer and the
 * service's provider. Providers opening their own service go to their inbox.
 */
export default function MobileChatRoom({
    providerId, providerName = 'Provider', providerAvatar, providerIsVerified, providerHasLicense,
    currentUserId, serviceId, serviceTitle, onClose,
}: MobileChatRoomProps) {
    const router = useRouter()
    const isOwner = Boolean(currentUserId && currentUserId === providerId)

    useEffect(() => {
        if (isOwner) router.push('/messages')
    }, [isOwner, router])

    if (!currentUserId || !serviceId) {
        return (
            <div className="flex h-[100dvh] flex-col bg-background text-foreground" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
                <div className="flex items-center gap-2 border-b border-border px-3 py-3">
                    <button type="button" onClick={onClose ?? (() => router.back())} aria-label="Back" className="rounded-full p-2 hover:bg-secondary">
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <p className="font-semibold">Chat with {providerName}</p>
                </div>
                <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
                    <p className="text-muted-foreground">Log in to message {providerName} about this service.</p>
                    <Link href={`/auth/login?next=/services/${serviceId ?? ''}`}
                        className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-primary px-6 font-semibold text-primary-foreground">
                        <LogIn className="h-4 w-4" /> Log in
                    </Link>
                </div>
            </div>
        )
    }

    if (isOwner) return null

    return (
        <ChatThread
            variant="full"
            serviceId={serviceId}
            serviceTitle={serviceTitle}
            currentUserId={currentUserId}
            onBack={onClose ?? (() => router.back())}
            other={{ id: providerId, name: providerName, avatarUrl: providerAvatar, isVerified: providerIsVerified, hasLicense: providerHasLicense }}
            quickReplies={['Are you available this week?', 'What does the price include?', 'Can you send more photos?']}
        />
    )
}
