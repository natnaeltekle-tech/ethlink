'use client'

import { useEffect, useRef } from 'react'

/**
 * Android hardware Back: open panels/sheets/chats close first, before the page
 * navigates back. Each open panel registers a handler; the most recently opened
 * one runs first.
 */
type Handler = () => void
const stack: { id: number; run: () => void }[] = []
let nextId = 1

/** Close the top-most open panel. Returns false when nothing was open. */
export function runBackHandler(): boolean {
    const top = stack[stack.length - 1]
    if (!top) return false
    top.run()
    return true
}

/** Register `onBack` while `enabled` (default: while the component is mounted). */
export function useBackHandler(onBack: Handler | undefined, enabled = true) {
    const ref = useRef(onBack)
    ref.current = onBack
    useEffect(() => {
        if (!enabled || !ref.current) return
        const id = nextId++
        stack.push({ id, run: () => ref.current?.() })
        return () => {
            const i = stack.findIndex((h) => h.id === id)
            if (i >= 0) stack.splice(i, 1)
        }
    }, [enabled])
}
