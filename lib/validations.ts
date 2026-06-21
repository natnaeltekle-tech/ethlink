import { z } from 'zod';

// ─── Reusable Primitives ────────────────────────────────────────────────────
const safeString = (maxLen: number) => z.string().max(maxLen).trim();
const safeUrl = z.string().url().max(2000);

// ─── Service ────────────────────────────────────────────────────────────────
export const searchParamsSchema = z.object({
    search: safeString(200).optional().catch(''),
    category: safeString(100).optional().catch(''),
    page: z.coerce.number().min(1).optional().catch(1),
});

export const serviceSchema = z.object({
    title: safeString(200).min(3, 'Title must be at least 3 characters'),
    category: safeString(100).min(1, 'Category is required'),
    location: safeString(200).min(1, 'Location is required'),
    price: z.coerce.number().min(0, 'Price must be positive').max(10_000_000),
    description: safeString(5000).min(10, 'Description must be at least 10 characters'),
    image_url: safeUrl.optional().or(z.literal('')),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
});

// ─── Booking ────────────────────────────────────────────────────────────────
export const bookingSchema = z.object({
    serviceId: z.string().uuid(),
    date: z.string().datetime(),
    guests: z.coerce.number().min(1).max(100).default(1),
});

// ─── Review ─────────────────────────────────────────────────────────────────
export const reviewSchema = z.object({
    serviceId: z.string().uuid(),
    rating: z.number().int().min(1).max(5),
    comment: safeString(2000),
});

// ─── Message ────────────────────────────────────────────────────────────────
export const messageSchema = z.object({
    serviceId: z.string().uuid(),
    receiverId: z.string().uuid(),
    content: safeString(2000).min(1, 'Message cannot be empty'),
});

// ─── Search / Chat Input ────────────────────────────────────────────────────
export const searchInputSchema = z.object({
    query: safeString(500),
});

// ─── Avatar / Gallery ───────────────────────────────────────────────────────
export const urlSchema = safeUrl;

// ─── Payment Webhook ────────────────────────────────────────────────────────
export const txRefSchema = z.string()
    .max(200)
    .regex(/^tx-(ethlink|telebirr|cbe)-[a-f0-9-]+-\d+-[a-z0-9]+$/i, 'Invalid tx_ref format');

export const paymentWebhookSchema = z.object({
    tx_ref: txRefSchema,
    status: z.string().max(50),
    meta: z
        .object({
            booking_id: z.string().uuid().optional(),
        })
        .passthrough()
        .optional(),
}).passthrough();

// ─── Booking Status ─────────────────────────────────────────────────────────
export const bookingStatusSchema = z.enum(['confirmed', 'cancelled']);
export const escrowResolutionSchema = z.object({
    bookingId: z.string().uuid(),
    resolution: z.enum(['release_to_provider', 'refund_customer']),
    reason: safeString(1000).min(10, 'Please provide a dispute note with at least 10 characters'),
});

// ─── Profile ────────────────────────────────────────────────────────────────
export const profileUpdateSchema = z.object({
    firstName: safeString(100).optional(),
    lastName: safeString(100).optional(),
    phoneNumber: safeString(20).optional(),
}).refine(
    (data) => data.firstName || data.lastName || data.phoneNumber,
    { message: 'No changes provided' }
);

export const providerProfileSchema = z.object({
    firstName: safeString(100).min(1, 'First name is required'),
    lastName: safeString(100).min(1, 'Last name is required'),
    phoneNumber: safeString(20).min(1, 'Phone number is required'),
    idCardLink: safeUrl,
});

export const uuidSchema = z.string().uuid();

export const chatInputSchema = z.object({
    message: safeString(500).min(1, 'Message cannot be empty'),
});
