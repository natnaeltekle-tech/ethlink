import { GoogleGenerativeAI, type GenerationConfig } from "@google/generative-ai";
import { CONFIG } from '@/lib/constants';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Gemini client. Lazy: without GOOGLE_API_KEY nothing calls Google (no failing
 * requests, no error spam) and the assistant uses its built-in search instead.
 */
const apiKey = (process.env.GOOGLE_API_KEY ?? '').trim();

// Stale names from older setups (Gemini 1.x / "gemini-pro") no longer exist at Google.
const RETIRED_MODEL = /^gemini-(pro|1\.0|1\.5)/;
const configuredModel = (process.env.GEMINI_MODEL_VERSION ?? '').trim();
export const GEMINI_MODEL_VERSION = configuredModel && !RETIRED_MODEL.test(configuredModel) ? configuredModel : CONFIG.GEMINI_DEFAULT_MODEL;
export const AI_TEMPERATURE = parseFloat(process.env.AI_TEMPERATURE || '0.7');
export const AI_MAX_TOKENS = parseInt(process.env.AI_MAX_TOKENS || '2048', 10);
export const AI_TOP_P = parseFloat(process.env.AI_TOP_P || '0.9');
export const AI_TOP_K = parseInt(process.env.AI_TOP_K || '40', 10);

export function isAIConfigured(): boolean {
    return apiKey.length > 10 && apiKey !== 'changeme';
}

let client: GoogleGenerativeAI | null = null;

/** Model with the given settings (defaults from env). Throws if AI isn't configured. */
export const getModel = (overrides: Partial<GenerationConfig> = {}, systemInstruction?: string) => {
    if (!isAIConfigured()) throw new Error('AI is not configured (GOOGLE_API_KEY missing)');
    client ??= new GoogleGenerativeAI(apiKey);
    return client.getGenerativeModel({
        model: GEMINI_MODEL_VERSION,
        systemInstruction,
        generationConfig: {
            temperature: AI_TEMPERATURE,
            maxOutputTokens: AI_MAX_TOKENS,
            topP: AI_TOP_P,
            topK: AI_TOP_K,
            ...overrides,
        },
    });
};

interface AIRequestLogOptions {
    inputTokens?: number | null;
    outputTokens?: number | null;
    totalTokens?: number | null;
    fallbackUsed?: boolean;
    metadata?: Record<string, unknown>;
}

// Logging utility for AI operations
export async function logAIRequest(
    prompt: string,
    modelVersion: string,
    success: boolean,
    error?: Error,
    options: AIRequestLogOptions = {}
) {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        modelVersion,
        promptLength: prompt.length,
        success,
        error: error ? error.message : null,
        inputTokens: options.inputTokens ?? null,
        outputTokens: options.outputTokens ?? null,
        totalTokens: options.totalTokens ?? null,
        fallbackUsed: options.fallbackUsed ?? false,
    };

    if (success) {
        console.log(`[${timestamp}] AI Request - Model: ${modelVersion}, Prompt Length: ${prompt.length}, Status: SUCCESS`);
    } else {
        console.error(`[${timestamp}] AI Request - Model: ${modelVersion}, Prompt Length: ${prompt.length}, Status: FAILED - ${error?.message}`);
    }

    try {
        const supabase = createAdminClient() as any;
        const { error: insertError } = await supabase.from('ai_logs').insert({
            model_version: modelVersion,
            prompt_length: prompt.length,
            success,
            input_tokens: options.inputTokens ?? null,
            output_tokens: options.outputTokens ?? null,
            total_tokens: options.totalTokens ?? null,
            fallback_used: options.fallbackUsed ?? false,
            error_message: error?.message ?? null,
            metadata: options.metadata ?? null,
        });

        if (insertError) {
            console.error('[AI] Failed to persist AI log:', insertError);
        }
    } catch (logError) {
        console.error('[AI] Failed to write AI log:', logError);
    }

    return logEntry;
}
