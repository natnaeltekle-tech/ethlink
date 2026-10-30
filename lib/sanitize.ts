/**
 * Lightweight text sanitization for user-controlled strings.
 * Zod still does structural validation — this strips control chars
 * and common injection delimiters before prompts / free-text storage.
 */

/** Remove ASCII control characters except tab/newline. */
export function stripControlChars(input: string): string {
  return input.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
}

/**
 * Sanitize free-text for AI prompts and chat.
 * Strips control chars and characters often used in prompt/code injection.
 */
export function sanitizeUserText(input: string, maxLen = 500): string {
  return stripControlChars(input)
    .replace(/[`'"{}<>\\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

/** Allow only http(s) or same-origin relative paths for markdown links. */
export function isSafeHref(href: string | undefined | null): boolean {
  if (!href) return false;
  const h = href.trim();
  if (h.startsWith('/') && !h.startsWith('//')) return true;
  try {
    const u = new URL(h);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}
