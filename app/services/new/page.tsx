
import { createServiceWithProfile, getProfile } from '@/lib/actions'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CheckCircle } from 'lucide-react'

export default async function NewServicePage() {
    // 1. Check Authentication First
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    // 2. Fetch Profile (for pre-filling)
    const profile = await getProfile()

    return (
        <div className="min-h-screen bg-slate-50 py-12 pb-20">
            <div className="container w-full mx-auto px-4 max-w-3xl">
                <div className="mb-8">
                    <Link href="/">
                        <Button variant="ghost" className="mb-4">← Back to Home</Button>
                    </Link>
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-3xl font-bold text-slate-900">List your Service</h1>
                        <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Unified Listing
                        </div>
                    </div>
                    <p className="text-muted-foreground">Complete your profile and list your service in one go.</p>
                </div>

                <form action={createServiceWithProfile} className="space-y-8">
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
                                <Input disabled value={user.email || ''} />
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
                                    <Select name="category" required>
                                        <SelectTrigger className="w-full">
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
                                    <Input id="price" name="price" type="number" min="0" step="0.01" className="w-full" placeholder="0.00" required />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="location">Location</Label>
                                <Input id="location" name="location" className="w-full" placeholder="e.g. Addis Ababa, Bole" required />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="image_url">Image URL</Label>
                                <Input id="image_url" name="image_url" className="w-full" placeholder="https://..." />
                                <p className="text-xs text-muted-foreground">Provide a direct link to an image of your service.</p>
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

