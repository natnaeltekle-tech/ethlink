
'use client';

import { createServiceWithProfile, getProfile } from '@/lib/actions'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import Link from 'next/link'
import { CheckCircle } from 'lucide-react'
import { ImageUploader } from '@/components/service/ImageUploader'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'



// Dynamic import for LocationPicker
const LocationPicker = dynamic(() => import('@/components/map/LocationPicker'), {
    ssr: false,
    loading: () => <div className="h-[300px] w-full bg-secondary/20 animate-pulse rounded-md" />
});

export default function NewServicePage() {
    const [userAuth, setUserAuth] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
    const [locationName, setLocationName] = useState('');

    useEffect(() => {
        async function loadData() {
            try {
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();

                if (!user) {
                    window.location.href = '/auth/login';
                    return;
                }

                setUserAuth(user);

                // Fetch profile
                const p = await getProfile();
                setProfile(p);
            } catch (e) {
                console.error("Error loading data", e);
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, []);

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>; // Or a proper skeleton
    }

    if (!userAuth) return null; // Logic handled in useEffect

    return (
        <div className="min-h-screen bg-background pt-4 md:pt-10 pb-20">
            <div className="container w-full mx-auto px-4 max-w-3xl">
                <div className="mb-8">
                    <Link href="/">
                        <Button variant="ghost" className="hidden md:inline-flex mb-4 min-h-[44px]">← Back to Home</Button>
                    </Link>
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-3xl font-bold text-foreground">List your Service</h1>
                        <div className="bg-blue-500/10 text-blue-500 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 border border-blue-500/20">
                            <CheckCircle className="h-3 w-3" />
                            Unified Listing
                        </div>
                    </div>
                    <p className="text-muted-foreground">Complete your profile and list your service in one go.</p>
                </div>

                <form action={createServiceWithProfile} className="space-y-8">
                    {/* Hidden inputs for coordinates */}
                    <input type="hidden" name="latitude" value={coordinates?.lat || ''} />
                    <input type="hidden" name="longitude" value={coordinates?.lng || ''} />

                    {/* Section 1: Provider Details */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Provider Details</CardTitle>
                            <CardDescription>Verify your personal information.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="firstName">First Name</Label>
                                    <Input
                                        id="firstName"
                                        name="firstName"
                                        placeholder="John"
                                        defaultValue={profile?.full_name?.split(' ')[0] || ''}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="lastName">Last Name</Label>
                                    <Input
                                        id="lastName"
                                        name="lastName"
                                        placeholder="Doe"
                                        defaultValue={profile?.full_name?.split(' ').slice(1).join(' ') || ''}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input disabled value={userAuth.email || ''} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phoneNumber">Phone Number</Label>
                                <Input
                                    id="phoneNumber"
                                    name="phoneNumber"
                                    placeholder="+251 911 234 567"
                                    defaultValue={profile?.phone_number || ''}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="idCardLink">ID Card Image URL</Label>
                                <Input
                                    id="idCardLink"
                                    name="idCardLink"
                                    placeholder="https://..."
                                    defaultValue={profile?.id_card_link || ''}
                                    required
                                />
                                <p className="text-xs text-muted-foreground">
                                    Link to your ID card (Passport, Kebele ID, or Driver's License).
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Section 2: Service Details */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Service Details</CardTitle>
                            <CardDescription>Tell us about what you are listing.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="title">Service Name (Title)</Label>
                                <Input id="title" name="title" className="w-full" placeholder="e.g. Luxurious Apartment in Bole" required />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="category">Category</Label>
                                    <Input
                                        id="category"
                                        name="category"
                                        list="category-options"
                                        className="w-full"
                                        placeholder="Select or type a category (e.g., Hospitality, Gym, Photography)"
                                        required
                                    />
                                    <datalist id="category-options">
                                        <option value="Hospitality" />
                                        <option value="Transport" />
                                        <option value="Real Estate" />
                                        <option value="Professional Services" />
                                        <option value="Cleaning" />
                                        <option value="Tech" />
                                        <option value="Events" />
                                    </datalist>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="price">Price (ETB)</Label>
                                    <Input id="price" name="price" type="number" min="0" step="0.01" className="w-full" placeholder="0.00" required />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="location">Location Name</Label>
                                <Input
                                    id="location"
                                    name="location"
                                    className="w-full"
                                    placeholder="e.g. Addis Ababa, Bole"
                                    required
                                    value={locationName}
                                    onChange={(e) => setLocationName(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Pin Location on Map</Label>
                                <LocationPicker
                                    onLocationSelect={(lat, lng, address) => {
                                        setCoordinates({ lat, lng });
                                        if (address) setLocationName(address);
                                    }}
                                />
                                <p className="text-xs text-muted-foreground">Click on the map to set the exact location.</p>
                            </div>

                            <div className="space-y-2">
                                <ImageUploader />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    name="description"
                                    placeholder="Describe your service in detail..."
                                    className="min-h-[150px] w-full"
                                    required
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <div className="pt-4 pb-20">
                        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6 shadow-lg">
                            List Service
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}

