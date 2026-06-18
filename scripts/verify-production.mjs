#!/usr/bin/env node
/**
 * One-command production readiness verification.
 * Usage: npm run verify:prod
 */
import { execSync } from 'node:child_process'

const steps: Array<{ name: string; command: string }> = [
    { name: 'TypeScript', command: 'npx tsc --noEmit' },
    { name: 'ESLint', command: 'npm run lint' },
    { name: 'Production build', command: 'npm run build' },
]

let failed = false

for (const step of steps) {
    process.stdout.write(`\n▶ ${step.name}...\n`)
    try {
        execSync(step.command, { stdio: 'inherit', env: process.env })
        process.stdout.write(`✓ ${step.name} passed\n`)
    } catch {
        process.stderr.write(`✗ ${step.name} failed\n`)
        failed = true
    }
}

if (failed) {
    process.exit(1)
}

process.stdout.write('\n✓ All verification steps passed\n')
