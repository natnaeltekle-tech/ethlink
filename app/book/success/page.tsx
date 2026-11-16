import { getBookingDetails } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Clock, XCircle } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { PaymentStatusChecker } from "@/components/payment-status-checker";

type StatusView = "paid" | "pending" | "unpaid";

function resolveStatusView(status: string): StatusView {
    if (["paid", "completed", "disputed", "refunded"].includes(status)) return "paid";
    // Requested or accepted but not yet confirmed as paid: keep checking.
    if (status === "pending" || status === "confirmed") return "pending";
    return "unpaid";
}

export default async function SuccessPage({
    searchParams,
}: {
    searchParams: Promise<{ bookingId: string; tx_ref?: string; simulated?: string }>;
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
    const refCode = booking.id.slice(0, 8).toUpperCase();

    // Paid bookings get the official escrow receipt.
    if (statusView === "paid") {
        redirect(`/receipt/${booking.id}`);
    }
    const lockedPrice = Number(booking.quoted_price ?? service.price);

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
                                <span className="font-medium">{lockedPrice.toLocaleString()} ETB</span>
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
}
