import { notFound, redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getMyConversations } from '@/lib/actions/chat-messages'
import { getPublicProviderInfo } from '@/lib/actions'
import { ChatThread } from '@/components/chat/chat-thread'

export const metadata = { title: 'Chat · Eth-Links' }

const uuid = z.string().uuid()

export default async function ChatPage({ params }: { params: Promise<{ serviceId: string; userId: string }> }) {
    const { serviceId, userId } = await params
    if (!uuid.safeParse(serviceId).success || !uuid.safeParse(userId).success) notFound()

    const supabase = await createClient()
    let me = null
    try {
        const { data } = await supabase.auth.getUser()
        me = data.user
    } catch {
        /* expired session */
    }
    if (!me) redirect(`/auth/login?next=/messages/${serviceId}/${userId}`)
    if (me.id === userId) redirect('/messages')

    // Service title/owner: public listing, or (if hidden) from an existing conversation
    const [{ data: service }, conversations, other] = await Promise.all([
        supabase.from('services').select('id, title, user_id').eq('id', serviceId).maybeSingle(),
        getMyConversations(),
        getPublicProviderInfo(userId),
    ])
    const existing = conversations.find((c) => c.serviceId === serviceId && c.otherUserId === userId)
    const ownerId = service?.user_id ?? existing?.serviceOwnerId
    // A conversation is always between the service's provider and someone else
    if (!ownerId || (ownerId !== me.id && ownerId !== userId)) notFound()

    const isCustomer = ownerId === userId
    const name = existing?.otherName ?? other?.full_name ?? 'Eth-Links user'

    return (
        <div className="mx-auto w-full md:max-w-2xl md:py-6">
            <ChatThread
                variant="full"
                className="md:h-[78vh] md:rounded-xl md:border md:border-border"
                backHref="/messages"
                serviceId={serviceId}
                serviceTitle={service?.title ?? existing?.serviceTitle}
                currentUserId={me.id}
                other={{
                    id: userId,
                    name,
                    avatarUrl: other?.avatar_url ?? existing?.otherAvatar,
                    // Badges describe providers; only show them for the service's provider
                    isVerified: isCustomer ? other?.is_verified : false,
                    hasLicense: isCustomer ? other?.has_business_license : false,
                }}
                quickReplies={isCustomer ? ['Are you available this week?', 'What does the price include?', 'Can you send more photos?'] : undefined}
            />
        </div>
    )
}
