import { readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'

const shell = readFileSync('mobile-shell/offline.html', 'utf8')
const site = readFileSync('public/offline.html', 'utf8')

describe('offline page', () => {
    it('APK copy (Capacitor errorPath) and site copy stay identical', () => {
        expect(site).toBe(shell)
    })
    it('is self-contained: no external scripts, styles or fonts', () => {
        expect(shell).not.toMatch(/<script[^>]+src=|<link[^>]+stylesheet|@import|fonts\.googleapis/)
    })
    it('shows the branded message and a retry button pointing at the live app', () => {
        expect(shell).toContain('No internet connection')
        expect(shell).toContain('Tap to Retry')
        const url = shell.match(/APP_URL = '([^']+)'/)?.[1]
        const config = readFileSync('capacitor.config.ts', 'utf8').match(/url: '([^']+)'/)?.[1]
        expect(url?.replace(/\/$/, '')).toBe(config)
    })
})
