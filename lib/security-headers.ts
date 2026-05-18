/**
 * Security headers applied to all responses via middleware.
 * These protect against common web attacks (XSS, clickjacking, MIME sniffing, etc.)
 */
export const SECURITY_HEADERS: Record<string, string> = {
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'interest-cohort=()',
    'X-DNS-Prefetch-Control': 'on',
}
