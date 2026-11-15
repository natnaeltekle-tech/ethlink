import { getServiceDetails, getPublicProviderInfo } from '@/lib/actions';
import { notFound } from 'next/navigation';
import DesktopBooking from '@/components/desktop/DesktopBooking';
import BookingSplitter from '@/components/BookingSplitter';

export default async function BookingPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const service = await getServiceDetails(id);

    if (!service) {
        notFound();
    }

    // Trust badges on the booking screen (public, whitelisted fields only)
    const provider = await getPublicProviderInfo(service.user_id);
    const serviceWithProvider = { ...service, provider };

    return (
        <BookingSplitter 
            service={serviceWithProvider}
            desktopBooking={<DesktopBooking service={serviceWithProvider} />}
        />
    );
}
