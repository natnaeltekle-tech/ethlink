'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Camera, ChevronRight, CreditCard, HelpCircle, Loader2, LogOut, ShieldCheck, Store, UserRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { updateAccount } from '@/lib/actions/dashboard'
import { updateAvatarUrl } from '@/lib/actions/avatar'
import { safeSignOut } from '@/lib/actions'
import { compressImage, fileExtension } from '@/lib/client-image'
import { normalizeEthiopianPhone } from '@/lib/provider-screening'
import { Avatar, Section } from './common'

const MobilePaymentMethods = dynamic(() => import('@/components/mobile/MobilePaymentMethods'))
const MobileHelpSupport = dynamic(() => import('@/components/mobile/MobileHelpSupport'))

export type AccountProfile = {
    id: string
    email: string | null
    firstName: string
    lastName: string
    phone: string
    bio: string
    avatarUrl: string | null
    role: string
    verificationStatus: string
}

export function AccountSection({ profile, isProvider }: { profile: AccountProfile; isProvider: boolean }) {
    const router = useRouter()
    const [form, setForm] = useState({ firstName: profile.firstName, lastName: profile.lastName, phone: profile.phone, bio: profile.bio })
    const [avatar, setAvatar] = useState(profile.avatarUrl)
    const [saving, setSaving] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [overlay, setOverlay] = useState<'payment' | 'help' | null>(null)
    const [loggingOut, setLoggingOut] = useState(false)
    const fileRef = useRef<HTMLInputElement>(null)

    const phoneInvalid = form.phone.trim().length > 6 && !normalizeEthiopianPhone(form.phone)

    const save = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        const r = await updateAccount(form)
        setSaving(false)
        if (r.ok) { toast.success('Profile saved'); router.refresh() } else toast.error(r.error)
    }

    const uploadAvatar = async (picked?: File) => {
        if (!picked) return
        if (!picked.type.startsWith('image/')) return toast.error('Choose an image')
        setUploading(true)
        try {
            const file = await compressImage(picked, 512, 0.85)
            const supabase = createClient()
            const key = `${profile.id}/avatar_${Date.now()}.${fileExtension(file)}`
            const { error } = await supabase.storage.from('service-images').upload(key, file, { contentType: file.type, upsert: true })
            if (error) throw error
            const url = supabase.storage.from('service-images').getPublicUrl(key).data.publicUrl
            await updateAvatarUrl(url)
            setAvatar(url)
            toast.success('Photo updated')
            router.refresh()
        } catch {
            toast.error('Could not upload the photo')
        } finally {
            setUploading(false)
        }
    }

    const logout = async () => {
        if (loggingOut) return
        setLoggingOut(true)
        try {
            await createClient().auth.signOut()
            await safeSignOut()
        } catch { /* always redirect */ }
        window.location.href = '/auth/login'
    }

    const row = 'flex min-h-[52px] w-full items-center gap-3 px-4 text-left text-sm font-medium hover:bg-secondary/60'

    if (overlay) {
        const Comp = overlay === 'payment' ? MobilePaymentMethods : MobileHelpSupport
        return <div className="fixed inset-0 z-[100] overflow-y-auto bg-[#0B0C15]"><Comp onClose={() => setOverlay(null)} /></div>
    }

    return (
        <div className="space-y-4">
            {!isProvider && profile.role === 'user' && (
                <section className="flex items-center gap-3 rounded-2xl border border-primary/40 bg-primary/10 p-4">
                    <Store className="h-6 w-6 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                        <p className="font-semibold">Offer your services on Eth-Links</p>
                        <p className="text-sm text-muted-foreground">Get verified, list your service and receive bookings with escrow-protected payments.</p>
                    </div>
                    <Link href="/services/new" className="shrink-0 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">Become a provider</Link>
                </section>
            )}

            <Section title="Account details" icon={UserRound}>
                <form onSubmit={save} className="space-y-4">
                    <div className="flex items-center gap-4">
                        <button type="button" onClick={() => fileRef.current?.click()} className="relative" aria-label="Change profile photo">
                            <Avatar name={form.firstName || profile.email || '?'} url={avatar} size={72} />
                            <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-card">
                                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                            </span>
                        </button>
                        <div className="min-w-0 text-sm">
                            <p className="font-semibold">{[form.firstName, form.lastName].filter(Boolean).join(' ') || 'Your name'}</p>
                            <p className="truncate text-muted-foreground">{profile.email}</p>
                        </div>
                        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { void uploadAvatar(e.target.files?.[0]); e.target.value = '' }} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <label className="space-y-1 text-sm"><span className="font-medium">First name</span>
                            <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required maxLength={100} autoComplete="given-name" className="h-11 w-full rounded-md border border-input bg-background px-3" />
                        </label>
                        <label className="space-y-1 text-sm"><span className="font-medium">Last name</span>
                            <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} maxLength={100} autoComplete="family-name" className="h-11 w-full rounded-md border border-input bg-background px-3" />
                        </label>
                    </div>
                    <label className="block space-y-1 text-sm"><span className="font-medium">Mobile number</span>
                        <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} type="tel" inputMode="tel" autoComplete="tel" placeholder="+251 911 234 567"
                            aria-invalid={phoneInvalid} className="h-11 w-full rounded-md border border-input bg-background px-3 aria-[invalid=true]:border-red-500" />
                        {phoneInvalid && <span className="text-xs text-red-500">Use an Ethiopian mobile number, e.g. +251 911 234 567</span>}
                    </label>
                    <label className="block space-y-1 text-sm"><span className="font-medium">About you <span className="font-normal text-muted-foreground">(shown on your public profile)</span></span>
                        <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} maxLength={500} rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2" />
                        <span className="block text-right text-xs text-muted-foreground">{form.bio.length}/500</span>
                    </label>
                    <button type="submit" disabled={saving || phoneInvalid} className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
                        {saving && <Loader2 className="h-4 w-4 animate-spin" />}Save changes
                    </button>
                </form>
            </Section>

            <section className="overflow-hidden rounded-2xl border border-border bg-card">
                {isProvider && (
                    <Link href="/services/new" className={row}><ShieldCheck className="h-5 w-5 text-primary" />Identity verification<ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" /></Link>
                )}
                <button type="button" onClick={() => setOverlay('payment')} className={`${row} border-t border-border`}><CreditCard className="h-5 w-5 text-primary" />Payment methods<ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" /></button>
                <button type="button" onClick={() => setOverlay('help')} className={`${row} border-t border-border`}><HelpCircle className="h-5 w-5 text-primary" />Help &amp; support<ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" /></button>
                <button type="button" onClick={logout} disabled={loggingOut} className={`${row} border-t border-border text-red-600`}>
                    {loggingOut ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogOut className="h-5 w-5" />}Log out
                </button>
            </section>
        </div>
    )
}
