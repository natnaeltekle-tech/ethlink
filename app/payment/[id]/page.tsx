import { getBookingDetails } from '@/lib/actions';
import { notFound } from 'next/navigation';
import { ShieldCheck, Calendar, MapPin, XCircle } from 'lucide-react';
import Image from 'next/image';
import { PaymentMethods } from '@/components/payment/payment-methods';
import { DEFAULT_SERVICE_IMAGE } from '@/lib/constants';
import { formatBookingDateTime, BOOKING_TIME_ZONE_LABEL } from '@/lib/booking-time';

export default async function PaymentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ failed?: string }> }) {
    const { id } = await params;
    const { failed } = await searchParams;
    const booking = await getBookingDetails(id);

    if (!booking) {
        notFound();
    }

    const service = booking.services;
    // The price locked when the booking was made — exactly what checkout charges.
    const amount = Number(booking.quoted_price ?? service.price);

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
                                        <span>{formatBookingDateTime(booking.date)} ({BOOKING_TIME_ZONE_LABEL})</span>
                                    </div>
                                    {(booking.landmark || service.landmark) && (
                                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                                            <MapPin className="h-3 w-3" />
                                            <span>{booking.landmark || service.landmark}</span>
                                        </div>
                                    )}
                                    <div className="mt-2 text-3xl font-bold text-primary">
                                        {amount.toLocaleString()} ETB
                                    </div>
                                </div>
                            </div>
                        </div>

                        {failed && (
                            <div role="alert" className="mb-5 flex gap-2 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm">
                                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                                <p>Your last payment did not go through and you were not charged. You can try again.</p>
                            </div>
                        )}

                        <PaymentMethods bookingId={booking.id} amount={amount} />

                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground/60 mt-6">
                            <ShieldCheck className="h-4 w-4 text-green-500" />
                            <span>Held in escrow until your job is done</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
