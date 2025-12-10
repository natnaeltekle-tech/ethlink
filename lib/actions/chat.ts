'use server';

import { createClient } from "@/lib/supabase/server";

export async function getChatResponse(userMessage: string) {
    try {
        const supabase = await createClient();

        // --- 0. Initial Cleaning & Setup ---
        let pSearch = userMessage;
        const lowerMsg = userMessage.toLowerCase();

        // --- 1. Smart Category Mapping (Synonym Dictionary) ---
        let category_filter: string | null = null;

        const categoryMap: { [key: string]: string } = {
            // Events
            'fun': 'Events', 'party': 'Events', 'wedding': 'Events', 'event': 'Events', 'concert': 'Events',
            // Hospitality
            'sleep': 'Hospitality', 'stay': 'Hospitality', 'hotel': 'Hospitality', 'bnb': 'Hospitality', 'room': 'Hospitality', 'bed': 'Hospitality',
            // Transport
            'ride': 'Transport', 'bus': 'Transport', 'car': 'Transport', 'transportation': 'Transport', 'transport': 'Transport', 'taxi': 'Transport', 'drive': 'Transport',
            // Home Services
            'fix': 'Home Services', 'repair': 'Home Services', 'clean': 'Home Services', 'plumber': 'Home Services', 'electrician': 'Home Services', 'house': 'Home Services',
            // Tourism
            'food': 'Tourism', 'eat': 'Tourism', 'restaurant': 'Tourism', 'dinner': 'Tourism', 'lunch': 'Tourism', 'tour': 'Tourism'
        };

        // Check for category keywords
        // Check for category keywords
        for (const [key, category] of Object.entries(categoryMap)) {
            // Use regex to match whole word to avoid partial matches (e.g. 'car' in 'scar')
            // Add 'g' flag to remove ALL occurrences of the synonym
            const regex = new RegExp(`\\b${key}\\b`, 'gi');
            if (regex.test(lowerMsg)) {
                category_filter = category;
                // Remove the keyword from the search string so we don't text-search for it
                // e.g. "Find me a ride" -> "Find me a" (Category=Transport) -> Text search is empty -> Returns all Transport
                pSearch = pSearch.replace(regex, '').trim();
                break; // Prioritize first match
            }
        }

        // --- 2. Price Detection & Mapping ---
        let max_price: number | null = null;
        let isLuxury = false;

        // Explicit price in text (e.g. "under 500")
        const priceMatch = pSearch.match(/(\d+)/);
        if (priceMatch) {
            max_price = parseInt(priceMatch[0], 10);
            pSearch = pSearch.replace(priceMatch[0], '').trim();
        }

        // Price Keywords Mapping
        if (max_price === null) {
            if (['budget', 'cheap', 'affordable', 'low cost'].some(k => lowerMsg.includes(k))) {
                max_price = 1000; // Default budget limit
            }
        }

        if (['luxury', 'expensive', 'premium', 'high end', 'exclusive'].some(k => lowerMsg.includes(k))) {
            isLuxury = true;
        }

        // --- 3. Sorting Logic ---
        // Default: Quality First (Rating DESC), then Price (ASC)
        let sortColumn = 'avg_rating';
        let sortOrder = false; // DESC
        let secondarySort = 'price';
        let secondaryOrder = true; // ASC

        const ratingKeywords = ['best', 'top', 'highest rated', 'good', 'popular'];

        if (isLuxury) {
            sortColumn = 'price';
            sortOrder = false; // High to Low
            secondarySort = 'avg_rating';
            secondaryOrder = false;
        } else if (max_price !== null || ['cheap', 'budget', 'affordable', 'lowest'].some(k => lowerMsg.includes(k))) {
            sortColumn = 'price';
            sortOrder = true; // Low to High
            secondarySort = 'avg_rating';
            secondaryOrder = false;
        }
        // --- 4. Location Detection (The 'In' Rule) ---
        let location_filter: string | null = null;
        const locMatch = pSearch.match(/\bin\s+(\w+)/i);
        if (locMatch) {
            location_filter = locMatch[1];
            pSearch = pSearch.replace(locMatch[0], '').trim();
        }

        // --- 5. Clean what's left for the text search ---
        const finalQuery = cleanSearchQuery(pSearch);

        console.log(`
        🔎 Detective Logic:
        Original: "${userMessage}"
        Category: ${category_filter}
        Max Price: ${max_price}
        Location: ${location_filter}
        Sort: ${sortColumn} (${sortOrder ? 'ASC' : 'DESC'})
        Text Query: "${finalQuery}"
        `);

        // --- 6. Database Query ---
        // Use services_view for pre-calculated avg_rating
        let query = supabase
            .from('services_view')
            .select('*');

        // Apply Filters
        if (category_filter) {
            query = query.eq('category', category_filter);
        }

        if (max_price !== null) {
            query = query.lte('price', max_price);
        }

        if (location_filter) {
            query = query.ilike('location', `%${location_filter}%`);
        }

        // Apply Text Search if we have keywords left
        if (finalQuery.length > 0) {
            query = query.or(`title.ilike.%${finalQuery}%,description.ilike.%${finalQuery}%`);
        }

        // Apply Sorting
        query = query.order(sortColumn, { ascending: sortOrder });
        if (secondarySort) {
            query = query.order(secondarySort, { ascending: secondaryOrder });
        }

        const { data: services, error } = await query;

        if (error) {
            console.error("Chat Search Error:", error);
            return "I'm having trouble searching right now. Please try again.";
        }

        // --- 7. Concierge Response formatting ---
        if (services && services.length > 0) {
            const topService = services[0];
            const otherServices = services.slice(1, 3);

            let response = `Based on your request, my top recommendation is **${topService.title}**. It is a great choice for ${category_filter || topService.category || 'what you need'}.\n\n`;

            // Add top service details
            response += `🔹 [${topService.title}](/services/${topService.id}) ($${topService.price}) ${topService.avg_rating ? `⭐ ${Number(topService.avg_rating).toFixed(1)}` : ''}\n📍 ${topService.location || 'Location not specified'}\n\n`;

            if (otherServices.length > 0) {
                response += `Here are other highly-rated options:\n\n`;
                const otherFormatted = otherServices.map((s: any) => {
                    return `🔹 [${s.title}](/services/${s.id}) ($${s.price}) ${s.avg_rating ? `⭐ ${Number(s.avg_rating).toFixed(1)}` : ''}\n📍 ${s.location || 'Location not specified'}`;
                }).join('\n\n');
                response += otherFormatted;
            }

            return response;
        } else {
            let msg = `I couldn't find any services`;
            if (category_filter) msg += ` in ${category_filter}`;
            if (finalQuery) msg += ` matching "${finalQuery}"`;
            if (location_filter) msg += ` in ${location_filter}`;
            if (max_price) msg += ` under $${max_price}`;
            msg += `. Try broadening your search.`;
            return msg;
        }

    } catch (error) {
        console.error("Chat Search Error:", error);
        return "I'm having trouble searching right now. Please try browsing the services page.";
    }
}

function cleanSearchQuery(text: string): string {
    const fillerWords = ['find', 'me', 'a', 'an', 'the', 'i', 'need', 'want', 'looking', 'for', 'please', 'service', 'under', 'less', 'than', 'cheap']; // Added some price related fillers
    // Remove punctuation and split
    const words = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
    const keywords = words.filter(word => !fillerWords.includes(word) && word.length > 0);
    return keywords.join(' ');
}
