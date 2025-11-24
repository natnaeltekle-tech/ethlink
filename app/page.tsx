import Link from 'next/link'

export default function Index() {
  return (
    <div className="flex-1 w-full flex flex-col gap-20 items-center justify-center p-10">
      
      {/* Hero Section */}
      <div className="flex flex-col gap-4 items-center text-center">
        <h1 className="text-5xl font-bold">Market AI v3</h1>
        <p className="text-xl text-gray-500 max-w-lg">
          The smartest way to manage your notes and market data.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        {/* We simply link to the Protected page. 
            The middleware will handle the login check automatically. */}
        <Link
          href="/protected"
          className="py-3 px-6 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-semibold"
        >
          Go to Dashboard
        </Link>
        
        <Link
          href="/sign-in"
          className="py-3 px-6 bg-gray-800 text-white rounded-md hover:bg-gray-900 transition-colors font-semibold"
        >
          Login
        </Link>
      </div>

      <footer className="w-full border-t border-t-foreground/10 p-8 flex justify-center text-center text-xs">
        <p>
          Powered by Supabase
        </p>
      </footer>
    </div>
  )
}