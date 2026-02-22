import Link from 'next/link'
import { Handshake, User, LayoutDashboard, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import { SearchBar } from '@/components/search-bar'

interface NavbarProps {
    hideSearch?: boolean
}

export async function Navbar({ hideSearch = false }: NavbarProps) {
    const supabase = await createClient()
    let user = null
    try {
        const { data } = await supabase.auth.getUser()
        user = data.user
    } catch {
        // Expired/corrupt session — render as guest, never crash
    }

    return (
        <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50 border-border/50 select-none">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
                <div className="flex items-center gap-8">
                    <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary cursor-pointer">
                        <Handshake className="h-6 w-6" />
                        Eth-Links
                    </Link>
                    <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
                        <Link href="/services" className="hover:text-primary transition-colors">Services</Link>
                        <Link href="/about" className="hover:text-primary transition-colors">About Us</Link>
                        <Link href="/contact" className="hover:text-primary transition-colors">Contact</Link>
                    </nav>
                </div>

                <div className="flex items-center gap-4 flex-1 max-w-md ml-auto justify-end">
                    {!hideSearch && (
                        <div className="relative flex-1 hidden sm:block">
                            <SearchBar
                                placeholder="Search services..."
                                className="w-full"
                                inputClassName="bg-secondary/50 border-border focus-visible:ring-primary focus-visible:ring-1"
                            />
                        </div>
                    )}

                    {user ? (
                        <div className="flex items-center gap-2">
                            <Link href="/dashboard">
                                <Button size="sm" className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                                    <LayoutDashboard className="h-4 w-4" />
                                    <span className="hidden sm:inline">Dashboard</span>
                                </Button>
                            </Link>
                            {/* Optionally show user email or avatar */}
                            <span className="hidden md:inline text-xs text-muted-foreground ml-2 max-w-[120px] truncate">{user?.email || user?.user_metadata?.email || 'User'}</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Link href="/auth/login">
                                <Button variant="ghost" size="sm" className="hover:text-primary hover:bg-secondary">Log In</Button>
                            </Link>
                            <Link href="/auth/sign-up">
                                <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">Sign Up</Button>
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </header>
    )
}
