import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/server';
import { getFilteredServices } from '@/lib/actions';

import { ArrowRight } from 'lucide-react';
import ServiceListing from '@/components/service/ServiceListing';

import { searchParamsSchema } from '@/lib/validations';

export default async function ServicesPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const resolvedSearchParams = await searchParams;
    const { search, category } = searchParamsSchema.parse(resolvedSearchParams);

    // Use the optimized server action for filtering
    const services = await getFilteredServices(category, search);

    const filteredServices = services || [];

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <h1 className="text-3xl font-bold">
                    {category ? `Browsing: ${category}` : 'All Services'}
                </h1>
                <div className="w-full md:w-1/3">
                    <form action="/services" method="get" className="flex gap-2">
                        {category && <input type="hidden" name="category" value={category} />}
                        <Input
                            type="text"
                            name="search"
                            placeholder="Search services..."
                            defaultValue={search}
                            className="w-full"
                        />
                        <Button type="submit">Search</Button>
                    </form>
                </div>
            </div>

            {filteredServices.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-muted-foreground text-lg">No services found matching "{search}".</p>
                    <Button asChild className="mt-4" variant="outline">
                        <Link href="/services">Clear Search</Link>
                    </Button>
                </div>
            ) : (
                <ServiceListing key={category} services={filteredServices} />
            )}
        </div>
    );
}
