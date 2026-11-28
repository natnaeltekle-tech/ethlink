import { AMHARIC_BEST, AMHARIC_CHEAP, AMHARIC_TERMS, CATEGORIES, KEYWORD_CATEGORY, PLACES, isAmharic } from './lexicon'

export type Lang = 'en' | 'am'
export type SortOrder = 'relevance' | 'price_asc' | 'price_desc' | 'rating'
export type Intent = 'search' | 'question' | 'greeting' | 'other'

export type Criteria = {
    intent: Intent
    lang: Lang
    terms: string[]
    category: string | null
    location: string | null
    maxPrice: number | null
    sort: SortOrder
}

const FILLER = new Set(['find', 'me', 'a', 'an', 'the', 'i', 'im', 'need', 'want', 'looking', 'look', 'for', 'please', 'service', 'services',
    'under', 'below', 'less', 'than', 'cheap', 'cheapest', 'budget', 'affordable', 'best', 'top', 'good', 'near', 'in', 'at', 'around',
    'etb', 'birr', 'br', 'some', 'any', 'can', 'you', 'help', 'with', 'to', 'of', 'and', 'or', 'my', 'is', 'there', 'get', 'book',
    'luxury', 'premium', 'expensive', 'rated', 'highest', 'hire', 'who', 'someone', 'today', 'tomorrow', 'now',
    'do', 'does', 'how', 'what', 'it', 'are', 'we', 'us', 'our', 'your', 'this', 'that', 'on', 'from', 'by', 'will', 'would', 'should'])
const GREETING = /^(hi|hello|hey|selam|salam|ሰላም|ሰላም ነው|thanks|thank you|አመሰግናለሁ|good (morning|afternoon|evening))[\s!.?]*$/i
const QUESTION = /\b(how|what|why|when|is it safe|escrow|refund|pay(ment)?|cancel|dispute|verify|verified|support)\b|እንዴት|ምንድን|ክፍያ|ገንዘብ/i

export function clean(text: string, max = 60): string {
    return text.replace(/[^\p{L}\p{N}\s-]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, max)
}

/** No-AI understanding of a message (English, Amharic, and the two mixed). */
export function parseLocally(message: string): Criteria {
    const lang: Lang = isAmharic(message) ? 'am' : 'en'
    let text = ` ${message.toLowerCase()} `

    // Places first (multi-word before single word)
    let location: string | null = null
    for (const key of Object.keys(PLACES).sort((a, b) => b.length - a.length)) {
        const re = isAmharic(key) ? new RegExp(key) : new RegExp(`\\b${key}\\b`, 'i')
        if (re.test(text)) { location = PLACES[key]; text = text.replace(re, ' '); break }
    }
    if (!location) {
        const m = text.match(/\b(?:in|at|near|around)\s+([a-z][a-z-]{2,20})\b/i)
        if (m && !KEYWORD_CATEGORY[m[1]]) { location = m[1][0].toUpperCase() + m[1].slice(1); text = text.replace(m[0], ' ') }
    }

    // Amharic words → English terms
    const terms: string[] = []
    for (const key of Object.keys(AMHARIC_TERMS).sort((a, b) => b.length - a.length)) {
        if (text.includes(key)) { terms.push(AMHARIC_TERMS[key]); text = text.split(key).join(' ') }
    }

    // Budget
    let maxPrice: number | null = null
    const price = text.replace(/,/g, '').match(/(\d{2,7})/)
    if (price) { maxPrice = Number(price[1]); text = text.replace(price[1], ' ') }

    let sort: Criteria['sort'] = 'relevance'
    if (/\b(cheap|cheapest|budget|affordable|lowest)\b/.test(text) || AMHARIC_CHEAP.some((w) => message.includes(w)) || maxPrice) sort = 'price_asc'
    if (/\b(luxury|premium|expensive|vip)\b/.test(text)) sort = 'price_desc'
    if (/\b(best|top|highest rated|popular)\b/.test(text) || AMHARIC_BEST.some((w) => message.includes(w))) sort = 'rating'

    // Remaining English words
    for (const w of clean(text, 200).toLowerCase().split(' ')) {
        if (w && !FILLER.has(w) && !/^\d+$/.test(w) && !/[ሀ-፿]/.test(w) && w.length > 1) terms.push(w)
    }
    const uniqueTerms = [...new Set(terms)].slice(0, 4)
    const category = uniqueTerms.map((t) => KEYWORD_CATEGORY[t]).find(Boolean) ?? CATEGORIES.find((c) => uniqueTerms.includes(c.toLowerCase())) ?? null

    const trimmed = message.trim()
    const intent: Criteria['intent'] = GREETING.test(trimmed) ? 'greeting'
        : QUESTION.test(trimmed) && !category ? 'question'
            : uniqueTerms.length || category || location ? 'search' : 'other'

    return { intent, lang, terms: uniqueTerms, category, location, maxPrice, sort }
}
