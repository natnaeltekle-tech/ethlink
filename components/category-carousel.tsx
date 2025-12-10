'use client'

import * as React from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    Building2,
    Bus,
    Car,
    Plus,
    Briefcase,
    PartyPopper,
    Stethoscope,
    Sparkles,
    ChevronLeft,
    ChevronRight
} from 'lucide-react'

const categories = [
    { label: "Hotels", sub: "Hospitality", icon: Building2, href: "/services?category=Hospitality" },
    { label: "Transportation", sub: "Transport", icon: Car, href: "/services?category=Transport" },
    { label: "Cleaning", sub: "Home Services", icon: Sparkles, href: "/services?category=Home Services" },
    { label: "Tech", sub: "IT/Dev", icon: Briefcase, href: "/services?category=Tech" },
    { label: "Events", sub: "Party/Wedding", icon: PartyPopper, href: "/services?category=Events" },
    { label: "Health", sub: "Medical", icon: Stethoscope, href: "/services?category=Health" },
    { label: "Add Listing", sub: "Join Us", icon: Plus, href: "/services/new", isAction: true },
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
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 rounded-full h-12 w-12 shadow-lg bg-background/80 backdrop-blur-sm border-slate-200 hidden md:flex opacity-0 group-hover:opacity-100 transition-opacity"
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
                        <Card className={`h-full hover:shadow-lg transition-all cursor-pointer border-2 group/card ${cat.isAction ? 'border-dashed border-blue-200 bg-blue-50/50' : 'border-transparent bg-white hover:border-blue-100'}`}>
                            <CardContent className="p-6 flex flex-col items-center text-center gap-4 h-full justify-center">
                                <div className={`p-4 rounded-full ${cat.isAction ? 'bg-blue-100/50 text-blue-600' : 'bg-slate-100 text-slate-600 group-hover/card:bg-blue-50 group-hover/card:text-blue-600'} transition-colors`}>
                                    <cat.icon className="h-8 w-8" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg">{cat.label}</h3>
                                    <p className="text-xs text-muted-foreground mt-1">{cat.sub}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>

            {/* Right Button */}
            <Button
                variant="outline"
                size="icon"
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 rounded-full h-12 w-12 shadow-lg bg-background/80 backdrop-blur-sm border-slate-200 hidden md:flex opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => scroll('right')}
            >
                <ChevronRight className="h-6 w-6" />
                <span className="sr-only">Scroll Right</span>
            </Button>
        </div>
    )
}
