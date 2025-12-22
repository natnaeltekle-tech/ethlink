import { getBookingDetails } from '@/lib/actions';
import { notFound } from 'next/navigation';
import { ShieldCheck, Calendar, MapPin } from 'lucide-react';
import Image from 'next/image';
import { PaymentMethods } from '@/components/payment/payment-methods';

export default async function PaymentPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const booking = await getBookingDetails(id);

    if (!booking) {
        notFound();
    }

    const service = booking.services;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:p-6 lg:p-8 flex items-center justify-center">
            <div className="w-full max-w-md mx-auto">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
                    <div className="bg-blue-600 p-6 text-white text-center">
                        <h1 className="text-2xl font-bold">Complete Your Payment</h1>
                        <p className="text-blue-100 mt-2">Secure checkout for your booking</p>
                    </div>

                    <div className="p-6 sm:p-8">
                        <div className="mb-8">
                            {/* Service Details */}
                            <div className="flex gap-4 mb-4 items-center justify-center">
                                <div className="relative h-20 w-20 rounded-lg overflow-hidden shrink-0 shadow-sm">
                                    <Image
                                        src={service.images?.[0] || '/placeholder.jpg'}
                                        alt={service.title}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                                <div>
                                    <h3 className="font-medium text-gray-900 dark:text-white text-lg">{service.title}</h3>
                                    <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                                        <Calendar className="h-3 w-3" />
                                        <span>{new Date(booking.date).toLocaleString('en-US', { timeZone: 'UTC' })}</span>
                                    </div>
                                    <div className="mt-2 text-2xl font-bold text-blue-600">
                                        {service.price} ETB
                                    </div>
                                </div>
                            </div>
                        </div>

                        <PaymentMethods bookingId={booking.id} amount={service.price} />

                        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                            <ShieldCheck className="h-4 w-4 text-green-600" />
                            <span>Secure SSL Encrypted Transaction</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
