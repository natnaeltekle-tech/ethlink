/**
 * Security headers applied to all responses via middleware.
 * Protects against XSS, clickjacking, MIME sniffing, and related attacks.
 */
export const SECURITY_HEADERS: Record<string, string> = {
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
    'X-DNS-Prefetch-Control': 'on',
    // Modern browsers ignore X-XSS-Protection; CSP is the real control.
    'X-XSS-Protection': '0',
    'Content-Security-Policy': [
        "default-src 'self'",
        // Next.js requires inline/eval for some runtime paths; keep scoped tight elsewhere.
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: blob: https://images.unsplash.com https://plus.unsplash.com https://*.supabase.co https://lh3.googleusercontent.com",
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.chapa.co https://generativelanguage.googleapis.com",
        "frame-src 'self' https://checkout.chapa.co",
        "frame-ancestors 'none'",
        "form-action 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "upgrade-insecure-requests",
    ].join('; '),
};
