import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function PrivacyPage() {
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
                    <h1 className="text-4xl font-bold mb-6 text-foreground">Privacy Policy</h1>

                    <div className="prose prose-invert max-w-none">
                        <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                            EthLink respects your privacy. We collect your Name, Email, and Phone Number solely for the purpose of connecting you with Service Providers.
                        </p>

                        <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                            We do not sell your data. All payments are processed securely via Chapa.
                        </p>

                        <div className="mt-8 p-6 bg-secondary/50 rounded-lg border border-border/50">
                            <h2 className="text-xl font-semibold mb-3 text-foreground">Data We Collect</h2>
                            <ul className="list-disc list-inside text-muted-foreground space-y-2">
                                <li>Name</li>
                                <li>Email Address</li>
                                <li>Phone Number</li>
                            </ul>
                        </div>

                        <div className="mt-6 p-6 bg-secondary/50 rounded-lg border border-border/50">
                            <h2 className="text-xl font-semibold mb-3 text-foreground">How We Use Your Data</h2>
                            <p className="text-muted-foreground">
                                Your information is used exclusively to facilitate connections between you and service providers on our platform. We ensure secure payment processing through Chapa.
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
