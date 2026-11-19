'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, ArrowRight, Clock, Loader2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { KycUploadField } from '@/components/provider/kyc-upload-field'
import { PortfolioUploader } from '@/components/provider/portfolio-uploader'
import { getMyScreeningState, submitProviderListing } from '@/lib/actions'
import type { ScreeningState } from '@/lib/actions/provider-screening'
import { SERVICE_CATEGORIES } from '@/lib/service-filters'
import {
    ADDIS_ZONES,
    ID_TYPES,
    PRICING_UNITS,
    SERVICE_MODES,
    WEEK_DAYS,
    amenitiesForCategory,
    normalizeCbeAccount,
    normalizeEthiopianPhone,
    type AccountType,
} from '@/lib/provider-screening'
import { cn } from '@/lib/utils'

const LocationPicker = dynamic(() => import('@/components/map/location-picker'), {
    ssr: false,
    loading: () => <div className="h-[260px] w-full animate-pulse rounded-md bg-secondary/30" />,
})

const selectClass =
    'flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

function Chip({ name, value, label, defaultChecked, onChange }: {
    name: string; value: string; label: string; defaultChecked?: boolean; onChange?: (checked: boolean) => void
}) {
    return (
        <label className="cursor-pointer select-none">
            <input type="checkbox" name={name} value={value} defaultChecked={defaultChecked} className="peer sr-only"
                onChange={(e) => onChange?.(e.target.checked)} />
            <span className="inline-flex min-h-[40px] items-center rounded-full border border-input px-3.5 text-sm text-muted-foreground transition-colors peer-checked:border-primary peer-checked:bg-primary/15 peer-checked:font-semibold peer-checked:text-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring">
                {label}
            </span>
        </label>
    )
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
    return (
        <section className="space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-6">
            <div>
                <h2 className="text-lg font-semibold">{title}</h2>
                {description && <p className="text-sm text-muted-foreground">{description}</p>}
            </div>
            {children}
        </section>
    )
}

