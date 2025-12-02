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
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
                    <div className="bg-blue-600 p-6 text-white text-center">
                        <h1 className="text-2xl font-bold">Complete Your Payment</h1>
                        <p className="text-blue-100 mt-2">Secure checkout for your booking</p>
                    </div>

                    <div className="p-8">
                        <div className="flex flex-col md:flex-row gap-8 mb-8">
                            {/* Service Details */}
                            <div className="flex-1">
                                <h2 className="text-lg font-semibold mb-4">Service Details</h2>
                                <div className="flex gap-4 mb-4">
                                    <div className="relative h-24 w-24 rounded-lg overflow-hidden shrink-0">
                                        <Image
                                            src={service.images?.[0] || '/placeholder.jpg'}
                                            alt={service.title}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-gray-900 dark:text-white">{service.title}</h3>
                                        <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                                            <MapPin className="h-3 w-3" />
                                            <span>{service.location}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                                            <Calendar className="h-3 w-3" />
                                            <span>{new Date(booking.date).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Payment Summary */}
                            <div className="flex-1 bg-gray-50 dark:bg-gray-900 p-6 rounded-xl">
                                <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
                                <div className="flex justify-between mb-2">
                                    <span className="text-gray-600 dark:text-gray-400">Service Fee</span>
                                    <span className="font-medium">{service.price} ETB</span>
                                </div>
                                <div className="flex justify-between mb-4">
                                    <span className="text-gray-600 dark:text-gray-400">Processing Fee</span>
                                    <span className="font-medium">0 ETB</span>
                                </div>
                                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 flex justify-between items-center">
                                    <span className="font-bold text-lg">Total</span>
                                    <span className="font-bold text-2xl text-blue-600">{service.price} ETB</span>
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
