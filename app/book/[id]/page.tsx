import { getServiceDetails } from '@/lib/actions';
import { notFound } from 'next/navigation';
import DesktopBooking from '@/components/desktop/DesktopBooking';
import BookingSplitter from '@/components/BookingSplitter';

export default async function BookingPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const service = await getServiceDetails(id);

    if (!service) {
        notFound();
    }

    return (
        <BookingSplitter 
            service={service}
            desktopBooking={<DesktopBooking service={service} />}
        />
    );
}
