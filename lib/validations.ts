import { z } from 'zod';

export const searchParamsSchema = z.object({
    search: z.string().optional().catch(''),
    category: z.string().optional().catch(''),
    page: z.coerce.number().min(1).optional().catch(1),
});

export const serviceSchema = z.object({
    title: z.string().min(3, 'Title must be at least 3 characters'),
    category: z.string().min(1, 'Category is required'),
    location: z.string().min(1, 'Location is required'),
    price: z.coerce.number().min(0, 'Price must be positive'),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    image_url: z.string().url().optional().or(z.literal('')),
    latitude: z.coerce.number().optional(),
    longitude: z.coerce.number().optional(),
});

export const bookingSchema = z.object({
    serviceId: z.string().uuid(),
    date: z.string().datetime(),
    guests: z.coerce.number().min(1).default(1),
});
