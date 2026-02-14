import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, MessageCircle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function ListingDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: listing } = await supabase
        .from("services")
        .select("*")
        .eq("id", id)
        .single();

    if (!listing) {
        notFound();
    }

    return (
        <div className="flex flex-col min-h-screen bg-muted/40">
            <header className="flex h-14 items-center gap-4 border-b bg-background px-6 lg:h-[60px]">
                <Link href="/listings" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-4 w-4" /> Back to Listings
                </Link>
            </header>
            <main className="flex-1 p-4 md:p-6 flex justify-center">
                <div className="grid gap-6 lg:grid-cols-2 max-w-6xl w-full">
                    {/* Image Section */}
                    <div className="bg-background rounded-lg border overflow-hidden flex items-center justify-center min-h-[400px]">
                        {listing.image_url ? (
                            <img
                                src={listing.image_url}
                                alt={listing.title}
                                className="w-full h-full object-contain max-h-[600px]"
                            />
                        ) : (
                            <div className="text-muted-foreground">No Image Available</div>
                        )}
                    </div>

                    {/* Details Section */}
                    <div className="flex flex-col gap-6">
                        <div>
                            <h1 className="text-3xl font-bold mb-2">{listing.title}</h1>
                            <p className="text-2xl font-bold text-green-600">
                                {new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(listing.price)}
                            </p>
                        </div>

                        <div className="flex gap-2">
                            <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                                {listing.category || "General"}
                            </span>
                            <span className="text-sm text-muted-foreground self-center">
                                Listed on {new Date(listing.created_at).toLocaleDateString()}
                            </span>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>Description</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="whitespace-pre-wrap text-muted-foreground">
                                    {listing.description || "No description provided."}
                                </p>
                            </CardContent>
                        </Card>

                        <div className="mt-auto">
                            <Button size="lg" className="w-full md:w-auto">
                                <MessageCircle className="mr-2 h-4 w-4" /> Message Seller
                            </Button>
                            <p className="text-xs text-muted-foreground mt-2 text-center md:text-left">
                                Start a conversation to negotiate or ask questions.
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
