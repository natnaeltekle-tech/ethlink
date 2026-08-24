import { getBookingDetails } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowLeft, Clock, XCircle } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { Card } from "@/components/ui/card";
import { PaymentStatusChecker } from "@/components/payment-status-checker";
import { formatBookingDate, formatBookingTime, BOOKING_TIME_ZONE_LABEL } from "@/lib/booking-time";

type StatusView = "paid" | "pending" | "unpaid";

function resolveStatusView(status: string): StatusView {
    if (status === "paid" || status === "confirmed" || status === "completed") {
        return "paid";
    }
    if (status === "pending") return "pending";
    return "unpaid";
}

export default async function SuccessPage({
    searchParams,
}: {
    searchParams: Promise<{ bookingId: string; tx_ref?: string }>;
}) {
    const { bookingId, tx_ref } = await searchParams;

    if (!bookingId) {
        return redirect("/dashboard");
    }

    const booking = await getBookingDetails(bookingId);

    if (!booking) {
        return notFound();
    }

    const service = booking.services;
    const statusView = resolveStatusView(booking.status ?? "");

    if (statusView === "pending") {
        return (
            <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
                <Card className="max-w-md w-full bg-white dark:bg-gray-800 shadow-xl overflow-hidden">
                    <div className="bg-amber-500 p-8 text-center">
                        <div className="mx-auto bg-white rounded-full h-16 w-16 flex items-center justify-center mb-4 shadow-lg">
                            <Clock className="h-10 w-10 text-amber-500" />
                        </div>
                        <h1 className="text-2xl font-bold text-white">
                            Payment is being processed
                        </h1>
                        <p className="text-amber-50 mt-2">
                            We are confirming your payment. This usually takes
                            only a moment — please don&apos;t pay again.
                        </p>
                    </div>

                    <div className="p-8 space-y-6">
                        <PaymentStatusChecker bookingId={bookingId} txRef={tx_ref} />

                        <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Amount</span>
                                <span className="font-medium">{service.price} ETB</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Service</span>
                                <span className="font-medium text-right">{service.title}</span>
                            </div>
                        </div>

                        <Button asChild variant="outline" className="w-full">
                            <Link href="/dashboard">Go to Dashboard</Link>
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    if (statusView === "unpaid") {
        return (
            <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
                <Card className="max-w-md w-full bg-white dark:bg-gray-800 shadow-xl overflow-hidden">
                    <div className="bg-red-600 p-8 text-center">
                        <div className="mx-auto bg-white rounded-full h-16 w-16 flex items-center justify-center mb-4 shadow-lg">
                            <XCircle className="h-10 w-10 text-red-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-white">
                            Payment Not Completed
                        </h1>
                        <p className="text-red-100 mt-2">
                            We could not confirm this payment. If you were
                            charged, contact support with the reference below.
                        </p>
                    </div>

                    <div className="p-8 space-y-6">
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Reference</span>
                                <span className="font-mono font-medium">{booking.id.slice(0, 8).toUpperCase()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Service</span>
                                <span className="font-medium text-right">{service.title}</span>
                            </div>
                        </div>

                        <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
                            <Link href="/dashboard">Go to Dashboard</Link>
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
            <Card className="max-w-md w-full bg-white dark:bg-gray-800 shadow-xl overflow-hidden">
                <div className="bg-green-600 p-8 text-center">
                    <div className="mx-auto bg-white rounded-full h-16 w-16 flex items-center justify-center mb-4 shadow-lg">
                        <CheckCircle className="h-10 w-10 text-green-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Payment Successful</h1>
                    <p className="text-green-100 mt-2">Your booking has been confirmed</p>
                </div>

                <div className="p-8 space-y-6">
                    <div className="text-center border-b border-gray-200 dark:border-gray-700 pb-6">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Amount Paid</p>
                        <p className="text-4xl font-bold text-gray-900 dark:text-white">{service.price} ETB</p>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Transaction ID</span>
                            <span className="font-mono text-sm font-medium">{booking.id.slice(0, 8).toUpperCase()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Scheduled Date</span>
                            <span className="font-medium">{formatBookingDate(booking.date)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Scheduled Time ({BOOKING_TIME_ZONE_LABEL})</span>
                            <span className="font-medium">{formatBookingTime(booking.date)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Payment Method</span>
                            <span className="font-medium">Local Transfer</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Service</span>
                            <span className="font-medium text-right">{service.title}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Transaction Time</span>
                            <span className="font-medium text-right">
                                {new Date(booking.created_at).toLocaleString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true
                                })}
                            </span>
                        </div>
                    </div>

                    <div className="pt-6 space-y-3">
                        <PrintButton />
                        <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
                            <Link href="/dashboard">Go to Profile</Link>
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}
