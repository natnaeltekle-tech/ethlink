'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchBarProps {
    className?: string;
    inputClassName?: string;
    placeholder?: string;
    fullWidth?: boolean;
}

export function SearchBar({ className, inputClassName, placeholder = "Search services...", fullWidth = false }: SearchBarProps) {
    const [query, setQuery] = useState('');
    const router = useRouter();

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            router.push(`/services?search=${encodeURIComponent(query)}`);
        }
    };

    return (
        <form onSubmit={handleSearch} className={cn("flex w-full items-center space-x-2 relative", className)}>
            <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder={placeholder}
                    className={cn("pl-8 w-full", inputClassName)}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
            </div>
            <Button type="submit" className={cn(inputClassName ? "h-12 px-8" : "")}>Search</Button>
        </form>
    );
}
