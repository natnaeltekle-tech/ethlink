import { redirect } from 'next/navigation'

/** Explore = the services catalogue (search, filters, map). */
export default async function ExplorePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    const q = new URLSearchParams()
    for (const [k, v] of Object.entries(await searchParams)) {
        for (const value of Array.isArray(v) ? v : v ? [v] : []) q.append(k, value)
    }
    redirect(q.size ? `/services?${q}` : '/services')
}
