'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

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
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-4 border border-red-200 bg-red-50 rounded-lg text-red-600 flex items-center gap-2 text-sm my-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>Failed to load {this.props.name || 'component'}.</span>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 text-red-600 underline hover:text-red-800 ml-auto"
                        onClick={() => this.setState({ hasError: false })}
                    >
                        Retry
                    </Button>
                </div>
            )
        }

        return this.props.children
    }
}
