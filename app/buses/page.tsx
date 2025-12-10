import { getBuses } from '@/lib/actions'
import { ServiceCard } from '@/components/service-card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function BusesPage() {
    const services = await getBuses(24)

    return (
        <div className="min-h-screen bg-slate-50/50">
            <div className="container mx-auto px-4 py-12">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Buses</h1>
                        <p className="text-muted-foreground mt-2">Find available bus services for your journey.</p>
                    </div>
                    <Link href="/">
                        <Button variant="ghost">Back to Home</Button>
                    </Link>
                </div>

                {services.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {services.map((service: any) => (
                            <ServiceCard key={service.id} service={service} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-24 bg-white rounded-lg border border-dashed">
                        <p className="text-muted-foreground text-lg">No buses found yet.</p>
                        <Link href="/services/new">
                            <Button className="mt-4" variant="outline">Add a Service</Button>
                        </Link>
                    </div>
                )}
            </div>
        </div>
    )
}
