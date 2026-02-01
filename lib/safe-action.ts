import { z } from 'zod';

export type ActionState<T> = {
    success: boolean;
    data?: T;
    error?: string;
};

export async function safeAction<T, S extends z.ZodType>(
    schema: S,
    data: z.infer<S>,
    action: (parsedData: z.infer<S>) => Promise<T>
): Promise<ActionState<T>> {
    try {
        const validatedData = schema.parse(data);
        const result = await action(validatedData);
        return { success: true, data: result };
    } catch (error) {
        console.error('Action Error:', error);
        if (error instanceof z.ZodError) {
            return { success: false, error: error.issues[0]?.message || 'Validation error' };
        }
        if (error instanceof Error) {
            return { success: false, error: error.message };
        }
        return { success: false, error: 'An unexpected error occurred' };
    }
}
