'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { sanitizeMessage } from '@/lib/sanitize'
import type { Message } from '@/lib/types/database'

export type ChatMessage = Pick<Message, 'id' | 'service_id' | 'sender_id' | 'receiver_id' | 'content' | 'created_at' | 'is_read' | 'read_at'>

export type Conversation = {
    serviceId: string
    serviceTitle: string
    serviceOwnerId: string
    otherUserId: string
    otherName: string
    otherAvatar: string | null
    otherIsVerified: boolean
    otherHasLicense: boolean
    lastMessage: string
    lastSenderId: string
    lastAt: string
    unreadCount: number
}

const MESSAGE_COLUMNS = 'id, service_id, sender_id, receiver_id, content, created_at, is_read, read_at'
const uuid = z.string().uuid()
const contentSchema = z.string().trim().min(1, 'Message cannot be empty').max(2000, 'Message is too long (2000 characters max)')

async function currentUser() {
    const supabase = await createClient()
    try {
        const { data } = await supabase.auth.getUser()
        return { supabase, user: data.user }
    } catch {
        return { supabase, user: null }
    }
}

/** One conversation: this service, me ↔ the other person, oldest first (latest 200). */
export async function getThread(serviceId: string, otherUserId: string): Promise<ChatMessage[]> {
    if (!uuid.safeParse(serviceId).success || !uuid.safeParse(otherUserId).success) return []
    const { supabase, user } = await currentUser()
    if (!user || user.id === otherUserId) return []

    const { data, error } = await supabase
        .from('messages')
        .select(MESSAGE_COLUMNS)
        .eq('service_id', serviceId)
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: false })
        .limit(200)
    if (error) {
        console.error('[chat] getThread failed:', error)
        return []
    }
    return (data ?? []).reverse()
}

export type SendResult = { ok: true; message: ChatMessage } | { ok: false; error: string }

/** Send as the signed-in user. The database decides who may message whom. */
export async function sendChatMessage(serviceId: string, receiverId: string, content: string): Promise<SendResult> {
    if (!uuid.safeParse(serviceId).success || !uuid.safeParse(receiverId).success) {
        return { ok: false, error: 'Invalid conversation' }
    }
    const parsed = contentSchema.safeParse(sanitizeMessage(content ?? ''))
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid message' }

    const { supabase, user } = await currentUser()
    if (!user) return { ok: false, error: 'Please log in again to send messages' }
    if (user.id === receiverId) return { ok: false, error: "You can't message yourself" }

    const { data, error } = await supabase
        .from('messages')
        .insert({ service_id: serviceId, sender_id: user.id, receiver_id: receiverId, content: parsed.data })
        .select(MESSAGE_COLUMNS)
        .single()

    if (error || !data) {
        console.error('[chat] send failed:', error)
        if (error?.code === '42501') {
            return { ok: false, error: 'You can only reply to customers who contacted you or booked this service' }
        }
        return { ok: false, error: 'Message not sent. Check your connection and try again.' }
    }
    // The database trigger creates the (grouped) notification for the receiver.
    return { ok: true, message: data }
}

/** Mark everything the other person sent me in this conversation as read. */
export async function markThreadRead(serviceId: string, otherUserId: string): Promise<number> {
    if (!uuid.safeParse(serviceId).success || !uuid.safeParse(otherUserId).success) return 0
    const { supabase, user } = await currentUser()
    if (!user) return 0

    const { data, error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('service_id', serviceId)
        .eq('sender_id', otherUserId)
        .eq('receiver_id', user.id)
        .eq('is_read', false)
        .select('id')
    if (error) {
        console.error('[chat] markThreadRead failed:', error)
        return 0
    }

    // Clear the matching message notification(s) too
    if (data?.length) {
        await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', user.id)
            .eq('type', 'message')
            .eq('link', `/messages/${serviceId}/${otherUserId}`)
    }
    return data?.length ?? 0
}

/** Inbox: one row per (service, other person), newest first. */
export async function getMyConversations(): Promise<Conversation[]> {
    const { supabase, user } = await currentUser()
    if (!user) return []
    const { data, error } = await supabase.rpc('get_my_conversations')
    if (error) {
        console.error('[chat] get_my_conversations failed:', error)
        return []
    }
    return (data ?? []).map((c) => ({
        serviceId: c.service_id,
        serviceTitle: c.service_title,
        serviceOwnerId: c.service_owner_id,
        otherUserId: c.other_user_id,
        otherName: c.other_name?.trim() || 'Eth-Links user',
        otherAvatar: c.other_avatar,
        otherIsVerified: c.other_is_verified,
        otherHasLicense: c.other_has_license,
        lastMessage: c.last_message,
        lastSenderId: c.last_sender_id,
        lastAt: c.last_at,
        unreadCount: Number(c.unread_count) || 0,
    }))
}

/** Total unread incoming messages (nav badge). */
export async function getUnreadMessageCount(): Promise<number> {
    const { supabase, user } = await currentUser()
    if (!user) return 0
    const { count, error } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('is_read', false)
    if (error) return 0
    return count ?? 0
}
