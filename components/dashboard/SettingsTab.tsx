'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Trash2, UserCog, AlertCircle } from 'lucide-react'
import { deleteService, updateProfile } from '@/lib/actions'
import { toast } from 'sonner'

export function SettingsTab({ services, user }: { services: any[], user: any }) {
    const [isDeleting, setIsDeleting] = useState<string | null>(null)
    const [isUpdating, setIsUpdating] = useState(false)

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this service? This action cannot be undone.')) return

        setIsDeleting(id)
        try {
            await deleteService(id)
            toast.success('Service deleted successfully')
        } catch (error) {
            toast.error('Failed to delete service')
            console.error(error)
        } finally {
            setIsDeleting(null)
        }
    }

    const handleUpdateProfile = async (formData: FormData) => {
        setIsUpdating(true)
        try {
            await updateProfile(formData)
            toast.success('Profile updated successfully')
        } catch (error) {
            toast.error('Failed to update profile')
            console.error(error)
        } finally {
            setIsUpdating(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Services Management */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <UserCog className="h-5 w-5" />
                        My Services Management
                    </CardTitle>
                    <CardDescription>Manage the services you offer on EthLink.</CardDescription>
                </CardHeader>
                <CardContent>
                    {services.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg bg-slate-50">
                            You haven't posted any services yet.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {services.map((service) => (
                                <div key={service.id} className="flex items-center justify-between p-4 border rounded-lg bg-white">
                                    <div>
                                        <h4 className="font-semibold">{service.title}</h4>
                                        <p className="text-sm text-green-600 font-bold">{service.price} ETB</p>
                                    </div>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        className="gap-2"
                                        disabled={isDeleting === service.id}
                                        onClick={() => handleDelete(service.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        {isDeleting === service.id ? 'Deleting...' : 'Delete'}
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Profile Settings */}
            <Card>
                <CardHeader>
                    <CardTitle>Profile Settings</CardTitle>
                    <CardDescription>Update your personal information.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={handleUpdateProfile} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="fullName">Full Name</Label>
                            <Input
                                id="fullName"
                                name="fullName"
                                defaultValue={user.user_metadata?.full_name || ''}
                                placeholder="Enter your full name"
                            />
                        </div>
                        <Button type="submit" disabled={isUpdating}>
                            {isUpdating ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
