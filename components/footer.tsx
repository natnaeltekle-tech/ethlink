import Link from 'next/link'
import { Handshake } from 'lucide-react'

export function Footer() {
    return (
        <footer className="border-t border-border py-12 bg-card select-none">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Brand Section */}
                    <div className="space-y-4">
                        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary">
                            <Handshake className="h-6 w-6" />
                            Eth-Links
                        </Link>
                        <p className="text-sm text-muted-foreground max-w-xs">
                            Connecting you with the best service providers in Ethiopia. Experience premium service booking.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-foreground">Quick Links</h3>
                        <nav className="flex flex-col space-y-2 text-sm">
                            <Link href="/services" className="text-muted-foreground hover:text-primary transition-colors">
                                Services
                            </Link>
                            <Link href="/about" className="text-muted-foreground hover:text-primary transition-colors">
                                About Us
                            </Link>
                            <Link href="/contact" className="text-muted-foreground hover:text-primary transition-colors">
                                Contact
                            </Link>
                        </nav>
                    </div>

                    {/* Legal Links */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-foreground">Legal</h3>
                        <nav className="flex flex-col space-y-2 text-sm">
                            <Link href="/privacy" className="text-muted-foreground hover:text-primary transition-colors">
                                Privacy Policy
                            </Link>
                            <Link href="/terms" className="text-muted-foreground hover:text-primary transition-colors">
                                Terms of Service
                            </Link>
                        </nav>
                    </div>
                </div>

                {/* Copyright */}
                <div className="mt-8 pt-8 border-t border-border/50 text-center text-sm text-muted-foreground">
                    <p>&copy; 2024 Eth-Links. All rights reserved.</p>
                </div>
            </div>
        </footer>
    )
}
