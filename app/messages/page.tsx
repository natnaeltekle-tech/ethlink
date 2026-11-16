import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMyConversations } from '@/lib/actions/chat-messages'
import { ConversationList } from '@/components/chat/conversation-list'

export const metadata = { title: 'Messages · Eth-Links' }

export default async function MessagesPage() {
    const supabase = await createClient()
    let user = null
    try {
        const { data } = await supabase.auth.getUser()
        user = data.user
    } catch {
        /* expired session */
    }
    if (!user) redirect('/auth/login?next=/messages')

    const conversations = await getMyConversations()
    const unread = conversations.reduce((n, c) => n + c.unreadCount, 0)

    return (
        <div className="mx-auto w-full max-w-2xl pb-24 md:py-8">
            <header className="flex items-baseline justify-between px-4 pb-2 pt-5">
                <h1 className="text-2xl font-bold">Messages</h1>
                {unread > 0 && <span className="text-sm font-medium text-primary">{unread} unread</span>}
            </header>
            <div className="md:rounded-xl md:border md:border-border md:bg-card">
                <ConversationList initial={conversations} currentUserId={user.id} />
            </div>
        </div>
    )
}
