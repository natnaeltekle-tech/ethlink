import { getServiceDetails, getPublicProviderInfo } from '@/lib/actions';
import { notFound } from 'next/navigation';
import DesktopBooking from '@/components/desktop/DesktopBooking';
import BookingSplitter from '@/components/BookingSplitter';
import { Navbar } from '@/components/navbar';
import { OwnListingNotice } from '@/components/service/own-listing-notice';
import { getViewer } from '@/lib/viewer';

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
