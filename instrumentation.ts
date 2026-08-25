import * as Sentry from '@sentry/nextjs'

/**
 * Server-side Sentry initialization (Node.js runtime).
 * Enabled only when a DSN is configured — no DSN means Sentry stays
 * fully disabled and adds zero overhead.
 */
export async function register() {
    const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN
    if (!dsn) return

    Sentry.init({
        dsn,
        // Keep sampling low; raise deliberately if needed.
        tracesSampleRate: 0.1,
        // Never attach user PII (Sensitive Data Ban).
        sendDefaultPii: false,
    })
}

// Captures errors from server actions, route handlers, and RSC rendering.
export const onRequestError = Sentry.captureRequestError
