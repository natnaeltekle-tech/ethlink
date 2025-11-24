export const dynamic = "force-dynamic";

import Link from 'next/link'

export default function Index() {
  // We removed the server-side auth check here to prevent build errors.
  // The /protected page handles the redirection logic automatically.

  return (
    <div className="flex-1 w-full flex flex-col gap-20 items-center justify-center p-10">
      
      {/* Hero Section */}
      <div className="flex flex-col gap-4 items-center text-center">
        <h1 className="text-5xl font-bold">Market AI v3</h1>
        <p className="text-xl text-gray-500 max-w-lg">
          The smartest way to manage your notes and market data using Supabase.
        </p>
      </div>

      {/* Action Button */}
      <div className="flex gap-4">
        {/* We point straight to /protected. 
            If logged in -> They see Dashboard.
            If logged out -> They get redirected to Login automatically. */}
        <Link
          href="/protected"
          className="py-3 px-6 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-semibold"
        >
          Go to Dashboard
        </Link>
      </div>

      <footer className="w-full border-t border-t-foreground/10 p-8 flex justify-center text-center text-xs">
        <p>
          Powered by{" "}
          <a
            href="https://supabase.com"
            target="_blank"
            className="font-bold hover:underline"
            rel="noreferrer"
          >
            Supabase
          </a>
        </p>
      </footer>
    </div>
  )
}