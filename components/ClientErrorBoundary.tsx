'use client'

import React from 'react'
import { Capacitor } from '@capacitor/core'

interface ClientErrorBoundaryProps {
  children: React.ReactNode
}

interface ClientErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export class ClientErrorBoundary extends React.Component<
  ClientErrorBoundaryProps,
  ClientErrorBoundaryState
> {
  constructor(props: ClientErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ClientErrorBoundary caught an error:', error)
    console.error('Error info:', errorInfo)

    // Best-effort splash hide so a crash is not stuck under splash
    if (Capacitor.isNativePlatform()) {
      import('@capacitor/splash-screen')
        .then(({ SplashScreen }) =>
          SplashScreen.hide({ fadeOutDuration: 200 }).catch(() => {})
        )
        .catch(() => {})
    }
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="fixed inset-0 flex flex-col items-center justify-center p-6 z-[9999]"
          style={{ backgroundColor: '#0B0C15' }}
        >
          <div className="text-center max-w-md space-y-4">
            <h1 className="text-2xl font-bold text-white">Something went wrong</h1>
            <p className="text-white/60 text-sm">
              The app hit an unexpected error. Reload to continue.
            </p>
            {this.state.error?.message && (
              <p className="text-red-400 text-xs font-mono break-words bg-red-950/40 p-3 rounded-lg">
                {this.state.error.message}
              </p>
            )}
            <button
              onClick={this.handleReload}
              className="px-8 py-3 bg-[#F5C518] text-black font-semibold rounded-lg"
            >
              Reload App
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
