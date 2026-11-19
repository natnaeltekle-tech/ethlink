'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { PortfolioUploader } from '@/components/provider/portfolio-uploader'
import { updateMyService, type EditableService } from '@/lib/actions/service-edit'
import { PRICING_UNITS, WEEK_DAYS, amenitiesForCategory } from '@/lib/provider-screening'

const LocationPicker = dynamic(() => import('@/components/map/location-picker'), {
    ssr: false,
    loading: () => <div className="h-[260px] w-full animate-pulse rounded-md bg-secondary/30" />,
})

const selectClass =
    'flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

function Chip({ name, value, label, defaultChecked }: { name: string; value: string; label: string; defaultChecked?: boolean }) {
    return (
        <label className="cursor-pointer select-none">
            <input type="checkbox" name={name} value={value} defaultChecked={defaultChecked} className="peer sr-only" />
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

export function ServiceEditForm({ userId, service }: { userId: string; service: EditableService }) {
    const router = useRouter()
    const [saving, setSaving] = useState(false)
    const [photos, setPhotos] = useState<string[]>(service.gallery)
    const [location, setLocation] = useState(service.location)
    const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
    const [showMap, setShowMap] = useState(false)
    const [active, setActive] = useState(service.isActive)

    // Offer the category's amenities plus anything already saved on the listing.
    const amenityOptions = useMemo(() => {
        const base = amenitiesForCategory(service.category)
        const extra = service.amenities.filter((a) => !base.some((b) => b.label.toLowerCase() === a.toLowerCase())).map((label) => ({ label, icon: '•' }))
        return [...base, ...extra]
    }, [service.category, service.amenities])

    const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (photos.length === 0) return toast.error('Keep at least one photo')
        const fd = new FormData(e.currentTarget)
        if (coords) { fd.set('latitude', String(coords.lat)); fd.set('longitude', String(coords.lng)) }
        if (active) fd.set('is_active', 'on'); else fd.delete('is_active')
        setSaving(true)
        const r = await updateMyService(service.id, fd)
        setSaving(false)
        if (!r.ok) return toast.error(r.error)
        toast.success('Listing updated')
        router.push('/provider/services')
        router.refresh()
    }

    return (
        <div className="mx-auto w-full max-w-2xl px-4 pb-28 pt-4 md:pt-8">
            <Link href="/provider/services" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" /> Back to my services
            </Link>
            <h1 className="mb-1 text-2xl font-bold">Edit listing</h1>
            <p className="mb-5 text-sm text-muted-foreground">Changes go live right away. Bookings already made keep their original price.</p>

            <form onSubmit={onSubmit} className="space-y-5">
                <Section title="Service details">
                    <div className="space-y-1.5">
                        <Label htmlFor="title">Service name</Label>
                        <Input id="title" name="title" required minLength={3} maxLength={200} defaultValue={service.title} className="h-11" />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Category</Label>
                        <p className="flex h-11 items-center rounded-md border border-input bg-secondary/40 px-3 text-sm">{service.category}</p>
                        <p className="text-xs text-muted-foreground">To offer a different kind of service, create a new listing.</p>
                    </div>
                    <div className="grid grid-cols-[1fr_auto] gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="price">Price (ETB)</Label>
                            <Input id="price" name="price" type="number" inputMode="decimal" min="0" step="0.01" required defaultValue={service.price} className="h-11" />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="pricing_unit">Pricing</Label>
                            <select id="pricing_unit" name="pricing_unit" defaultValue={service.pricingUnit} className={selectClass}>
                                {PRICING_UNITS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" name="description" required minLength={10} maxLength={5000} defaultValue={service.description} className="min-h-[120px]" />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="whats_included">What&apos;s included</Label>
                        <Textarea id="whats_included" name="whats_included" maxLength={1000} defaultValue={service.whatsIncluded} className="min-h-[80px]" />
                    </div>
                </Section>

                <Section title="Availability">
                    <div className="space-y-2">
                        <Label>Working days</Label>
                        <div className="flex flex-wrap gap-2">
                            {WEEK_DAYS.map((d) => <Chip key={d.value} name="working_days" value={d.value} label={d.label} defaultChecked={service.workingDays.includes(d.value)} />)}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="opens_at">Opens</Label>
                            <Input id="opens_at" name="opens_at" type="time" required defaultValue={service.opensAt} className="h-11" />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="closes_at">Closes</Label>
                            <Input id="closes_at" name="closes_at" type="time" required defaultValue={service.closesAt} className="h-11" />
                        </div>
                    </div>
                </Section>

                <Section title="Location">
                    <div className="space-y-1.5">
                        <Label htmlFor="location">Area / address</Label>
                        <Input id="location" name="location" required value={location} onChange={(e) => setLocation(e.target.value)} className="h-11" />
                    </div>
                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {coords ? 'New pin set' : service.latitude != null ? 'Map pin saved' : 'No map pin yet'}
                        <button type="button" onClick={() => setShowMap((v) => !v)} className="ml-auto font-medium text-primary">{showMap ? 'Hide map' : 'Move pin'}</button>
                    </p>
                    {showMap && (
                        <LocationPicker onLocationSelect={(lat, lng, address) => {
                            setCoords({ lat, lng })
                            if (address && !location) setLocation(address)
                        }} />
                    )}
                </Section>

                <Section title="Photos" description="The first photo is the cover. Tap the star to change it.">
                    <PortfolioUploader userId={userId} initial={service.gallery} onChange={setPhotos} />
                </Section>

                {amenityOptions.length > 0 && (
                    <Section title="Amenities & extras">
                        <div className="flex flex-wrap gap-2">
                            {amenityOptions.map((a) => <Chip key={a.label} name="amenities" value={a.label} label={`${a.icon} ${a.label}`} defaultChecked={service.amenities.some((x) => x.toLowerCase() === a.label.toLowerCase())} />)}
                        </div>
                    </Section>
                )}

                <Section title="Visibility">
                    <label className="flex items-center justify-between gap-3">
                        <span>
                            <span className="block font-medium">{active ? 'Accepting bookings' : 'Paused'}</span>
                            <span className="text-sm text-muted-foreground">Paused listings are hidden from search. Existing bookings are not affected.</span>
                        </span>
                        <Switch checked={active} onCheckedChange={setActive} aria-label="Listing active" />
                    </label>
                </Section>

                <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 flex gap-3 rounded-2xl border border-border bg-background/95 p-3 backdrop-blur md:bottom-4">
                    <Button type="button" variant="outline" className="h-12 flex-1" onClick={() => router.back()}>Cancel</Button>
                    <Button type="submit" className="h-12 flex-[2] font-semibold" disabled={saving}>
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save changes
                    </Button>
                </div>
            </form>
        </div>
    )
}