export default function NewServicePage() {
    const router = useRouter()
    const formRef = useRef<HTMLFormElement>(null)
    const [state, setState] = useState<ScreeningState | null>(null)
    const [loading, setLoading] = useState(true)
    const [step, setStep] = useState(1)
    const [submitting, setSubmitting] = useState(false)

    // Step 1
    const [accountType, setAccountType] = useState<AccountType>('individual')
    const [idType, setIdType] = useState<string>('fayda')
    const [docs, setDocs] = useState<{ id_front?: string | null; id_back?: string | null; selfie?: string | null }>({})
    // Step 3
    const [category, setCategory] = useState('')
    const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null)
    const [locationName, setLocationName] = useState('')
    const [photos, setPhotos] = useState<string[]>([])

    useEffect(() => {
        getMyScreeningState()
            .then((s) => {
                if (!s) {
                    router.replace('/auth/login?next=/services/new')
                    return
                }
                setState(s)
                if (s.profile?.account_type) setAccountType(s.profile.account_type)
                if (s.application?.id_type) setIdType(s.application.id_type)
                if (s.profile?.business_category && (SERVICE_CATEGORIES as readonly string[]).includes(s.profile.business_category)) {
                    setCategory(s.profile.business_category)
                }
            })
            .catch(() => toast.error('Could not load your account. Please refresh.'))
            .finally(() => setLoading(false))
    }, [router])

    const status = state?.profile?.verification_status ?? 'unsubmitted'
    const needsScreening = status === 'unsubmitted' || status === 'rejected'
    const steps = needsScreening ? ['Identity', 'Contact & payout', 'Your service'] : ['Your service']
    const currentStep = needsScreening ? step : 3
    const idNeedsBack = ID_TYPES.find((t) => t.value === idType)?.needsBack ?? true
    const amenities = useMemo(() => amenitiesForCategory(category), [category])

    const [firstName, lastName] = useMemo(() => {
        const parts = (state?.profile?.full_name ?? '').trim().split(/\s+/)
        return [parts[0] ?? '', parts.slice(1).join(' ')]
    }, [state])

    const value = (name: string) => (formRef.current?.elements.namedItem(name) as HTMLInputElement | null)?.value?.trim() ?? ''
    const checkedCount = (name: string) => formRef.current?.querySelectorAll(`input[name="${name}"]:checked`).length ?? 0

    const validateStep = (s: number): string | null => {
        if (s === 1) {
            if (!value('firstName') || !value('lastName')) return 'Enter your first and last name as on your ID'
            if (accountType === 'business' && !value('business_name')) return 'Enter your registered business name'
            if (!docs.id_front) return 'Upload the front of your ID'
            if (idNeedsBack && !docs.id_back) return 'Upload the back of your ID'
            if (!docs.selfie) return 'Upload a selfie holding your ID'
        }
        if (s === 2) {
            if (!normalizeEthiopianPhone(value('phone'))) return 'Enter a valid Ethiopian mobile number (+251…)'
            if (checkedCount('service_modes') === 0) return 'Choose how you deliver your service'
            if (checkedCount('service_zones') === 0) return 'Choose at least one service zone'
            const tb = value('payout_telebirr'), cbe = value('payout_cbe')
            if (!tb && !cbe) return 'Add a Telebirr number or CBE account for payouts'
            if (tb && !normalizeEthiopianPhone(tb)) return 'Telebirr number must be an Ethiopian mobile number'
            if (cbe && !normalizeCbeAccount(cbe)) return 'CBE account number must be 13 digits'
            if (value('payout_account_name').length < 3) return 'Enter the account holder full name'
            if (value('bio').length < 20) return 'Tell customers about your experience (20+ characters)'
        }
        if (s === 3) {
            if (photos.length === 0) return 'Add at least one photo of your work or place'
            if (checkedCount('working_days') === 0) return 'Choose your working days'
        }
        return null
    }

    const goNext = () => {
        const error = validateStep(step)
        if (error) {
            toast.error(error)
            return
        }
        setStep((s) => Math.min(3, s + 1))
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!formRef.current?.reportValidity()) return
        const error = validateStep(3)
        if (error) {
            toast.error(error)
            return
        }
        setSubmitting(true)
        try {
            const result = await submitProviderListing(new FormData(formRef.current))
            if (!result.ok) {
                toast.error(result.error)
                return
            }
            toast.success(
                result.status === 'verified'
                    ? 'Listing published!'
                    : 'Submitted! We will review your application and notify you.'
            )
            router.push(result.status === 'verified' ? `/services/${result.serviceId}` : '/provider/overview?submitted=1')
        } catch {
            toast.error('Could not submit. Check your connection and try again.')
        } finally {
            setSubmitting(false)
        }
    }

    if (loading || !state) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background pb-28 pt-4 md:pt-10">
            <div className="container mx-auto w-full max-w-2xl px-4">
                <div className="mb-5">
                    <Link href="/" className="mb-3 hidden text-sm text-muted-foreground hover:text-foreground md:inline-flex">← Back to Home</Link>
                    <h1 className="text-2xl font-bold sm:text-3xl">{needsScreening ? 'Become a verified provider' : 'List a new service'}</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {needsScreening
                            ? 'We screen every provider so customers can book with confidence. Your documents are private and only seen by the Eth-Links verification team.'
                            : 'Add the details customers need to book you.'}
                    </p>
                </div>

                {status === 'rejected' && (
                    <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm">
                        <p className="font-semibold text-red-500">Your previous application was not approved</p>
                        {state.profile?.rejection_reason && <p className="mt-1 text-foreground/90">Reason: {state.profile.rejection_reason}</p>}
                        <p className="mt-1 text-muted-foreground">Please fix the issue and submit again.</p>
                    </div>
                )}
                {status === 'pending' && (
                    <div className="mb-4 flex gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                        <p>Your application is under review. New listings will go live as soon as you are approved.</p>
                    </div>
                )}

                {/* Progress */}
                {steps.length > 1 && (
                    <ol className="mb-5 grid grid-cols-3 gap-2" aria-label="Progress">
                        {steps.map((label, i) => {
                            const n = i + 1
                            return (
                                <li key={label} aria-current={n === step ? 'step' : undefined}>
                                    <div className={cn('h-1.5 rounded-full', n <= step ? 'bg-primary' : 'bg-muted')} />
                                    <p className={cn('mt-1.5 text-xs', n === step ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                                        {n}. {label}
                                    </p>
                                </li>
                            )
                        })}
                    </ol>
                )}

                <form ref={formRef} onSubmit={handleSubmit} className="space-y-5" noValidate={false}>
                    <input type="hidden" name="latitude" value={coordinates?.lat ?? ''} />
                    <input type="hidden" name="longitude" value={coordinates?.lng ?? ''} />

                    {/* ── Step 1: Identity ─────────────────────────────── */}
                    {needsScreening && (
                        <div className={cn('space-y-5', currentStep !== 1 && 'hidden')}>
                            <Section title="Who are you?" description="Use your name exactly as it appears on your ID.">
                                <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Account type">
                                    {([['individual', 'Individual / Freelancer'], ['business', 'Registered Business']] as const).map(([v, l]) => (
                                        <button key={v} type="button" role="radio" aria-checked={accountType === v} onClick={() => setAccountType(v)}
                                            className={cn('min-h-[44px] rounded-lg border px-3 text-sm font-medium',
                                                accountType === v ? 'border-primary bg-primary/10 text-primary' : 'border-input text-muted-foreground')}>
                                            {l}
                                        </button>
                                    ))}
                                </div>
                                <input type="hidden" name="account_type" value={accountType} />
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="firstName">First name</Label>
                                        <Input id="firstName" name="firstName" autoComplete="given-name" defaultValue={firstName} className="h-11" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="lastName">Last name</Label>
                                        <Input id="lastName" name="lastName" autoComplete="family-name" defaultValue={lastName} className="h-11" />
                                    </div>
                                </div>
                                {accountType === 'business' && (
                                    <div className="space-y-1.5">
                                        <Label htmlFor="business_name">Registered business name</Label>
                                        <Input id="business_name" name="business_name" maxLength={150} defaultValue={state.profile?.business_name ?? ''} className="h-11" />
                                    </div>
                                )}
                                <input type="hidden" name="business_category" value={state.profile?.business_category ?? ''} />
                            </Section>

                            <Section title="Government ID" description="Clear, well-lit photos. All four corners visible, no glare.">
                                <div className="space-y-1.5">
                                    <Label htmlFor="id_type">ID type</Label>
                                    <select id="id_type" name="id_type" value={idType} onChange={(e) => setIdType(e.target.value)} className={selectClass}>
                                        {ID_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                                    </select>
                                </div>
                                <KycUploadField userId={state.userId} kind="id_front" name="id_front_path" label="ID — front" required
                                    onUploaded={(p) => setDocs((d) => ({ ...d, id_front: p }))} />
                                {idNeedsBack && (
                                    <KycUploadField userId={state.userId} kind="id_back" name="id_back_path" label="ID — back" required
                                        onUploaded={(p) => setDocs((d) => ({ ...d, id_back: p }))} />
                                )}
                                <KycUploadField userId={state.userId} kind="selfie" name="selfie_path" capture="user" required
                                    label="Selfie holding your ID" hint="Hold the ID next to your face. Your face and the ID photo must be clearly visible."
                                    onUploaded={(p) => setDocs((d) => ({ ...d, selfie: p }))} />
                            </Section>

                            <Section title="Trade License / Certificate" description="Optional — earns a ✔ Licensed Business badge after review.">
                                <KycUploadField userId={state.userId} kind="license" name="license_path"
                                    label="Trade License, TIN certificate or professional certificate" hint="Photo or PDF." />
                            </Section>
                        </div>
                    )}

                    {/* ── Step 2: Contact, area & payout ───────────────── */}
                    {needsScreening && (
                        <div className={cn('space-y-5', currentStep !== 2 && 'hidden')}>
                            <Section title="Contact" description="Our team may call or message you to confirm your details.">
                                <div className="space-y-1.5">
                                    <Label htmlFor="phone">Mobile number</Label>
                                    <Input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+251 911 234 567"
                                        defaultValue={state.profile?.phone_number ?? ''} className="h-11" />
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Chip name="phone_whatsapp" value="on" label="WhatsApp on this number" defaultChecked={state.application?.phone_whatsapp} />
                                    <Chip name="phone_telegram" value="on" label="Telegram on this number" defaultChecked={state.application?.phone_telegram} />
                                </div>
                            </Section>

                            <Section title="Where you work">
                                <div className="space-y-2">
                                    <Label>Service mode</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {SERVICE_MODES.map((m) => (
                                            <Chip key={m.value} name="service_modes" value={m.value} label={m.label}
                                                defaultChecked={state.application?.service_modes?.includes(m.value)} />
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Addis Ababa service zones</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {ADDIS_ZONES.map((z) => (
                                            <Chip key={z} name="service_zones" value={z} label={z} defaultChecked={state.application?.service_zones?.includes(z)} />
                                        ))}
                                    </div>
                                </div>
                            </Section>

                            <Section title="Escrow payouts" description="Where we send your earnings. The account holder name must match your ID.">
                                <div className="space-y-1.5">
                                    <Label htmlFor="payout_telebirr">Telebirr number</Label>
                                    <Input id="payout_telebirr" name="payout_telebirr" type="tel" inputMode="tel" placeholder="+251 9…"
                                        defaultValue={state.application?.payout_telebirr_phone ?? ''} className="h-11" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="payout_cbe">CBE account number <span className="text-xs text-muted-foreground">(13 digits, optional if Telebirr given)</span></Label>
                                    <Input id="payout_cbe" name="payout_cbe" inputMode="numeric" placeholder="1000…"
                                        defaultValue={state.application?.payout_cbe_account ?? ''} className="h-11" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="payout_account_name">Account holder full name</Label>
                                    <Input id="payout_account_name" name="payout_account_name" autoComplete="name"
                                        defaultValue={state.application?.payout_account_name ?? ''} className="h-11" />
                                </div>
                            </Section>

                            <Section title="Experience">
                                <div className="space-y-1.5">
                                    <Label htmlFor="years_experience">Years of experience</Label>
                                    <Input id="years_experience" name="years_experience" type="number" inputMode="numeric" min={0} max={60}
                                        defaultValue={state.application?.years_experience ?? ''} className="h-11 w-32" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="bio">Qualifications & experience</Label>
                                    <Textarea id="bio" name="bio" maxLength={1000} className="min-h-[110px]"
                                        placeholder="e.g. Licensed electrician, 8 years with residential wiring in Bole and CMC…"
                                        defaultValue={state.application?.bio ?? ''} />
                                </div>
                            </Section>
                        </div>
                    )}

                    {/* ── Step 3: Service ──────────────────────────────── */}
                    <div className={cn('space-y-5', currentStep !== 3 && 'hidden')}>
                        <Section title="Service details">
                            <div className="space-y-1.5">
                                <Label htmlFor="title">Service name</Label>
                                <Input id="title" name="title" required minLength={3} maxLength={200} placeholder="e.g. Home plumbing repairs in Bole" className="h-11" />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="category">Category</Label>
                                <select id="category" name="category" required value={category} onChange={(e) => setCategory(e.target.value)} className={selectClass}>
                                    <option value="" disabled>Select a category</option>
                                    {SERVICE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                                    <option value="Other">Other</option>
                                </select>
                                {category === 'Other' && (
                                    <Input name="custom_category" required className="mt-2 h-11" placeholder="Please specify your category…" />
                                )}
                            </div>
                            <div className="grid grid-cols-[1fr_auto] gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="price">Price (ETB)</Label>
                                    <Input id="price" name="price" type="number" inputMode="decimal" min="0" step="0.01" required placeholder="0" className="h-11" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="pricing_unit">Pricing</Label>
                                    <select id="pricing_unit" name="pricing_unit" defaultValue="fixed" className={selectClass}>
                                        {PRICING_UNITS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="description">Description</Label>
                                <Textarea id="description" name="description" required minLength={10} maxLength={5000} className="min-h-[120px]"
                                    placeholder="Describe your service, what customers can expect, and anything they should prepare." />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="whats_included">What&apos;s included</Label>
                                <Textarea id="whats_included" name="whats_included" maxLength={1000} className="min-h-[80px]"
                                    placeholder="e.g. Labour, basic fittings, 30-day warranty. Materials charged separately." />
                            </div>
                        </Section>

                        <Section title="Availability">
                            <div className="space-y-2">
                                <Label>Working days</Label>
                                <div className="flex flex-wrap gap-2">
                                    {WEEK_DAYS.map((d) => (
                                        <Chip key={d.value} name="working_days" value={d.value} label={d.label}
                                            defaultChecked={!['sun'].includes(d.value)} />
                                    ))}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="opens_at">Opens</Label>
                                    <Input id="opens_at" name="opens_at" type="time" required defaultValue="08:00" className="h-11" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="closes_at">Closes</Label>
                                    <Input id="closes_at" name="closes_at" type="time" required defaultValue="18:00" className="h-11" />
                                </div>
                            </div>
                        </Section>

                        <Section title="Location">
                            <div className="space-y-1.5">
                                <Label htmlFor="location">Area / address</Label>
                                <Input id="location" name="location" required value={locationName} onChange={(e) => setLocationName(e.target.value)}
                                    placeholder="e.g. Bole, near Edna Mall" className="h-11" />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Pin on map <span className="text-xs text-muted-foreground">(optional, helps customers find you)</span></Label>
                                {currentStep === 3 && (
                                    <LocationPicker onLocationSelect={(lat, lng, address) => {
                                        setCoordinates({ lat, lng })
                                        if (address && !locationName) setLocationName(address)
                                    }} />
                                )}
                            </div>
                        </Section>

                        <Section title="Photos" description="Show your work, vehicle, venue or team. Real photos get more bookings.">
                            <PortfolioUploader userId={state.userId} onChange={setPhotos} />
                        </Section>

                        <Section title="Amenities & extras" description={category ? undefined : 'Pick a category to see relevant options.'}>
                            <div className="flex flex-wrap gap-2">
                                {amenities.map((a) => <Chip key={`${category}-${a.label}`} name="amenities" value={a.label} label={`${a.icon} ${a.label}`} />)}
                            </div>
                        </Section>

                        {needsScreening && (
                            <p className="flex gap-2 rounded-xl bg-secondary/40 p-3 text-xs text-muted-foreground">
                                <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
                                By submitting you confirm the documents are yours and genuine. Your listing goes live after our team approves your application (usually within 1 business day).
                            </p>
                        )}
                    </div>

                    {/* ── Navigation ───────────────────────────────────── */}
                    <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 flex gap-3 rounded-2xl border border-border bg-background/95 p-3 backdrop-blur md:bottom-4">
                        {needsScreening && step > 1 && (
                            <Button type="button" variant="outline" className="h-12 flex-1" onClick={() => { setStep((s) => s - 1); window.scrollTo({ top: 0 }) }}>
                                <ArrowLeft className="mr-1 h-4 w-4" /> Back
                            </Button>
                        )}
                        {currentStep < 3 ? (
                            <Button type="button" className="h-12 flex-[2]" onClick={goNext}>
                                Continue <ArrowRight className="ml-1 h-4 w-4" />
                            </Button>
                        ) : (
                            <Button type="submit" className="h-12 flex-[2] font-semibold" disabled={submitting}>
                                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {needsScreening ? 'Submit for review' : 'Publish listing'}
                            </Button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    )
}
