'use server';

import { model } from "@/lib/gemini";
import { searchServicesAdvanced } from "@/lib/actions";

export async function processUserMessage(userMessage: string) {
    try {
        // 1. Extract Search Criteria
        const extractionPrompt = `
            You are a smart search assistant for a service marketplace called EthLink. 
            Extract search criteria from the user's message: "${userMessage}".
            
            Return a JSON object with:
            - "query": (string) main keywords (service type, category, etc.). Fix typos (e.g., "phototgraphy" -> "photography"). Remove filler words.
            - "location": (string) location if mentioned, else null.
            - "maxPrice": (number) maximum price if mentioned, else null.
            
            Example: "find me a cheap taxi in addis under 200" -> {"query": "taxi", "location": "addis", "maxPrice": 200}
            Example: "wedding photo" -> {"query": "wedding photography", "location": null, "maxPrice": null}
            Example: "cleaning" -> {"query": "cleaning", "location": null, "maxPrice": null}
            
            Output ONLY raw JSON. Do not use markdown blocks.
        `;

        const extractionResult = await model.generateContent(extractionPrompt);
        const criteriaText = extractionResult.response.text().replace(/```json/g, '').replace(/```/g, '').trim();

        let criteria;
        try {
            criteria = JSON.parse(criteriaText);
        } catch (e) {
            console.error("Failed to parse AI criteria JSON:", criteriaText);
            // Fallback to using the whole message as query
            criteria = { query: userMessage, location: null, maxPrice: null };
        }

        // 2. Search Database
        // If the query is empty/meaningless after extraction, we might get too many results, but searchServicesAdvanced handles empty query by returning everything or nothing depending on implementation.
        // Let's ensure we have at least something.
        const services = await searchServicesAdvanced(criteria.query || '', criteria.location, criteria.maxPrice);

        // 3. Generate Response
        if (services && services.length > 0) {
            // We'll let the AI generate a friendly intro, but WE will format the list to ensure data integrity.
            const introPrompt = `
                The user asked: "${userMessage}".
                We found ${services.length} services matching the criteria: ${JSON.stringify(criteria)}.
                Write a short, friendly, conversational sentence introducing the results. 
                Example: "Here are some taxi services I found for you in Addis Ababa:"
                Do NOT list the services.
            `;
            const introResult = await model.generateContent(introPrompt);
            const intro = introResult.response.text();

            const formattedServices = services.slice(0, 3).map((s: any) => {
                return `🔹 ${s.title} ($${s.price})\n📍 ${s.location || 'Location not specified'}\n📅 [Book Now](/book/${s.id})`;
            }).join('\n\n');

            return `${intro}\n\n${formattedServices}`;
        } else {
            const noResultsPrompt = `
                The user asked: "${userMessage}".
                We searched for: ${JSON.stringify(criteria)} but found 0 results.
                Write a helpful, polite response explaining we couldn't find anything and suggesting they try broader terms or check the spelling.
            `;
            const result = await model.generateContent(noResultsPrompt);
            return result.response.text();
        }

    } catch (error) {
        console.error("AI Processing Error:", error);
        return "I'm having a bit of trouble connecting to my AI brain right now. Please try searching with simple keywords like 'taxi' or 'cleaning'.";
    }
}
