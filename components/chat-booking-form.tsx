'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar, Loader2, CheckCircle, ArrowLeft } from 'lucide-react';
import { createBookingJson, getServiceDetails } from '@/lib/actions';

interface ChatBookingFormProps {
    serviceId: string;
    onCancel: () => void;
    /** Called with the new (pending, unpaid) booking — the chat then offers payment. */
    onSuccess: (bookingId: string) => void;
}

export function ChatBookingForm({ serviceId, onCancel, onSuccess }: ChatBookingFormProps) {
    const [service, setService] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

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
        // Same as the other booking forms: the picked local time → ISO (else the server reads it as UTC)
        const rawDate = formData.get('date');
        if (typeof rawDate === 'string' && rawDate) formData.set('date', new Date(rawDate).toISOString());

        try {
            const result = await createBookingJson(formData);
            if (result.error) {
                setError(result.error);
            } else if (result.bookingId) {
                onSuccess(result.bookingId);
            }
        } catch (err) {
            setError('An unexpected error occurred');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full space-y-2">
                <Loader2 className="h-8 w-8 animate-spin text-[#FACC15]" />
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
        <div className="flex h-full flex-col bg-[#121214] text-white">
            <div className="flex items-center border-b border-white/10 p-3">
                <Button variant="ghost" size="icon" onClick={onCancel} className="mr-2 h-8 w-8">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h3 className="font-semibold text-sm truncate max-w-[200px]">{service.title}</h3>
                    <p className="text-xs text-[#FACC15] font-medium">{service.price} ETB</p>
                </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="date" className="block text-xs font-medium text-white/80">
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

                    <div className="space-y-2">
                        <label htmlFor="chat-landmark" className="block text-xs font-medium text-white/80">
                            Landmark / Sefer <span className="text-white/50">(optional)</span>
                        </label>
                        <Input id="chat-landmark" name="landmark" maxLength={150} autoComplete="off"
                            placeholder="e.g. Bole Medhanialem, behind Edna Mall" className="h-10 text-sm" />
                    </div>

                    {error && (
                        <div className="rounded-md bg-red-500/10 p-3 text-xs text-red-400">
                            {error}
                        </div>
                    )}

                    <div className="bg-[#FACC15]/10 p-3 rounded-lg flex gap-2 items-start">
                        <CheckCircle className="h-4 w-4 text-[#FACC15] mt-0.5 shrink-0" />
                        <p className="text-xs text-foreground/90">
                            You pay next. Your payment is held in escrow and only released to the provider after the job is done.
                        </p>
                    </div>

                    <Button
                        type="submit"
                        className="w-full bg-[#FACC15] text-[#121214] font-semibold hover:bg-[#FACC15]/90"
                        disabled={submitting}
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Booking...
                            </>
                        ) : (
                            'Request booking'
                        )}
                    </Button>
                </form>
            </div>
        </div>
    );
}
