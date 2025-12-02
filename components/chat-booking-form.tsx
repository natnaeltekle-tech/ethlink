'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar, Loader2, CheckCircle, ArrowLeft } from 'lucide-react';
import { createBookingJson, getServiceDetails } from '@/lib/actions';

interface ChatBookingFormProps {
    serviceId: string;
    onCancel: () => void;
    onSuccess: () => void;
}

export function ChatBookingForm({ serviceId, onCancel, onSuccess }: ChatBookingFormProps) {
    const [service, setService] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const [bookingId, setBookingId] = useState<string | null>(null);

    useEffect(() => {
        const fetchService = async () => {
            try {
                const data = await getServiceDetails(serviceId);
                setService(data);
            } catch (err) {
                console.error(err);
                setError('Failed to load service details');
            } finally {
                setLoading(false);
            }
        };
        fetchService();
    }, [serviceId]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        const formData = new FormData(e.currentTarget);
        formData.append('serviceId', serviceId);

        try {
            const result = await createBookingJson(formData);
            if (result.error) {
                setError(result.error);
            } else if (result.bookingId) {
                setBookingId(result.bookingId);
                onSuccess();
            }
        } catch (err) {
            setError('An unexpected error occurred');
        } finally {
            setSubmitting(false);
        }
    };

    if (bookingId) {
        return <PaymentSuccessView bookingId={bookingId} />;
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full space-y-2">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <p className="text-sm text-gray-500">Loading service details...</p>
            </div>
        );
    }

    if (!service) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                <p className="text-red-500 mb-4">{error || 'Service not found'}</p>
                <Button variant="outline" onClick={onCancel}>Back to Chat</Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-900">
            <div className="flex items-center p-3 border-b border-gray-200 dark:border-gray-800">
                <Button variant="ghost" size="icon" onClick={onCancel} className="mr-2 h-8 w-8">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h3 className="font-semibold text-sm truncate max-w-[200px]">{service.title}</h3>
                    <p className="text-xs text-blue-600 font-medium">{service.price} ETB</p>
                </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="date" className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                            Select Date & Time
                        </label>
                        <div className="relative">
                            <Input
                                type="datetime-local"
                                name="date"
                                id="date"
                                required
                                className="pl-9 h-10 text-sm"
                                min={new Date().toISOString().slice(0, 16)}
                            />
                            <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-xs rounded-md">
                            {error}
                        </div>
                    )}

                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg flex gap-2 items-start">
                        <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                        <p className="text-xs text-blue-800 dark:text-blue-200">
                            Free cancellation up to 24h before.
                        </p>
                    </div>

                    <Button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        disabled={submitting}
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Booking...
                            </>
                        ) : (
                            'Confirm Booking'
                        )}
                    </Button>
                </form>
            </div>
        </div>
    );
}

function PaymentSuccessView({ bookingId }: { bookingId: string }) {
    return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-6">
            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Booking Confirmed!</h3>
                <p className="text-sm text-gray-500 mt-2">Your booking has been created successfully.</p>
            </div>
            <Button asChild className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg">
                <a href={`/payment/${bookingId}`} target="_blank" rel="noopener noreferrer">
                    Proceed to Payment
                </a>
            </Button>
        </div>
    );
}
