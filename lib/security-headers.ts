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
    'X-XSS-Protection': '0',
    'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: blob: https://images.unsplash.com https://plus.unsplash.com https://*.supabase.co",
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.chapa.co https://generativelanguage.googleapis.com",
        "frame-src 'self' https://checkout.chapa.co",
        "object-src 'none'",
        "base-uri 'self'",
    ].join('; '),
}

