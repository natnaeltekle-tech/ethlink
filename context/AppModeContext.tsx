'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { MODE_HOME, MODE_STORAGE_KEY, modeForPath, type AppMode } from '@/lib/app-mode'

type AppModeValue = {
    mode: AppMode
    isProvider: boolean
    /** Switch workspace. Navigates to that workspace's home unless `navigate: false`. */
    setMode: (mode: AppMode, opts?: { navigate?: boolean }) => void
    toggleMode: () => void
}

const AppModeContext = createContext<AppModeValue | null>(null)

const readStored = (): AppMode | null => {
    try {
        const v = localStorage.getItem(MODE_STORAGE_KEY)
        return v === 'provider' || v === 'customer' ? v : null
    } catch { return null }
}
const store = (m: AppMode) => { try { localStorage.setItem(MODE_STORAGE_KEY, m) } catch { /* storage unavailable */ } }

export function AppModeProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const pathname = usePathname()
    // Server and first client render agree: the mode comes from the route
    // (shared routes default to customer). localStorage is read after mount.
    const [mode, setModeState] = useState<AppMode>(() => modeForPath(pathname) ?? 'customer')
    const restored = useRef(false)

    // Route guard: workspace routes always show their own workspace.
    useEffect(() => {
        const routeMode = modeForPath(pathname)
        if (routeMode) {
            setModeState(routeMode)
            store(routeMode)
        } else {
            const stored = readStored()
            if (stored) setModeState(stored)
        }
    }, [pathname])

    // Reopening the app on Home restores the last workspace (once per launch).
    useEffect(() => {
        if (restored.current) return
        restored.current = true
        if ((pathname === '/' || pathname === '/home') && readStored() === 'provider') {
            router.replace(MODE_HOME.provider)
        }
    }, [pathname, router])

    const setMode = useCallback((next: AppMode, opts?: { navigate?: boolean }) => {
        setModeState(next)
        store(next)
        if (opts?.navigate !== false) router.push(MODE_HOME[next])
    }, [router])

    const value = useMemo<AppModeValue>(() => ({
        mode,
        isProvider: mode === 'provider',
        setMode,
        toggleMode: () => setMode(mode === 'provider' ? 'customer' : 'provider'),
    }), [mode, setMode])

    return <AppModeContext.Provider value={value}>{children}</AppModeContext.Provider>
}

export function useAppMode(): AppModeValue {
    const ctx = useContext(AppModeContext)
    if (!ctx) throw new Error('useAppMode must be used inside <AppModeProvider>')
    return ctx
}
