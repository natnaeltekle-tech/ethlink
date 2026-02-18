'use client'

import { useEffect } from 'react'
import { SplashScreen } from '@capacitor/splash-screen'
import { Capacitor } from '@capacitor/core'

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error('Global Error:', error)
        // Hide splash screen on error to prevent hanging
        const hideSplash = async () => {
            try {
                if (Capacitor.isNativePlatform()) {
                    await SplashScreen.hide({ fadeOutDuration: 300 })
                }
            } catch (err) {
                console.log('Splash screen hide on error:', err)
            }
        }
        hideSplash()
    }, [error])

    return (
        <html>
            <head>
                <title>Error - Eth-Links</title>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <style>{`
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body {
                        font-family: system-ui, -apple-system, sans-serif;
                        background: #0B0C15; color: #fafafa;
                        display: flex; align-items: center; justify-content: center;
                        min-height: 100vh; padding: 1.5rem;
                    }
                    .container { max-width: 28rem; width: 100%; text-align: center; }
                    .icon {
                        width: 4rem; height: 4rem; margin: 0 auto 1.5rem;
                        border-radius: 50%; background: rgba(239,68,68,0.1);
                        display: flex; align-items: center; justify-content: center;
                    }
                    .icon svg { width: 2rem; height: 2rem; color: #ef4444; }
                    h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem; }
                    p { color: #a1a1aa; font-size: 0.875rem; margin-bottom: 1.5rem; }
                    .btn-primary {
                        width: 100%; padding: 0.75rem 1.5rem; margin-bottom: 0.75rem;
                        background: #F5C518; color: #0B0C15; font-weight: 600;
                        border: none; border-radius: 0.5rem; cursor: pointer;
                        font-size: 1rem; transition: opacity 0.2s;
                    }
                    .btn-primary:hover { opacity: 0.9; }
                    .btn-secondary {
                        width: 100%; padding: 0.75rem 1.5rem;
                        background: #27272a; color: #fafafa; font-weight: 500;
                        border: none; border-radius: 0.5rem; cursor: pointer;
                        font-size: 0.875rem; transition: opacity 0.2s;
                    }
                    .btn-secondary:hover { opacity: 0.8; }
                    details {
                        margin-top: 1.5rem; text-align: left; font-size: 0.75rem;
                        color: #71717a; font-family: monospace; padding: 0.75rem;
                        background: rgba(39,39,42,0.5); border-radius: 0.5rem;
                    }
                    summary { cursor: pointer; user-select: none; }
                    .detail-text { margin-top: 0.5rem; word-break: break-word; }
                `}</style>
            </head>
            <body>
                <div className="container">
                    <div className="icon">
                        <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                        </svg>
                    </div>

                    <h1>Something went wrong</h1>
                    <p>An unexpected error occurred. Reload the app to try again.</p>

                    <button
                        className="btn-primary"
                        onClick={() => {
                            try {
                                reset?.()
                            } catch (err) {
                                console.error('Error during reset, falling back to reload', err)
                                window.location.reload()
                            }
                        }}
                    >
                        Reload App
                    </button>

                    <button
                        className="btn-secondary"
                        onClick={() => window.location.href = '/'}
                    >
                        Go to Home
                    </button>

                    <details>
                        <summary>Error details</summary>
                        <div className="detail-text">{error?.message || 'Unknown error'}</div>
                        {error?.digest && <div className="detail-text" style={{ opacity: 0.6 }}>Digest: {error.digest}</div>}
                    </details>
                </div>
            </body>
        </html>
    )
}
