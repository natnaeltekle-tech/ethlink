
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
import { ImageUploader } from '@/components/service/image-uploader'
import { useState, useEffect } from 'react'
// Native checkboxes used for amenities (Radix Checkbox doesn't submit in FormData)
import dynamic from 'next/dynamic'



// Dynamic import for LocationPicker
const LocationPicker = dynamic(() => import('@/components/map/location-picker'), {
    ssr: false,
    loading: () => <div className="h-[300px] w-full bg-secondary/20 animate-pulse rounded-md" />
});

export default function NewServicePage() {
    const [userAuth, setUserAuth] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
    const [locationName, setLocationName] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');

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
                                <Input disabled value={userAuth?.email || ''} />
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
                                    <select
                                        id="category"
                                        name="category"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                        required
                                        value={selectedCategory}
                                        onChange={(e) => setSelectedCategory(e.target.value)}
                                    >
                                        <option value="" disabled>Select a category</option>
                                        <option value="Hospitality">Hospitality</option>
                                        <option value="Transport">Transport</option>
                                        <option value="Real Estate">Real Estate</option>
                                        <option value="Professional Services">Professional Services</option>
                                        <option value="Cleaning">Cleaning</option>
                                        <option value="Tech">Tech</option>
                                        <option value="Events">Events</option>
                                        <option value="Other">Other</option>
                                    </select>
                                    {selectedCategory === 'Other' && (
                                        <Input
                                            name="custom_category"
                                            className="w-full mt-2"
                                            placeholder="Please specify your category..."
                                            required
                                        />
                                    )}
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

                            <div className="space-y-4 pt-4">
                                <Label className="text-base font-semibold">Amenities (Optional)</Label>
                                <p className="text-xs text-muted-foreground -mt-2">Select any amenities your service offers.</p>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-5 rounded-xl border border-border/40 bg-gradient-to-br from-secondary/5 to-secondary/10 shadow-inner">
                                    {[
                                        { label: 'Wi-Fi', icon: '📶' },
                                        { label: 'Parking', icon: '🅿️' },
                                        { label: 'Swimming Pool', icon: '🏊' },
                                        { label: 'Gym', icon: '🏋️' },
                                        { label: 'Air Conditioning', icon: '❄️' },
                                        { label: 'Workspace', icon: '💻' },
                                        { label: 'Restaurant', icon: '🍽️' },
                                        { label: 'Airport Transfer', icon: '✈️' },
                                        { label: '24/7 Security', icon: '🛡️' },
                                    ].map(({ label, icon }) => (
                                        <label
                                            key={label}
                                            htmlFor={`amenity-${label}`}
                                            className="group flex items-center gap-3 px-3 py-2.5 rounded-lg border border-transparent bg-background/60 hover:bg-blue-500/5 hover:border-blue-500/20 has-[:checked]:bg-blue-500/10 has-[:checked]:border-blue-500/30 has-[:checked]:shadow-sm cursor-pointer transition-all duration-200 select-none"
                                        >
                                            <input
                                                type="checkbox"
                                                id={`amenity-${label}`}
                                                name="amenities"
                                                value={label}
                                                className="peer sr-only"
                                            />
                                            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-secondary/30 group-hover:bg-blue-500/10 peer-checked:bg-blue-500/15 transition-colors text-base">
                                                {icon}
                                            </span>
                                            <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground peer-checked:text-blue-600 dark:peer-checked:text-blue-400 transition-colors">
                                                {label}
                                            </span>
                                            <span className="ml-auto w-5 h-5 rounded-md border-2 border-border/60 group-hover:border-blue-500/40 peer-checked:border-blue-500 peer-checked:bg-blue-500 flex items-center justify-center transition-all duration-200">
                                                <svg className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                            </span>
                                        </label>
                                    ))}
                                </div>
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

