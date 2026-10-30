'use server';

import { getModel, GEMINI_MODEL_VERSION, logAIRequest } from "@/lib/gemini";
import { searchServicesAdvanced } from "@/lib/actions";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { chatInputSchema } from "@/lib/validations";
import { sanitizeUserText } from "@/lib/sanitize";

// Guard so a slow Gemini network call can never hang the request indefinitely.
const AI_CALL_TIMEOUT_MS = 20_000;

function withTimeout<T>(promise: Promise<T>): Promise<T> {
    return Promise.race([
        promise,
        new Promise<never>((_, reject) =>
            setTimeout(
                () => reject(new Error(`AI request timed out after ${AI_CALL_TIMEOUT_MS}ms`)),
                AI_CALL_TIMEOUT_MS
            )
        ),
    ]);
}

type GeminiUsageMetadata = {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
};

function extractUsageMetadata(result: unknown): GeminiUsageMetadata {
    const usage = (result as { response?: { usageMetadata?: GeminiUsageMetadata } })?.response?.usageMetadata;
    return usage ?? {};
}

export async function processUserMessage(userMessage: string): Promise<string> {
    // Structural validation (length + type) via Zod
    const parsed = chatInputSchema.safeParse({ message: userMessage ?? '' });
    if (!parsed.success) {
        return "Please keep your message under 500 characters.";
    }

    // Per-user rate limiting via the shared rate-limit infrastructure.
    const supabase = await createClient();
    let rateLimitKey = "anonymous";
    try {
        const { data } = await supabase.auth.getUser();
        if (data.user) rateLimitKey = data.user.id;
    } catch {
        /* expired/corrupt session — treat as anonymous */
    }

    const rl = await checkRateLimit(rateLimitKey, "/ai-concierge");
    if (!rl.allowed) {
        const waitMinutes = Math.max(1, Math.ceil(rl.retryAfter / 60));
        return `You've reached the concierge limit. Please try again in about ${waitMinutes} minute(s), or use the search bar in the meantime.`;
    }

    // Sanitize for prompt injection surface before embedding in prompts
    const sanitizedMessage = sanitizeUserText(parsed.data.message, 500);
    if (!sanitizedMessage) {
        return "Please enter a short message about the service you need.";
    }

    const model = getModel();

    try {
        const extractionPrompt = `
            You are a smart search assistant for a service marketplace called EthLink.
            Extract search criteria from the user's message: "${sanitizedMessage}".

            Return a JSON object with:
            - "query": (string) main keywords (service type, category, etc.). Fix typos (e.g., "phototgraphy" -> "photography"). Remove filler words.
            - "location": (string) location if mentioned, else null.
            - "maxPrice": (number) maximum price if mentioned, else null.

            Example: "find me a cheap taxi in addis under 200" -> {"query": "taxi", "location": "addis", "maxPrice": 200}
            Example: "wedding photo" -> {"query": "wedding photography", "location": null, "maxPrice": null}
            Example: "cleaning" -> {"query": "cleaning", "location": null, "maxPrice": null}

            Output ONLY raw JSON. Do not use markdown blocks.
        `;

        let extractionResult;
        try {
            extractionResult = await withTimeout(model.generateContent(extractionPrompt));
            const usage = extractUsageMetadata(extractionResult);
            await logAIRequest(extractionPrompt, GEMINI_MODEL_VERSION, true, undefined, {
                inputTokens: usage.promptTokenCount,
                outputTokens: usage.candidatesTokenCount,
                totalTokens: usage.totalTokenCount,
                metadata: { stage: 'criteria_extraction' },
            });
        } catch (error) {
            await logAIRequest(extractionPrompt, GEMINI_MODEL_VERSION, false, error as Error, {
                fallbackUsed: true,
                metadata: { stage: 'criteria_extraction' },
            });
            throw new Error(`AI extraction failed: ${(error as Error).message}`);
        }

        const criteriaText = extractionResult.response.text().replace(/```json/g, '').replace(/```/g, '').trim();

        let criteria: { query?: string; location?: string | null; maxPrice?: number | null };
        try {
            criteria = JSON.parse(criteriaText);
        } catch {
            console.error("Failed to parse AI criteria JSON:", criteriaText);
            criteria = { query: sanitizedMessage, location: null, maxPrice: null };
        }

        const safeQuery = typeof criteria.query === 'string'
            ? sanitizeUserText(criteria.query, 200)
            : sanitizedMessage;
        const safeLocation = typeof criteria.location === 'string'
            ? sanitizeUserText(criteria.location, 100)
            : null;
        const safeMaxPrice =
            typeof criteria.maxPrice === 'number' && Number.isFinite(criteria.maxPrice)
                ? Math.min(Math.max(0, criteria.maxPrice), 10_000_000)
                : null;

        const services = await searchServicesAdvanced(safeQuery || '', safeLocation, safeMaxPrice);

        if (services && services.length > 0) {
            const introPrompt = `
                The user asked: "${sanitizedMessage}".
                We found ${services.length} services matching the criteria: ${JSON.stringify({ query: safeQuery, location: safeLocation, maxPrice: safeMaxPrice })}.
                Write a short, friendly, conversational sentence introducing the results.
                Example: "Here are some taxi services I found for you in Addis Ababa:"
                Do NOT list the services.
            `;

            let introResult;
            try {
                introResult = await withTimeout(model.generateContent(introPrompt));
                const usage = extractUsageMetadata(introResult);
                await logAIRequest(introPrompt, GEMINI_MODEL_VERSION, true, undefined, {
                    inputTokens: usage.promptTokenCount,
                    outputTokens: usage.candidatesTokenCount,
                    totalTokens: usage.totalTokenCount,
                    metadata: { stage: 'results_intro', resultCount: services.length },
                });
            } catch (error) {
                await logAIRequest(introPrompt, GEMINI_MODEL_VERSION, false, error as Error, {
                    fallbackUsed: true,
                    metadata: { stage: 'results_intro', resultCount: services.length },
                });
                introResult = { response: { text: () => `I found ${services.length} services for you:` } };
            }

            const intro = introResult.response.text();

            const formattedServices = services.slice(0, 3).map((s: { title?: string; price?: number; location?: string; id?: string }) => {
                return `🔹 ${s.title} (ETB ${s.price})\n📍 ${s.location || 'Location not specified'}\n📅 [Book Now](/book/${s.id})`;
            }).join('\n\n');

            return `${intro}\n\n${formattedServices}`;
        } else {
            const noResultsPrompt = `
                The user asked: "${sanitizedMessage}".
                We searched for: ${JSON.stringify({ query: safeQuery, location: safeLocation, maxPrice: safeMaxPrice })} but found 0 results.
                Write a helpful, polite response explaining we couldn't find anything and suggesting they try broader terms or check the spelling.
            `;

            let result;
            try {
                result = await withTimeout(model.generateContent(noResultsPrompt));
                const usage = extractUsageMetadata(result);
                await logAIRequest(noResultsPrompt, GEMINI_MODEL_VERSION, true, undefined, {
                    inputTokens: usage.promptTokenCount,
                    outputTokens: usage.candidatesTokenCount,
                    totalTokens: usage.totalTokenCount,
                    metadata: { stage: 'no_results' },
                });
            } catch (error) {
                await logAIRequest(noResultsPrompt, GEMINI_MODEL_VERSION, false, error as Error, {
                    fallbackUsed: true,
                    metadata: { stage: 'no_results' },
                });
                return `I couldn't find any services matching "${safeQuery || sanitizedMessage}"${safeLocation ? ` in ${safeLocation}` : ''}. Try searching with different keywords or browse all services.`;
            }

            return result.response.text();
        }

    } catch (error) {
        console.error("AI Processing Error:", error);
        throw error;
    }
}
