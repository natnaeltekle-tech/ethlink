import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Search, Handshake, CalendarCheck, User } from 'lucide-react'
import { getServicesByCategory, getLatestServices } from '@/lib/actions'
import { ServiceCard } from '@/components/service/ServiceCard'
import { CategoryCarousel } from '@/components/category-carousel'
import { Navbar } from '@/components/navbar'

export default async function Index() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      {/* Header */}
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-12 md:py-24 lg:py-32 relative overflow-hidden">
          {/* Background decorative elements */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background -z-10"></div>

          <div className="container mx-auto px-4 flex flex-col items-center text-center">
            <div className="space-y-6 max-w-3xl">
              <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold tracking-tight text-gradient-gold pb-2">
                Eth-Links
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-lg mx-auto">
                Connecting you with the best service providers in Ethiopia. Experience premium service booking.
              </p>
              <div className="mt-8">
                <Link href="/services">
                  <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 text-lg px-8 py-6 rounded-full shadow-[0_0_20px_rgba(245,197,24,0.3)]">
                    Explore Services
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Category Navigation */}
        <section className="py-8 md:py-12 border-y border-border/50 bg-card/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold tracking-tight text-foreground mb-2">Featured Services</h2>
              <p className="text-muted-foreground">Explore top-rated services trusted by our community.</p>
            </div>

            <CategoryCarousel />

            <div className="flex justify-center mt-12">
              <Link href="/services">
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 text-lg px-8 py-6 rounded-full shadow-[0_0_20px_rgba(245,197,24,0.3)]">
                  View All Services
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4 text-foreground">Simple Steps to Success</h2>
              <p className="text-muted-foreground">We make finding and booking services effortless.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 text-center">
              {[
                { icon: Search, title: "1. Find Your Service", desc: "Use our smart search or AI recommendations to find the perfect service provider." },
                { icon: CalendarCheck, title: "2. Book with Confidence", desc: "Select your service, choose a date, and pay securely. All providers are verified." },
                { icon: Handshake, title: "3. Get It Done", desc: "Your chosen professional arrives and completes the job. Enjoy peace of mind." },
              ].map((step, i) => (
                <div key={i} className="flex flex-col items-center gap-4 p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-colors group">
                  <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
                    <step.icon className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">{step.title}</h3>
                  <p className="text-muted-foreground max-w-sm mx-auto leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 bg-card">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; 2024 Eth-Links. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}



