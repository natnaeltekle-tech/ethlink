/** Only same-site paths, so the OAuth `next` can't send users to another site. */
export function safeNextPath(next: string | null | undefined, fallback = '/'): string {
    if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback
    return next.slice(0, 500)
}
