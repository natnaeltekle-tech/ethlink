/**
 * Realtime channel name that is unique per subscriber.
 *
 * The browser Supabase client is shared, and `supabase.channel(name)` returns
 * the already-subscribed channel when the name is reused. Two components with
 * the same name (e.g. the top navbar and the bottom tab bar badge) then crash
 * with "cannot add `postgres_changes` callbacks … after `subscribe()`".
 */
export const uniqueChannel = (name: string) =>
    `${name}:${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`
