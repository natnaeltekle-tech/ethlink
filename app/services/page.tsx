import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/server';
import { ArrowRight } from 'lucide-react';

export default async function ServicesPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const resolvedSearchParams = await searchParams;
    const search = typeof resolvedSearchParams.search === 'string' ? resolvedSearchParams.search : '';

    const supabase = await createClient();

    let query = supabase.from('services').select('*');

    if (search) {
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,category.ilike.%${search}%`);
    }

    const { data: services, error } = await query;

    if (error) {
        console.error("Error fetching services:", error);
    }

    const filteredServices = services || [];

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <h1 className="text-3xl font-bold">Services</h1>
                <div className="w-full md:w-1/3">
                    <form action="/services" method="get" className="flex gap-2">
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
                    <p className="text-gray-500 text-lg">No services found matching "{search}".</p>
                    <Button asChild className="mt-4" variant="outline">
                        <Link href="/services">Clear Search</Link>
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredServices.map((service) => (
                        <div key={service.id} className="border rounded-lg p-6 hover:shadow-lg transition-shadow bg-white dark:bg-gray-950">
                            <div className="flex justify-between items-start mb-2">
                                <h2 className="text-xl font-semibold">{service.title}</h2>
                                <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-600 dark:text-gray-400">
                                    {service.category}
                                </span>
                            </div>
                            <p className="text-gray-600 dark:text-gray-300 mb-4">{service.description}</p>
                            <div className="flex justify-between items-center mt-4">
                                <span className="font-bold text-lg">{service.price ? `$${service.price}` : 'Negotiable'}</span>
                                <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white">
                                    <Link href={`/services/${service.id}`} className="flex items-center gap-2">
                                        View Details <ArrowRight className="h-4 w-4" />
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
