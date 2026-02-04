import { GoogleGenerativeAI } from "@google/generative-ai";
import { CONFIG } from '@/lib/constants';

const apiKey = process.env.GOOGLE_API_KEY;

if (!apiKey) {
    console.error("CRITICAL: Missing GOOGLE_API_KEY environment variable. AI features will not work.");
}

// Configuration from environment variables with defaults
export const GEMINI_MODEL_VERSION = process.env.GEMINI_MODEL_VERSION || CONFIG.GEMINI_DEFAULT_MODEL;
export const AI_TEMPERATURE = parseFloat(process.env.AI_TEMPERATURE || '0.7');
export const AI_MAX_TOKENS = parseInt(process.env.AI_MAX_TOKENS || '2048', 10);
export const AI_TOP_P = parseFloat(process.env.AI_TOP_P || '0.9');
export const AI_TOP_K = parseInt(process.env.AI_TOP_K || '40', 10);

const genAI = new GoogleGenerativeAI(apiKey || "dummy_key_to_prevent_crash_on_init");

// Get model with configuration
export const getModel = () => {
    return genAI.getGenerativeModel({
        model: GEMINI_MODEL_VERSION,
        generationConfig: {
            temperature: AI_TEMPERATURE,
            maxOutputTokens: AI_MAX_TOKENS,
            topP: AI_TOP_P,
            topK: AI_TOP_K,
        },
    });
};

// Legacy export for backward compatibility
export const model = getModel();

// Logging utility for AI operations
export function logAIRequest(prompt: string, modelVersion: string, success: boolean, error?: Error) {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        modelVersion,
        promptLength: prompt.length,
        success,
        error: error ? error.message : null,
    };

    if (success) {
        console.log(`[${timestamp}] AI Request - Model: ${modelVersion}, Prompt Length: ${prompt.length}, Status: SUCCESS`);
    } else {
        console.error(`[${timestamp}] AI Request - Model: ${modelVersion}, Prompt Length: ${prompt.length}, Status: FAILED - ${error?.message}`);
    }

    return logEntry;
}
