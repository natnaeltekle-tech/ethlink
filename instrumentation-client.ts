import * as Sentry from '@sentry/nextjs'

/**
 * Client-side Sentry initialization.
 * Enabled only when NEXT_PUBLIC_SENTRY_DSN is configured.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
if (dsn) {
    Sentry.init({
        dsn,
        tracesSampleRate: 0.1,
        sendDefaultPii: false,
    })
}
