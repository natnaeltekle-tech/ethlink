import { getServiceDetails, getPublicProviderInfo } from '@/lib/actions';
import { notFound } from 'next/navigation';
import DesktopBooking from '@/components/desktop/DesktopBooking';
import BookingSplitter from '@/components/BookingSplitter';
import { Navbar } from '@/components/navbar';
import { OwnListingNotice } from '@/components/service/own-listing-notice';
import { getViewer } from '@/lib/viewer';
import { createAdminClient } from '@/lib/supabase/admin';
import Link from 'next/link';
import { MessageCircle, ShieldAlert } from 'lucide-react';

export default async function BookingPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const service = await getServiceDetails(id);

    if (!service) {
        notFound();
    }

    // You can't book your own service.
    const viewer = await getViewer();
    if (viewer && service.user_id === viewer.id) {
        return (
            <div className="min-h-screen bg-background text-foreground">
                <Navbar hideSearch />
                <main className="mx-auto max-w-lg space-y-4 px-4 pb-28 pt-6">
                    <h1 className="text-xl font-bold">{service.title}</h1>
                    <OwnListingNotice />
                </main>
            </div>
        );
    }

    // New bookings are only accepted for active listings of verified providers
    // (enforced by the database). Explain it here instead of a form that would fail.
    const { data: owner } = service.user_id
        ? await createAdminClient().from('profiles').select('verification_status').eq('id', service.user_id).maybeSingle()
        : { data: null };
    if (!service.is_active || owner?.verification_status !== 'verified') {
        return (
            <div className="min-h-screen bg-background text-foreground">
                <Navbar hideSearch />
                <main className="mx-auto max-w-lg space-y-4 px-4 pb-28 pt-6">
                    <h1 className="text-xl font-bold">{service.title}</h1>
                    <div className="flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
                        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                        <div className="min-w-0 flex-1 space-y-2">
                            <p><b>Bookings are paused for this listing.</b> {service.is_active ? 'The provider hasn’t completed Eth-Links verification yet, so new bookings can’t be paid into escrow.' : 'The provider has paused this listing.'}</p>
                            <div className="flex flex-wrap gap-2">
                                {viewer && service.user_id && (
                                    <Link href={`/messages/${service.id}/${service.user_id}`} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-[#FACC15] px-4 text-xs font-bold text-black">
                                        <MessageCircle className="h-4 w-4" />Message provider
                                    </Link>
                                )}
                                <Link href="/services" className="inline-flex min-h-[40px] items-center rounded-full border border-border px-4 text-xs font-semibold">Find similar services</Link>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    // Trust badges on the booking screen (public, whitelisted fields only)
    const provider = service.user_id ? await getPublicProviderInfo(service.user_id) : null;
    const serviceWithProvider = { ...service, provider };

    return (
        <BookingSplitter 
            service={serviceWithProvider}
            desktopBooking={<DesktopBooking service={serviceWithProvider} />}
        />
    );
}
