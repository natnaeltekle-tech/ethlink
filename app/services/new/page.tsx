import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createService } from '@/lib/actions';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function NewServicePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/auth/login?next=/services/new');
    }

    return (
        <div className="container mx-auto px-4 py-12 flex justify-center items-center min-h-[60vh]">
            <div className="bg-white dark:bg-gray-950 shadow-xl rounded-xl p-8 max-w-lg w-full border border-gray-100 dark:border-gray-800">
                <div className="mb-6 text-center">
                    <h1 className="text-2xl font-bold mb-2">List Your Service on EthLink</h1>
                    <p className="text-gray-500 text-sm">
                        Share your expertise and reach more customers by listing your service.
                    </p>
                </div>

                <form action={createService} className="space-y-6">
                    <div className="space-y-2">
                        <label htmlFor="title" className="text-sm font-medium leading-none">
                            Service Title
                        </label>
                        <Input id="title" name="title" placeholder="e.g. Joe's Plumbing" required />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="category" className="text-sm font-medium leading-none">
                            Category
                        </label>
                        <select
                            id="category"
                            name="category"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            required
                        >
                            <option value="">Select a category</option>
                            <option value="Hospitality">Hospitality</option>
                            <option value="Transport">Transport</option>
                            <option value="Health">Health</option>
                            <option value="Events">Events</option>
                            <option value="Tech">Tech</option>
                            <option value="Home Services">Home Services</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="location" className="text-sm font-medium leading-none">
                            Location
                        </label>
                        <Input id="location" name="location" placeholder="e.g. Bole, Addis Ababa" required />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="price" className="text-sm font-medium leading-none">
                            Base Price (ETB)
                        </label>
                        <Input id="price" name="price" type="number" min="0" step="0.01" placeholder="0.00" required />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="description" className="text-sm font-medium leading-none">
                            Description
                        </label>
                        <textarea
                            id="description"
                            name="description"
                            placeholder="Describe your service in detail..."
                            className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="image_url" className="text-sm font-medium leading-none">
                            Image URL (Optional)
                        </label>
                        <Input id="image_url" name="image_url" placeholder="https://example.com/image.jpg" />
                        <p className="text-xs text-muted-foreground">Provide a link to an image of your service.</p>
                    </div>

                    <Button type="submit" className="w-full">
                        List Service
                    </Button>
                </form>
            </div>
        </div>
    );
}
