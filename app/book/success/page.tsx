import { getBookingDetails } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, XCircle } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { Card } from "@/components/ui/card";
import { PaymentStatusChecker } from "@/components/payment-status-checker";
import {
    formatBookingDate,
    formatBookingTime,
    BOOKING_TIME_ZONE_LABEL,
} from "@/lib/booking-time";
import { isSimulationMode } from "@/lib/payment-mode";

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
    searchParams: Promise<{ bookingId: string; tx_ref?: string; simulated?: string }>;
}) {
    const { bookingId, tx_ref, simulated } = await searchParams;

    if (!bookingId) {
        return redirect("/dashboard");
    }

    const booking = await getBookingDetails(bookingId);

    if (!booking) {
        return notFound();
    }

    const service = booking.services;
    const statusView = resolveStatusView(booking.status ?? "");
    const simulation =
        isSimulationMode() || simulated === "1" || simulated === "true";
    const refCode = booking.id.slice(0, 8).toUpperCase();

    if (statusView === "pending") {
        return (
            <div className="min-h-screen bg-[#0B0C15] sm:bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
                <Card className="max-w-md w-full bg-white dark:bg-gray-800 shadow-xl overflow-hidden rounded-2xl">
                    <div className="bg-amber-500 p-6 sm:p-8 text-center">
                        <div className="mx-auto bg-white rounded-full h-14 w-14 sm:h-16 sm:w-16 flex items-center justify-center mb-3 shadow-lg">
                            <Clock className="h-8 w-8 sm:h-10 sm:w-10 text-amber-500" />
                        </div>
                        <h1 className="text-xl sm:text-2xl font-bold text-white">
                            Payment is being processed
                        </h1>
                        <p className="text-amber-50 mt-2 text-sm sm:text-base">
                            We are confirming your payment. Please don&apos;t pay again.
                        </p>
                    </div>

                    <div className="p-6 sm:p-8 space-y-6">
                        <PaymentStatusChecker bookingId={bookingId} txRef={tx_ref} />

                        <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3 text-sm">
                            <div className="flex justify-between gap-4">
                                <span className="text-gray-500">Amount</span>
                                <span className="font-medium">{service.price} ETB</span>
                            </div>
                            <div className="flex justify-between gap-4">
                                <span className="text-gray-500">Service</span>
                                <span className="font-medium text-right">{service.title}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                                <span className="text-gray-500">Reference</span>
                                <span className="font-mono font-medium">{refCode}</span>
                            </div>
                        </div>

                        <Button asChild variant="outline" className="w-full h-12">
                            <Link href="/dashboard">Go to Dashboard</Link>
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    if (statusView === "unpaid") {
        return (
            <div className="min-h-screen bg-[#0B0C15] sm:bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
                <Card className="max-w-md w-full bg-white dark:bg-gray-800 shadow-xl overflow-hidden rounded-2xl">
                    <div className="bg-red-600 p-6 sm:p-8 text-center">
                        <div className="mx-auto bg-white rounded-full h-14 w-14 flex items-center justify-center mb-3 shadow-lg">
                            <XCircle className="h-8 w-8 text-red-600" />
                        </div>
                        <h1 className="text-xl sm:text-2xl font-bold text-white">
                            Payment Not Completed
                        </h1>
                        <p className="text-red-100 mt-2 text-sm">
                            Contact support with reference {refCode} if you were charged.
                        </p>
                    </div>
                    <div className="p-6 sm:p-8">
                        <Button asChild className="w-full h-12 bg-blue-600 hover:bg-blue-700">
                            <Link href="/dashboard">Go to Dashboard</Link>
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    // ── Paid receipt (mobile-first) ─────────────────────────────────────────
    return (
        <div className="min-h-screen bg-[#0B0C15] sm:bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4 print:bg-white print:p-0">
            <Card className="max-w-md w-full bg-white dark:bg-gray-800 shadow-xl overflow-hidden rounded-2xl print:shadow-none print:rounded-none">
                <div className="bg-green-600 p-6 sm:p-8 text-center print:bg-green-600">
                    <div className="mx-auto bg-white rounded-full h-14 w-14 sm:h-16 sm:w-16 flex items-center justify-center mb-3 shadow-lg">
                        <CheckCircle className="h-8 w-8 sm:h-10 sm:w-10 text-green-600" />
                    </div>
                    <h1 className="text-xl sm:text-2xl font-bold text-white">Payment Successful</h1>
                    <p className="text-green-100 mt-1 text-sm sm:text-base">Your booking is confirmed</p>
                </div>

                <div className="p-6 sm:p-8 space-y-5">
                    <div className="text-center border-b border-gray-200 dark:border-gray-700 pb-5">
                        <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                            Total paid
                        </p>
                        <p className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
                            {service.price}{' '}
                            <span className="text-lg font-semibold text-gray-500">ETB</span>
                        </p>
                    </div>

                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between gap-3">
                            <span className="text-gray-500 shrink-0">Reference</span>
                            <span className="font-mono font-medium text-right">{refCode}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                            <span className="text-gray-500 shrink-0">Service</span>
                            <span className="font-medium text-right">{service.title}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                            <span className="text-gray-500 shrink-0">Date</span>
                            <span className="font-medium text-right">
                                {formatBookingDate(booking.date)}
                            </span>
                        </div>
                        <div className="flex justify-between gap-3">
                            <span className="text-gray-500 shrink-0">
                                Time ({BOOKING_TIME_ZONE_LABEL})
                            </span>
                            <span className="font-medium text-right">
                                {formatBookingTime(booking.date)}
                            </span>
                        </div>
                        <div className="flex justify-between gap-3">
                            <span className="text-gray-500 shrink-0">Method</span>
                            <span className="font-medium text-right">
                                {simulation ? "In-app (simulation)" : "Chapa"}
                            </span>
                        </div>
                    </div>

                    <div className="pt-4 space-y-3 print:hidden">
                        <PrintButton />
                        <Button asChild className="w-full h-12 bg-blue-600 hover:bg-blue-700">
                            <Link href="/dashboard">Go to Dashboard</Link>
                        </Button>
                    </div>

                    <p className="text-center text-[11px] text-gray-400 print:block">
                        Eth-Links · Keep this receipt for your records
                    </p>
                </div>
            </Card>
        </div>
    );
}
