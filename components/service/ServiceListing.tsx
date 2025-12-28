'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { ServiceCard } from '@/components/service/ServiceCard';
import { Button } from '@/components/ui/button';
import { Map, List } from 'lucide-react';
import { cn } from '@/lib/utils';

// Dynamic import for the Map component with SSR disabled
const ServiceMap = dynamic(() => import('@/components/map/ServiceMap'), {
    ssr: false,
    loading: () => (
        <div className="h-[600px] w-full flex items-center justify-center bg-secondary/20 rounded-lg border border-border animate-pulse">
            <p className="text-muted-foreground">Loading Map...</p>
        </div>
    ),
});

export default function ServiceListing({ services }: { services: any[] }) {
    const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-end border-b pb-4">
                <div className="flex bg-secondary/50 p-1 rounded-lg border border-border/50">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewMode('list')}
                        className={cn(
                            "flex items-center gap-2 px-4 transition-all",
                            viewMode === 'list'
                                ? "bg-background shadow-sm text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <List className="h-4 w-4" />
                        List
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewMode('map')}
                        className={cn(
                            "flex items-center gap-2 px-4 transition-all",
                            viewMode === 'map'
                                ? "bg-background shadow-sm text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Map className="h-4 w-4" />
                        Map
                    </Button>
                </div>
            </div>

            {viewMode === 'map' ? (
                <div className="w-full animate-in fade-in duration-300">
                    <ServiceMap services={services} />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
                    {services.map((service) => (
                        <ServiceCard key={service.id} service={service} />
                    ))}
                    {services.length === 0 && (
                        <p className="col-span-full text-center py-10 text-muted-foreground">
                            No services found.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
