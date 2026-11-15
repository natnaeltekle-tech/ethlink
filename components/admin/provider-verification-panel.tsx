'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { AlertTriangle, CheckCircle2, ExternalLink, FileText, MessageCircle, Phone, Send, ShieldCheck, XCircle } from 'lucide-react'
import { approveProvider, rejectProvider, type ProviderApplication } from '@/lib/actions/provider-review'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

/** Loose name comparison: same words regardless of order/case/punctuation. */
function namesMatch(a: string | null, b: string | null): boolean {
    const norm = (s: string | null) => (s ?? '').toLowerCase().replace(/[^\p{L}\s]/gu, ' ').split(/\s+/).filter(Boolean).sort().join(' ')
    return Boolean(a && b) && norm(a) === norm(b)
}

function ApplicationCard({ app }: { app: ProviderApplication }) {
    const router = useRouter()
    const [pending, startTransition] = useTransition()
    const [rejecting, setRejecting] = useState(false)
    const [reason, setReason] = useState('')
    const [licenseApproved, setLicenseApproved] = useState(app.hasLicense)
    const payoutMatches = namesMatch(app.fullName, app.payoutAccountName)

    const run = (fn: () => Promise<unknown>, ok: string) =>
        startTransition(async () => {
            try {
                await fn()
                toast.success(ok)
                router.refresh()
            } catch (e) {
                toast.error(e instanceof Error ? e.message : 'Action failed')
            }
        })

    return (
        <article className="space-y-4 rounded-xl border border-border bg-card p-4">
            <header className="flex flex-wrap items-start justify-between gap-2">
                <div>
                    <h3 className="text-lg font-semibold">{app.fullName ?? 'Unnamed applicant'}</h3>
                    <p className="text-sm text-muted-foreground">
                        {app.accountType === 'business' ? `Registered business · ${app.businessName ?? '—'}` : 'Individual / Freelancer'}
                        {app.businessCategory ? ` · ${app.businessCategory}` : ''}
                    </p>
                </div>
                {app.submittedAt && (
                    <span className="text-xs text-muted-foreground">Submitted {new Date(app.submittedAt).toLocaleString()}</span>
                )}
            </header>

            {/* Documents */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {app.docs.map((d) => (
                    <a key={d.label} href={d.url ?? undefined} target="_blank" rel="noopener noreferrer"
                        className="group overflow-hidden rounded-lg border border-border bg-muted/40">
                        <div className="flex aspect-[4/3] items-center justify-center bg-muted">
                            {!d.url ? (
                                <span className="px-2 text-center text-xs text-red-500">Missing file</span>
                            ) : d.isPdf ? (
                                <FileText className="h-8 w-8 text-muted-foreground" />
                            ) : (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={d.url} alt={d.label} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                            )}
                        </div>
                        <p className="flex items-center justify-between gap-1 px-2 py-1.5 text-xs font-medium">
                            {d.label} <ExternalLink className="h-3 w-3 opacity-60 group-hover:opacity-100" />
                        </p>
                    </a>
                ))}
            </div>
            <p className="text-xs text-muted-foreground">ID type: {app.idTypeLabel}. Links expire after 5 minutes — refresh the page to view again.</p>

            {/* Checks */}
            <dl className="grid gap-3 text-sm md:grid-cols-2">
                <div className="rounded-lg bg-secondary/40 p-3">
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">Phone</dt>
                    <dd className="mt-1 flex flex-wrap items-center gap-2 font-medium">
                        {app.phone ?? '—'}
                        {app.phone && (
                            <>
                                <a href={`tel:${app.phone}`} className="inline-flex items-center gap-1 rounded bg-primary/15 px-2 py-0.5 text-xs text-primary"><Phone className="h-3 w-3" />Call</a>
                                {app.phoneWhatsapp && <a href={`https://wa.me/${app.phone.replace('+', '')}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded bg-green-500/15 px-2 py-0.5 text-xs text-green-600"><MessageCircle className="h-3 w-3" />WhatsApp</a>}
                                {app.phoneTelegram && <span className="inline-flex items-center gap-1 rounded bg-sky-500/15 px-2 py-0.5 text-xs text-sky-600"><Send className="h-3 w-3" />Telegram</span>}
                            </>
                        )}
                    </dd>
                </div>
                <div className={`rounded-lg p-3 ${payoutMatches ? 'bg-green-500/10' : 'bg-amber-500/10'}`}>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">Payout name vs profile name</dt>
                    <dd className="mt-1 font-medium">
                        <span className="flex items-center gap-1">
                            {payoutMatches ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <AlertTriangle className="h-4 w-4 text-amber-500" />}
                            {app.payoutAccountName}
                        </span>
                        <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                            {payoutMatches ? 'Matches profile name — still compare with the ID photo.' : `Profile: ${app.fullName ?? '—'} — check against the ID before approving.`}
                        </span>
                        <span className="mt-1 block text-xs font-normal">
                            {app.payoutTelebirr && <>Telebirr {app.payoutTelebirr}</>}
                            {app.payoutTelebirr && app.payoutCbe && ' · '}
                            {app.payoutCbe && <>CBE {app.payoutCbe}</>}
                        </span>
                    </dd>
                </div>
                <div className="rounded-lg bg-secondary/40 p-3">
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">Service area</dt>
                    <dd className="mt-1">{app.serviceModes.join(', ')}<br /><span className="text-muted-foreground">{app.serviceZones.join(', ')}</span></dd>
                </div>
                <div className="rounded-lg bg-secondary/40 p-3">
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">Experience</dt>
                    <dd className="mt-1">{app.yearsExperience ?? 0} years<p className="mt-1 whitespace-pre-line text-muted-foreground">{app.bio}</p></dd>
                </div>
            </dl>

            {app.services.length > 0 && (
                <p className="text-sm"><span className="text-muted-foreground">Listings waiting to go live:</span>{' '}
                    {app.services.map((s) => `${s.title} (${s.category}, ${s.price} ETB)`).join(' · ')}
                </p>
            )}

            {/* Decision */}
            {!rejecting ? (
                <div className="flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
                    {app.hasLicense ? (
                        <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={licenseApproved} onChange={(e) => setLicenseApproved(e.target.checked)} className="h-4 w-4" />
                            License is valid — award ✔ Licensed Business badge
                        </label>
                    ) : <span className="text-xs text-muted-foreground">No license uploaded</span>}
                    <div className="flex gap-2">
                        <Button variant="outline" disabled={pending} onClick={() => setRejecting(true)} className="border-red-500/40 text-red-600">
                            <XCircle className="mr-1 h-4 w-4" /> Reject
                        </Button>
                        <Button disabled={pending} className="bg-green-600 text-white hover:bg-green-700"
                            onClick={() => run(() => approveProvider(app.userId, { licenseApproved }), `${app.fullName ?? 'Provider'} approved`)}>
                            <ShieldCheck className="mr-1 h-4 w-4" /> Approve
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="space-y-2 border-t border-border pt-3">
                    <Textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} autoFocus
                        placeholder="Reason the provider will see, e.g. 'ID photo is blurry — retake in good light.'" />
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" disabled={pending} onClick={() => setRejecting(false)}>Cancel</Button>
                        <Button disabled={pending || reason.trim().length < 5} className="bg-red-600 text-white hover:bg-red-700"
                            onClick={() => run(() => rejectProvider(app.userId, reason), 'Provider notified of rejection')}>
                            Send rejection
                        </Button>
                    </div>
                </div>
            )}
        </article>
    )
}

export function ProviderVerificationPanel({ applications }: { applications: ProviderApplication[] }) {
    return (
        <section id="provider-verification" className="space-y-4 rounded-xl border border-border bg-background p-4 md:p-6">
            <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-xl font-bold"><ShieldCheck className="h-5 w-5 text-primary" /> Provider Verification</h2>
                <span className="rounded-full bg-primary/15 px-3 py-1 text-sm font-semibold text-primary">{applications.length} pending</span>
            </div>
            {applications.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No applications waiting for review.</p>
            ) : (
                applications.map((app) => <ApplicationCard key={app.userId} app={app} />)
            )}
        </section>
    )
}
