'use client'

import React from 'react'
import { Capacitor } from '@capacitor/core'
import { SplashScreen } from '@capacitor/splash-screen'

interface ClientErrorBoundaryProps {
    children: React.ReactNode
}

interface ClientErrorBoundaryState {
    hasError: boolean
    error?: Error
}

export class ClientErrorBoundary extends React.Component<ClientErrorBoundaryProps, ClientErrorBoundaryState> {
    constructor(props: ClientErrorBoundaryProps) {
        super(props)
        this.state = { hasError: false }
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // Log the error
        console.error('ClientErrorBoundary caught an error:', error)
        console.error('Error info:', errorInfo)

        // Hide splash screen on error to prevent hanging
        if (Capacitor.isNativePlatform()) {
            SplashScreen.hide({ fadeOutDuration: 300 }).catch(() => {
                // Ignore splash screen errors
            })
        }
    }

    handleReload = () => {
        window.location.reload()
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="fixed inset-0 bg-background flex flex-col items-center justify-center p-4 z-[9999]">
                    <div className="text-red-500 font-bold p-10">
                        CRITICAL CRASH: {this.state.error?.message}
                    </div>
                    <div className="text-center max-w-md">
                        <div className="mb-6">
                            <svg
                                className="w-16 h-16 mx-auto text-red-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-foreground mb-2">
                            Something went wrong
                        </h1>
                        <p className="text-muted-foreground mb-6">
                            The app encountered an unexpected error. Please reload to continue.
                        </p>
                        <button
                            onClick={this.handleReload}
                            className="px-8 py-3 bg-[#F5C518] text-black font-semibold rounded-lg hover:bg-[#E5B508] transition-colors text-base"
                        >
                            Reload App
                        </button>
                        {this.state.error && (
                            <div className="mt-6 p-4 bg-red-950/50 rounded-lg text-left overflow-auto max-h-40">
                                <p className="text-red-400 text-xs font-mono">
                                    {this.state.error.stack || this.state.error.message}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}
