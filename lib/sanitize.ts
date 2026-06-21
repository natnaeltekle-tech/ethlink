/**
 * Content sanitization for user-generated text.
 * Strips HTML/script tags and normalizes whitespace.
 */

const HTML_TAG_RE = /<[^>]*>/g
const SCRIPT_RE = /javascript:/gi
const CONTROL_CHARS_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g

/**
 * Sanitize plain-text user content (messages, reviews, descriptions).
 * Removes HTML tags, script URIs, and control characters.
 */
export function sanitizeText(input: string, maxLength = 5000): string {
    if (!input) return ''

    return input
        .replace(HTML_TAG_RE, '')
        .replace(SCRIPT_RE, '')
        .replace(CONTROL_CHARS_RE, '')
        .trim()
        .slice(0, maxLength)
}

/**
 * Sanitize a short display name or title.
 */
export function sanitizeShortText(input: string, maxLength = 200): string {
    return sanitizeText(input, maxLength)
}

/**
 * Sanitize message content before persistence.
 */
export function sanitizeMessage(content: string): string {
    return sanitizeText(content, 2000)
}

/**
 * Sanitize review comment before persistence.
 */
export function sanitizeReviewComment(comment: string): string {
    return sanitizeText(comment, 2000)
}

/**
 * Sanitize service description before persistence.
 */
export function sanitizeDescription(description: string): string {
    return sanitizeText(description, 5000)
}
