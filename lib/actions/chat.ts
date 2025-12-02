'use server';

import { createClient } from "@/lib/supabase/server";

export async function getChatResponse(userMessage: string) {
    try {
        const supabase = await createClient();

        const cleanedQuery = cleanSearchQuery(userMessage);
        console.log(`Original: "${userMessage}" -> Cleaned: "${cleanedQuery}"`);

        // Call the RPC function for fuzzy matching with cleaned query
        const { data: services, error } = await supabase
            .rpc('search_services_smart', { search_term: cleanedQuery });

        if (error) {
            console.error("RPC Search Error:", error);
            return "I'm having trouble searching right now. Please try again.";
        }

        if (services && services.length > 0) {
            const formattedServices = services.slice(0, 3).map((s: any) => {
                return `🔹 ${s.title} ($${s.price})\n📍 ${s.location || 'Location not specified'}\n📅 [Book Now](/book/${s.id})`;
            }).join('\n\n');

            return `I found these services matching "${cleanedQuery}":\n\n${formattedServices}`;
        } else {
            return `I couldn't find any services matching "${cleanedQuery}". Try broadening your search or browsing our Categories.`;
        }

    } catch (error) {
        console.error("Chat Search Error:", error);
        return "I'm having trouble searching right now. Please try browsing the services page.";
    }
}

function cleanSearchQuery(text: string): string {
    const fillerWords = ['find', 'me', 'a', 'an', 'the', 'i', 'need', 'want', 'looking', 'for', 'please', 'service'];
    // Remove punctuation and split
    const words = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
    const keywords = words.filter(word => !fillerWords.includes(word) && word.length > 0);
    return keywords.join(' ');
}
