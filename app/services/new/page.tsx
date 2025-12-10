
import { createService, getProfile, updateProviderProfile } from '@/lib/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Shield, CheckCircle } from 'lucide-react'

export default async function NewServicePage() {
    const profile = await getProfile()

    if (!profile) {
        redirect('/auth/login')
    }

    // Check if provider profile is complete
    const isVerified = profile.full_name && profile.id_card_link

    if (!isVerified) {
        return (
            <div className="min-h-screen bg-slate-50 py-12">
                <div className="container mx-auto px-4 max-w-lg">
                    <div className="mb-8 text-center">
                        <div className="h-16 w-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Shield className="h-8 w-8" />
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900">Become a Host</h1>
                        <p className="text-muted-foreground mt-2">
                            To ensure trust and safety, we need to verify your identity before you can list services.
                        </p>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Complete your Provider Profile</CardTitle>
                            <CardDescription>This information will be used for verification purposes.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form action={updateProviderProfile} className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="firstName">First Name</Label>
                                        <Input id="firstName" name="firstName" placeholder="John" required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="lastName">Last Name</Label>
                                        <Input id="lastName" name="lastName" placeholder="Doe" required />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="phoneNumber">Phone Number</Label>
                                    <Input id="phoneNumber" name="phoneNumber" placeholder="+251 911 234 567" required />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="idCardLink">ID Card Image URL</Label>
                                    <Input id="idCardLink" name="idCardLink" placeholder="https://..." required />
                                    <p className="text-xs text-muted-foreground">
                                        Please provide a link to a clear image of your ID card (Passport, Kebele ID, or Driver's License).
                                    </p>
                                </div>

                                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" size="lg">
                                    Register & Continue
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 py-12">
            <div className="container mx-auto px-4 max-w-2xl">
                <div className="mb-8">
                    <Link href="/">
                        <Button variant="ghost" className="mb-4">← Back to Home</Button>
                    </Link>
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-3xl font-bold text-slate-900">List a New Service</h1>
                        <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Verified Provider
                        </div>
                    </div>
                    <p className="text-muted-foreground">Share your service with thousands of potential customers.</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Service Details</CardTitle>
                        <CardDescription>Provide key information about what you offer.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form action={createService} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="title">Service Title</Label>
                                <Input id="title" name="title" placeholder="e.g. Luxurious Apartment in Bole" required />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="category">Category</Label>
                                    <Select name="category" required>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Hospitality">Hospitality (Hotels, etc.)</SelectItem>
                                            <SelectItem value="Transport">Transport (Buses, etc.)</SelectItem>
                                            <SelectItem value="Real Estate">Real Estate</SelectItem>
                                            <SelectItem value="Professional Services">Professional Services</SelectItem>
                                            <SelectItem value="Other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="price">Price (ETB)</Label>
                                    <Input id="price" name="price" type="number" min="0" step="0.01" placeholder="0.00" required />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="location">Location</Label>
                                <Input id="location" name="location" placeholder="e.g. Addis Ababa, Bole" required />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="image_url">Image URL</Label>
                                <Input id="image_url" name="image_url" placeholder="https://..." />
                                <p className="text-xs text-muted-foreground">Provide a direct link to an image of your service.</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    name="description"
                                    placeholder="Describe your service in detail..."
                                    className="min-h-[150px]"
                                    required
                                />
                            </div>

                            <div className="pt-4">
                                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" size="lg">
                                    Create Listing
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

