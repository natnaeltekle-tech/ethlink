'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const LOG_KEY = 'eth-links-logout-debug'
const TRACE_DURATION_MS = 2000
const TRACE_INTERVAL_MS = 100

interface LogEntry {
    ts: number
    route: string | null
    isAuthenticated: boolean
    userId: string | null
    event: string
}

/**
 * useLogoutDebug — monitors auth state and route changes for 2 seconds
 * after logout trigger. Logs are persisted to sessionStorage so they
 * survive page refreshes.
 *
 * Usage: call `startTrace()` right before calling signOut.
 * After logout, check sessionStorage key "eth-links-logout-debug".
 */
export function useLogoutDebug() {
    const pathname = usePathname()
    const traceRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const logsRef = useRef<LogEntry[]>([])

    const appendLog = (entry: LogEntry) => {
        logsRef.current.push(entry)
        try {
            sessionStorage.setItem(LOG_KEY, JSON.stringify(logsRef.current))
        } catch {
            // sessionStorage may be full or unavailable
        }
    }

    const startTrace = () => {
        // Clear previous logs
        logsRef.current = []
        try { sessionStorage.removeItem(LOG_KEY) } catch { /* ignore */ }

        appendLog({
            ts: Date.now(),
            route: pathname,
            isAuthenticated: true, // we're about to log out
            userId: null,
            event: 'LOGOUT_TRIGGERED',
        })

        const supabase = createClient()
        let elapsed = 0

        traceRef.current = setInterval(async () => {
            elapsed += TRACE_INTERVAL_MS

            try {
                const { data: { user } } = await supabase.auth.getUser()
                appendLog({
                    ts: Date.now(),
                    route: window.location.pathname,
                    isAuthenticated: !!user,
                    userId: user?.id ?? null,
                    event: `TRACE_${elapsed}ms`,
                })
            } catch (err: any) {
                appendLog({
                    ts: Date.now(),
                    route: window.location.pathname,
                    isAuthenticated: false,
                    userId: null,
                    event: `TRACE_ERROR_${elapsed}ms: ${err?.message}`,
                })
            }

            if (elapsed >= TRACE_DURATION_MS && traceRef.current) {
                clearInterval(traceRef.current)
                traceRef.current = null
                appendLog({
                    ts: Date.now(),
                    route: window.location.pathname,
                    isAuthenticated: false,
                    userId: null,
                    event: 'TRACE_COMPLETE',
                })
            }
        }, TRACE_INTERVAL_MS)
    }

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (traceRef.current) {
                clearInterval(traceRef.current)
            }
        }
    }, [])

    return { startTrace }
}

/**
 * Read the persisted debug logs from sessionStorage.
 * Call this from browser console: JSON.parse(sessionStorage.getItem('eth-links-logout-debug'))
 */
export function getLogoutDebugLogs(): LogEntry[] {
    try {
        const raw = sessionStorage.getItem(LOG_KEY)
        return raw ? JSON.parse(raw) : []
    } catch {
        return []
    }
}
