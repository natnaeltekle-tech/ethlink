import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-12 max-w-4xl">
                <Link href="/">
                    <Button variant="ghost" className="mb-8 gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Home
                    </Button>
                </Link>

                <div className="bg-card border border-border rounded-xl p-8 md:p-12 shadow-lg">
                    <h1 className="text-4xl font-bold mb-6 text-foreground">Terms of Service</h1>

                    <div className="prose prose-invert max-w-none">
                        <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                            By using EthLink, you agree to honor your bookings. EthLink acts as a marketplace. We are not responsible for the quality of service provided by third-party vendors.
                        </p>

                        <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                            Cancellations must be made 24 hours in advance.
                        </p>

                        <div className="mt-8 p-6 bg-secondary/50 rounded-lg border border-border/50">
                            <h2 className="text-xl font-semibold mb-3 text-foreground">Your Responsibilities</h2>
                            <ul className="list-disc list-inside text-muted-foreground space-y-2">
                                <li>Honor all confirmed bookings</li>
                                <li>Provide accurate contact information</li>
                                <li>Cancel bookings at least 24 hours in advance</li>
                                <li>Treat service providers with respect</li>
                            </ul>
                        </div>

                        <div className="mt-6 p-6 bg-secondary/50 rounded-lg border border-border/50">
                            <h2 className="text-xl font-semibold mb-3 text-foreground">Platform Role</h2>
                            <p className="text-muted-foreground mb-3">
                                EthLink operates as a marketplace connecting customers with independent service providers. We facilitate the connection but do not directly provide services.
                            </p>
                            <p className="text-muted-foreground">
                                We are not responsible for the quality, safety, or legality of services provided by third-party vendors. All disputes should be resolved directly with the service provider.
                            </p>
                        </div>

                        <div className="mt-6 p-6 bg-secondary/50 rounded-lg border border-border/50">
                            <h2 className="text-xl font-semibold mb-3 text-foreground">Cancellation Policy</h2>
                            <p className="text-muted-foreground">
                                All cancellations must be made at least 24 hours before the scheduled service time. Late cancellations may result in penalties or loss of payment.
                            </p>
                        </div>

                        <p className="text-sm text-muted-foreground mt-8">
                            Last updated: January 2026
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
