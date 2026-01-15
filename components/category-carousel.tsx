'use client'

import * as React from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'

const categories = [
    {
        label: "Hotels",
        sub: "Hospitality",
        href: "/services?category=Hospitality",
        image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800"
    },
    {
        label: "Transportation",
        sub: "Transport",
        href: "/services?category=Transport",
        image: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800"
    },
    {
        label: "Cleaning",
        sub: "Home Services",
        href: "/services?category=Home Services",
        image: "https://images.unsplash.com/photo-1581578731117-104f2a9d4547?w=800"
    },
    {
        label: "Tech",
        sub: "IT/Dev",
        href: "/services?category=Tech",
        image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800"
    },
    {
        label: "Events",
        sub: "Party/Wedding",
        href: "/services?category=Events",
        image: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800"
    },
    {
        label: "Health",
        sub: "Medical",
        href: "/services?category=Health",
        image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800"
    },
    {
        label: "Add Listing",
        sub: "Join Us",
        href: "/services/new",
        isAction: true,
        image: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800"
    },
]

export function CategoryCarousel() {
    const scrollContainerRef = React.useRef<HTMLDivElement>(null)

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const scrollAmount = 300 // Approx width of card
            scrollContainerRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            })
        }
    }

    return (
        <div className="relative group">
            {/* Left Button */}
            <Button
                variant="outline"
                size="icon"
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 rounded-full h-12 w-12 shadow-lg bg-background/80 backdrop-blur-sm border-border hidden md:flex opacity-0 group-hover:opacity-100 transition-opacity hover:bg-secondary hover:text-primary"
                onClick={() => scroll('left')}
            >
                <ChevronLeft className="h-6 w-6" />
                <span className="sr-only">Scroll Left</span>
            </Button>

            {/* Scroll Container */}
            <div
                ref={scrollContainerRef}
                className="flex gap-6 overflow-x-auto pb-6 snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden -mx-4 px-4"
            >
                {categories.map((cat, i) => (
                    <Link
                        key={i}
                        href={cat.href}
                        className="flex-none w-[200px] md:w-[240px] snap-center"
                    >
                        <Card className={`h-full overflow-hidden hover:shadow-xl transition-all cursor-pointer border-0 group/card ${cat.isAction ? 'ring-2 ring-primary/50' : ''}`}>
                            <div className="relative h-[280px] overflow-hidden">
                                {/* Background Image */}
                                <div
                                    className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover/card:scale-110"
                                    style={{ backgroundImage: `url(${cat.image})` }}
                                />

                                {/* Dark Overlay */}
                                <div className="absolute inset-0 bg-black/40 group-hover/card:bg-black/30 transition-colors" />

                                {/* Content */}
                                <div className="relative h-full flex flex-col items-center justify-center text-center p-6">
                                    {cat.isAction && (
                                        <div className="mb-3 p-3 rounded-full bg-primary/20 backdrop-blur-sm">
                                            <Plus className="h-8 w-8 text-white" />
                                        </div>
                                    )}
                                    <h3 className="font-bold text-2xl text-white mb-2 drop-shadow-lg">
                                        {cat.label}
                                    </h3>
                                    <p className="text-sm text-white/90 font-medium drop-shadow-md">
                                        {cat.sub}
                                    </p>
                                </div>
                            </div>
                        </Card>
                    </Link>
                ))}
            </div>

            {/* Right Button */}
            <Button
                variant="outline"
                size="icon"
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 rounded-full h-12 w-12 shadow-lg bg-background/80 backdrop-blur-sm border-border hidden md:flex opacity-0 group-hover:opacity-100 transition-opacity hover:bg-secondary hover:text-primary"
                onClick={() => scroll('right')}
            >
                <ChevronRight className="h-6 w-6" />
                <span className="sr-only">Scroll Right</span>
            </Button>
        </div>
    )
}
