import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function ProtectedPage() {
  const supabase = await createClient()

  // Check if user is logged in
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect('/auth/login')
  }

  return (
    <div className="flex-1 w-full flex flex-col gap-12 items-center justify-center p-10">
      <div className="w-full max-w-2xl text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome Back!</h1>
        <p className="text-xl text-gray-500 mb-8">
          You are logged in as <span className="font-bold text-foreground">{user.email}</span>
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Card 1: Go to Notes */}
          <Link
            href="/notes"
            className="p-6 border rounded-lg hover:bg-accent transition-colors text-left"
          >
            <h3 className="font-bold text-lg mb-2">📝 My Notes</h3>
            <p className="text-sm text-gray-500">View and manage your database data.</p>
          </Link>

          {/* Card 2: Placeholder for future features */}
          <div className="p-6 border rounded-lg border-dashed text-left opacity-60">
            <h3 className="font-bold text-lg mb-2">🚀 New Feature</h3>
            <p className="text-sm text-gray-500">Coming soon...</p>
          </div>
        </div>
      </div>
    </div>
  )
}