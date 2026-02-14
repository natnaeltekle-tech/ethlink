'use server';

import { createClient } from "@/lib/supabase/server";

// Levenshtein distance calculation for fuzzy matching
function levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
                );
            }
        }
    }

    return matrix[b.length][a.length];
}

// Fuzzy match function - returns true if strings are similar enough
function fuzzyMatch(str1: string, str2: string, threshold: number = 2): boolean {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    // Exact match
    if (s1 === s2) return true;

    // Substring match
    if (s1.includes(s2) || s2.includes(s1)) return true;

    // Levenshtein distance check (for typos)
    const distance = levenshteinDistance(s1, s2);
    const maxLength = Math.max(s1.length, s2.length);

    // Allow more distance for longer strings (as a percentage)
    const normalizedThreshold = Math.max(threshold, Math.floor(maxLength * 0.3));

    return distance <= normalizedThreshold;
}

// Enhanced category matching with fuzzy logic
function findCategoryWithFuzzyMatching(message: string): string | null {
    const lowerMsg = message.toLowerCase();

    const categoryMap: { [key: string]: string } = {
        // Events
        'fun': 'Events', 'party': 'Events', 'wedding': 'Events', 'event': 'Events', 'concert': 'Events',
        'celebration': 'Events', 'birthday': 'Events', 'ceremony': 'Events',
        // Hospitality
        'sleep': 'Hospitality', 'stay': 'Hospitality', 'hotel': 'Hospitality', 'bnb': 'Hospitality',
        'room': 'Hospitality', 'bed': 'Hospitality', 'accommodation': 'Hospitality', 'hostel': 'Hospitality',
        'guest': 'Hospitality', 'lodge': 'Hospitality',
        // Transport
        'ride': 'Transport', 'bus': 'Transport', 'car': 'Transport', 'transportation': 'Transport',
        'transport': 'Transport', 'taxi': 'Transport', 'drive': 'Transport', 'shuttle': 'Transport',
        'vehicle': 'Transport', 'airport': 'Transport', 'pickup': 'Transport',
        // Home Services
        'fix': 'Home Services', 'repair': 'Home Services', 'clean': 'Home Services',
        'plumber': 'Home Services', 'electrician': 'Home Services', 'house': 'Home Services',
        'maintenance': 'Home Services', 'painting': 'Home Services', 'gardening': 'Home Services',
        'carpenter': 'Home Services', 'handyman': 'Home Services',
        // Tourism
        'food': 'Tourism', 'eat': 'Tourism', 'restaurant': 'Tourism', 'dinner': 'Tourism',
        'lunch': 'Tourism', 'tour': 'Tourism', 'guide': 'Tourism', 'sightseeing': 'Tourism',
        'attraction': 'Tourism', 'cafe': 'Tourism', 'dining': 'Tourism',
        // Beauty & Wellness
        'hair': 'Beauty', 'salon': 'Beauty', 'spa': 'Beauty', 'massage': 'Beauty',
        'makeup': 'Beauty', 'nail': 'Beauty', 'barber': 'Beauty', 'grooming': 'Beauty',
        // Tech Services
        'computer': 'Tech', 'laptop': 'Tech', 'phone': 'Tech', 'repair tech': 'Tech',
        'software': 'Tech', 'developer': 'Tech', 'website': 'Tech', 'app': 'Tech'
    };

    // First try exact word matching
    for (const [key, category] of Object.entries(categoryMap)) {
        const regex = new RegExp(`\\b${key}\\b`, 'gi');
        if (regex.test(lowerMsg)) {
            return category;
        }
    }

    // Fallback to fuzzy matching for typos
    const words = lowerMsg.split(/\s+/);
    for (const word of words) {
        if (word.length < 3) continue; // Skip very short words

        for (const [key, category] of Object.entries(categoryMap)) {
            if (fuzzyMatch(word, key, 2)) {
                console.log(`Fuzzy match found: "${word}" ~ "${key}" -> ${category}`);
                return category;
            }
        }
    }

    return null;
}

export async function getChatResponse(userMessage: string) {
    try {
        const supabase = await createClient();

        // --- 0. Initial Cleaning & Setup ---
        let pSearch = userMessage;
        const lowerMsg = userMessage.toLowerCase();

        // --- 1. Smart Category Mapping with Fuzzy Logic ---
        const category_filter = findCategoryWithFuzzyMatching(userMessage);

        // If we found a category, remove the keyword from search
        if (category_filter) {
            const categoryMap: { [key: string]: string[] } = {
                'Events': ['fun', 'party', 'wedding', 'event', 'concert', 'celebration', 'birthday', 'ceremony'],
                'Hospitality': ['sleep', 'stay', 'hotel', 'bnb', 'room', 'bed', 'accommodation', 'hostel', 'guest', 'lodge'],
                'Transport': ['ride', 'bus', 'car', 'transportation', 'transport', 'taxi', 'drive', 'shuttle', 'vehicle', 'airport', 'pickup'],
                'Home Services': ['fix', 'repair', 'clean', 'plumber', 'electrician', 'house', 'maintenance', 'painting', 'gardening', 'carpenter', 'handyman'],
                'Tourism': ['food', 'eat', 'restaurant', 'dinner', 'lunch', 'tour', 'guide', 'sightseeing', 'attraction', 'cafe', 'dining'],
                'Beauty': ['hair', 'salon', 'spa', 'massage', 'makeup', 'nail', 'barber', 'grooming'],
                'Tech': ['computer', 'laptop', 'phone', 'repair tech', 'software', 'developer', 'website', 'app']
            };

            const keywords = categoryMap[category_filter] || [];
            for (const key of keywords) {
                const regex = new RegExp(`\\b${key}\\b`, 'gi');
                pSearch = pSearch.replace(regex, '').trim();
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
