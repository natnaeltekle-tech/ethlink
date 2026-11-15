import { Suspense } from 'react';
import Link from 'next/link';
import { SearchX, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { queryServices } from '@/lib/actions';
import { ServiceListing } from '@/components/service/service-listing';
import { ServiceFilterBar } from '@/components/service/service-filter-bar';
import { ServiceGridSkeleton } from '@/components/service/service-grid-skeleton';
import {
    hasAnyFilter,
    parseServiceFilters,
    serviceFiltersToQuery,
    type ServiceFilters,
} from '@/lib/service-filters';

async function ServiceResults({ filters, queryKey }: { filters: ServiceFilters; queryKey: string }) {
    const { services, error } = await queryServices(filters);

    if (error) {
        return (
            <div className="flex flex-col items-center text-center gap-3 py-12 px-4 rounded-2xl border border-border bg-card">
                <WifiOff className="h-10 w-10 text-muted-foreground" />
                <p className="font-semibold">Couldn&apos;t load services</p>
                <p className="text-sm text-muted-foreground max-w-xs">
                    Check your connection and try again.
                </p>
                <Button asChild variant="outline" className="mt-2">
                    {/* Full navigation re-runs the server query */}
                    <a href={queryKey ? `/services?${queryKey}` : '/services'}>Retry</a>
                </Button>
            </div>
        );
    }

    if (services.length === 0) {
        const filtered = hasAnyFilter(filters);
        return (
            <div className="flex flex-col items-center text-center gap-3 py-12 px-4 rounded-2xl border border-dashed border-border">
                <SearchX className="h-10 w-10 text-muted-foreground" />
                <p className="font-semibold">
                    {filtered ? 'No services match these filters' : 'No services yet'}
                </p>
                <p className="text-sm text-muted-foreground max-w-xs">
                    {filtered
                        ? 'Try removing a filter or widening your price range.'
                        : 'New providers are joining every day — check back soon.'}
                </p>
                {filtered && (
                    <Button asChild variant="outline" className="mt-2">
                        <Link href="/services">Clear filters</Link>
                    </Button>
                )}
            </div>
        );
    }

    return <ServiceListing key={queryKey} services={services} />;
}

export default async function ServicesPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const filters = parseServiceFilters(await searchParams);
    const queryKey = serviceFiltersToQuery(filters);
    const { search, category } = filters;

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col gap-4 mb-8">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <h1 className="text-3xl font-bold">
                        {category ? `Browsing: ${category}` : 'All Services'}
                    </h1>
                    <div className="w-full md:w-1/3">
                        <form action="/services" method="get" role="search" className="flex gap-2">
                            {/* Keep the other filters when searching */}
                            {Array.from(new URLSearchParams(serviceFiltersToQuery({ ...filters, search: undefined }))).map(
                                ([key, value]) => (
                                    <input key={key} type="hidden" name={key} value={value} />
                                )
                            )}
                            <Input
                                key={search ?? ''}
                                type="search"
                                name="search"
                                enterKeyHint="search"
                                maxLength={200}
                                placeholder="Search services..."
                                defaultValue={search}
                                className="w-full"
                            />
                            <Button type="submit">Search</Button>
                        </form>
                    </div>
                </div>
                <ServiceFilterBar filters={filters} />
            </div>

            {/* Keyed so the skeleton shows on every filter change (slow networks) */}
            <Suspense key={queryKey} fallback={<ServiceGridSkeleton />}>
                <ServiceResults filters={filters} queryKey={queryKey} />
            </Suspense>
        </div>
    );
}
