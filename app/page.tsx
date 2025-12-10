import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { SearchBar } from '@/components/search-bar'
import { Search, Handshake, CalendarCheck, CheckCircle2, User } from 'lucide-react'
import { getServicesByCategory, getLatestServices } from '@/lib/actions'
import { ServiceCard } from '@/components/service-card'
import { CategoryCarousel } from '@/components/category-carousel'

export default async function Index() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl text-blue-600">
              <Handshake className="h-6 w-6" />
              EthLink
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
              <Link href="/services" className="hover:text-foreground transition-colors">Services</Link>
              <Link href="/about" className="hover:text-foreground transition-colors">About Us</Link>
              <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
            </nav>
          </div>

          <div className="flex items-center gap-4 flex-1 max-w-md ml-auto md:ml-0">
            <div className="relative flex-1 hidden sm:block">
              <SearchBar
                placeholder="Search services..."
                className="w-full"
                inputClassName="bg-muted/50 border-none focus-visible:ring-1"
              />
            </div>
            {user ? (
              <Link href="/dashboard">
                <Button className="gap-2">
                  <User className="h-4 w-4" />
                  Profile
                </Button>
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/auth/login">
                  <Button variant="ghost">Log In</Button>
                </Link>
                <Link href="/auth/sign-up">
                  <Button className="bg-blue-600 hover:bg-blue-700">Sign Up</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-12 md:py-24 lg:py-32 bg-gradient-to-b from-white to-blue-50/30">
          <div className="container mx-auto px-4 flex flex-col items-center text-center">
            <div className="space-y-6 max-w-3xl">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900">
                EthLink
              </h1>
              <p className="text-lg text-slate-600 max-w-lg mx-auto">
                Connecting you with the best service providers in Ethiopia.
              </p>
              <div className="mt-8">
                <Link href="/services">
                  <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-6">
                    Explore Services
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Category Navigation */}
        <section className="py-8 md:py-12">
          <div className="container mx-auto px-4">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Featured Services</h2>
              <p className="text-muted-foreground">Explore top-rated services trusted by our community.</p>
            </div>

            <CategoryCarousel />
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 md:py-24 bg-slate-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">Simple Steps to Success</h2>
              <p className="text-muted-foreground">We make finding and booking services effortless.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 text-center">
              {[
                { icon: Search, title: "1. Find Your Service", desc: "Use our smart search or AI recommendations to find the perfect service provider for your needs." },
                { icon: CalendarCheck, title: "2. Book with Confidence", desc: "Select your service, choose a date, and pay securely through our platform. All providers are verified." },
                { icon: CheckCircle2, title: "3. Get It Done", desc: "Your chosen professional arrives and completes the job. Enjoy peace of mind with our satisfaction guarantee." },
              ].map((step, i) => (
                <div key={i} className="flex flex-col items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mb-4">
                    <step.icon className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold">{step.title}</h3>
                  <p className="text-muted-foreground max-w-sm mx-auto leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8 bg-slate-50">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; 2024 EthLink. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}



