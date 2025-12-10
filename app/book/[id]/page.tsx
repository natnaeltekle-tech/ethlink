import { getServiceDetails } from '@/lib/actions';
import { MapPin } from 'lucide-react';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { BookingForm } from '@/components/booking-form';

export default async function BookingPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const service = await getServiceDetails(id);

    if (!service) {
        notFound();
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
                    {/* Header Image */}
                    <div className="relative h-48 sm:h-64 w-full">
                        <Image
                            src={service.images?.[0] || '/placeholder.jpg'}
                            alt={service.title}
                            fill
                            className="object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-end">
                            <div className="p-6 text-white">
                                <h1 className="text-3xl font-bold">{service.title}</h1>
                                <div className="flex items-center gap-2 mt-2 text-gray-200">
                                    <MapPin className="h-4 w-4" />
                                    <span>{service.location}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-8">
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Confirm Your Booking</h2>
                                <p className="text-gray-500 dark:text-gray-400">
                                    Please select a date and time for your service.
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-gray-500 dark:text-gray-400">Price</p>
                                <p className="text-2xl font-bold text-blue-600">{service.price} ETB</p>
                            </div>
                        </div>

                        <BookingForm serviceId={service.id} price={service.price} category={service.category} />
                    </div>
                </div>
            </div>
        </div>
    );
}
