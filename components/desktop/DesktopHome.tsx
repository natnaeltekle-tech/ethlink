import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Search, CalendarCheck, CheckCircle, ArrowRight } from 'lucide-react'
import { CategoryCarousel } from '@/components/category-carousel'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'

export default function DesktopHome({ services = [] }: { services?: any[] }) {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 md:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-secondary/30 -z-10" />
          <div className="container px-4 mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-yellow-200 to-yellow-500">
                Eth-Links
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Connecting you with the best service providers for all your needs. Fast, reliable, and secure.
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/services">
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-8 h-12 text-base">
                  Explore Services
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Featured Categories */}
        <section className="py-16 container px-4 mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold">Featured Services</h2>
            <Link href="/services">
              <Button variant="ghost" className="gap-2 text-primary hover:text-primary/80">
                View All Services <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <CategoryCarousel />
        </section>

        {/* How It Works (Steps) */}
        <section className="py-16 bg-secondary/20">
          <div className="container px-4 mx-auto">
            <h2 className="text-2xl font-bold text-center mb-12">Simple Steps to Success</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Step 1: Find */}
              <div className="bg-card border border-border/50 p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
                  <Search className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold mb-2">1. Find</h3>
                <p className="text-muted-foreground">
                  Browse through our extensive list of verified service providers.
                </p>
              </div>

              {/* Step 2: Book */}
              <div className="bg-card border border-border/50 p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
                  <CalendarCheck className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold mb-2">2. Book</h3>
                <p className="text-muted-foreground">
                  Choose a time that works for you and book instantly.
                </p>
              </div>

              {/* Step 3: Done */}
              <div className="bg-card border border-border/50 p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold mb-2">3. Done</h3>
                <p className="text-muted-foreground">
                  Get your service done professionally and securely.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
