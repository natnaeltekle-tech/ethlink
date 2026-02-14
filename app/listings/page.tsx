import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

import { searchParamsSchema } from "@/lib/validations";

export default async function ListingsPage({ searchParams }: { searchParams: Promise<{ search?: string, category?: string }> }) {
    const resolvedSearchParams = await searchParams;
    const { search, category } = searchParamsSchema.parse(resolvedSearchParams);
    const supabase = await createClient();

    let query = supabase
        .from("services")
        .select("*")
        .order("created_at", { ascending: false });

    if (search) {
        query = query.ilike("title", `%${search}%`);
    }

    if (category) {
        query = query.eq("category", category);
    }

    const { data: listings } = await query;

    return (
        <div className="flex flex-col min-h-screen bg-muted/40">
            <header className="flex h-14 items-center gap-4 border-b bg-background px-6 lg:h-[60px]">
                <Link href="/dashboard" className="font-bold text-lg">
                    EthLink
                </Link>
                <div className="ml-auto">
                    <Link href="/listings/new">
                        <Button size="sm">
                            <Plus className="mr-2 h-4 w-4" /> Sell Item
                        </Button>
                    </Link>
                </div>
            </header>
            <main className="flex-1 p-4 md:p-6">
                <h1 className="text-2xl font-bold mb-6">
                    {search ? `Results for "${search}"` : category ? `${category} Listings` : "Marketplace Listings"}
                </h1>

                {listings && listings.length > 0 ? (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {listings.map((listing) => (
                            <Link key={listing.id} href={`/listings/${listing.id}`}>
                                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer overflow-hidden">
                                    <div className="aspect-video w-full bg-muted relative">
                                        {listing.image_url ? (
                                            <img
                                                src={listing.image_url}
                                                alt={listing.title}
                                                className="object-cover w-full h-full"
                                            />
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                                No Image
                                            </div>
                                        )}
                                    </div>
                                    <CardHeader className="p-4">
                                        <CardTitle className="text-lg truncate">{listing.title}</CardTitle>
                                        <p className="text-sm text-muted-foreground">{listing.category || "General"}</p>
                                    </CardHeader>
                                    <CardContent className="p-4 pt-0">
                                        <p className="font-bold text-xl text-green-600">
                                            {new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(listing.price)}
                                        </p>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-[400px] text-center border rounded-lg border-dashed">
                        <h3 className="text-xl font-semibold">No listings found</h3>
                        <p className="text-muted-foreground mt-2 mb-6">
                            {search || category ? "Try adjusting your filters." : "Be the first to list an item on EthLink!"}
                        </p>
                        <Link href="/listings/new">
                            <Button>Post a Listing</Button>
                        </Link>
                    </div>
                )}
            </main>
        </div>
    );
}
