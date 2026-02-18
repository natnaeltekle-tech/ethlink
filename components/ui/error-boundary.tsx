'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { SplashScreen } from '@capacitor/splash-screen'
import { Capacitor } from '@capacitor/core'

interface ErrorBoundaryProps {
    children: React.ReactNode
    name?: string
}

interface ErrorBoundaryState {
    hasError: boolean
    error?: Error
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props)
        this.state = { hasError: false }
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error(`ErrorBoundary caught an error in ${this.props.name || 'Component'}:`, error, errorInfo)
        
        // Hide splash screen on error to prevent hanging
        if (Capacitor.isNativePlatform()) {
            SplashScreen.hide({ fadeOutDuration: 300 }).catch(() => {
                // Ignore splash screen errors
            })
        }
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: undefined })
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-4 border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 rounded-lg text-red-600 dark:text-red-400 flex items-center gap-2 text-sm my-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>Failed to load {this.props.name || 'component'}.</span>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 text-red-600 dark:text-red-400 underline hover:text-red-800 dark:hover:text-red-300 ml-auto flex items-center gap-1"
                        onClick={this.handleRetry}
                    >
                        <RefreshCw className="h-3 w-3" />
                        Retry
                    </Button>
                </div>
            )
        }

        return this.props.children
    }
}
