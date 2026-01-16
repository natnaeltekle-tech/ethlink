import { getBookingDetails } from '@/lib/actions';
import { notFound } from 'next/navigation';
import { ShieldCheck, Calendar, MapPin } from 'lucide-react';
import Image from 'next/image';
import { PaymentMethods } from '@/components/payment/payment-methods';
import { DEFAULT_SERVICE_IMAGE } from '@/lib/constants';

export default async function PaymentPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const booking = await getBookingDetails(id);

    if (!booking) {
        notFound();
    }

    const service = booking.services;

    return (
        <div className="min-h-screen bg-background py-8 px-4 sm:p-6 lg:p-8 flex items-center justify-center">
            <div className="w-full max-w-md mx-auto">
                <div className="bg-card rounded-2xl shadow-xl overflow-hidden border border-border">
                    <div className="bg-card p-6 text-center border-b border-border">
                        <h1 className="text-2xl font-bold text-primary">Complete Your Payment</h1>
                        <p className="text-muted-foreground mt-2">Secure checkout for your booking</p>
                    </div>

                    <div className="p-6 sm:p-8">
                        <div className="mb-8">
                            {/* Service Details */}
                            <div className="flex gap-4 mb-4 items-center justify-center">
                                <div className="relative h-24 w-24 rounded-xl overflow-hidden shrink-0 shadow-sm border border-border">
                                    <Image
                                        src={service.gallery?.[0] || service.image_url || DEFAULT_SERVICE_IMAGE}
                                        alt={service.title}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold text-foreground">{service.title}</h3>
                                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                                        <Calendar className="h-3 w-3" />
                                        <span>{new Date(booking.date).toLocaleString('en-US', { timeZone: 'UTC' })}</span>
                                    </div>
                                    <div className="mt-2 text-3xl font-bold text-primary">
                                        {service.price} ETB
                                    </div>
                                </div>
                            </div>
                        </div>

                        <PaymentMethods bookingId={booking.id} amount={service.price} />

                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground/60 mt-6">
                            <ShieldCheck className="h-4 w-4 text-green-500" />
                            <span>Secure SSL Encrypted Transaction</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
