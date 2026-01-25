import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'

export default function Index() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 flex flex-col items-center justify-center p-10 text-center space-y-8">
        <h1 className="text-4xl font-bold text-primary">Eth-Links is Live 🚀</h1>
        <p className="text-muted-foreground max-w-md">Your AI-Powered Service Marketplace.</p>

        <div className="flex gap-4">
          <Link href="/services">
            <Button size="lg">Browse Services</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline" size="lg">My Dashboard</Button>
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  )
}