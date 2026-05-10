'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Trash2, UserCog, AlertCircle, Shield, Mail, ImageOff, Loader2, Camera, Heart, CreditCard, ShieldCheck, LifeBuoy } from 'lucide-react'
import { LogoutButton } from '@/components/logout-button'
import { deleteService, updateProfile, resetServiceImage } from '@/lib/actions'
import { updateAvatarUrl } from '@/lib/actions/avatar'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export function SettingsTab({ services, user, profile }: { services: any[], user: any, profile: any }) {
    // All hooks must be declared before any conditional returns (Rules of Hooks)
    const [isDeleting, setIsDeleting] = useState<string | null>(null)
    const [isResetting, setIsResetting] = useState<string | null>(null)
    const [isUpdating, setIsUpdating] = useState(false)
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
    const avatarInputRef = useRef<HTMLInputElement>(null)
    const router = useRouter()

    // Guard against null user during logout transition to prevent white screen crash.
    // Placed after all hooks to comply with React's Rules of Hooks.
    if (!user) return null

    // Pre-fill logic helpers
    const getFirstName = () => {
        if (profile?.first_name) return profile.first_name
        if (user?.user_metadata?.full_name) {
            return user.user_metadata.full_name.split(' ')[0] || ''
        }
        return ''
    }

    const getLastName = () => {
        if (profile?.last_name) return profile.last_name
        if (user?.user_metadata?.full_name) {
            const parts = user.user_metadata.full_name.split(' ')
            return parts.length > 1 ? parts.slice(1).join(' ') : ''
        }
        return ''
    }

    const getPhone = () => {
        return profile?.phone_number || ''
    }

    const getAvatarDisplay = () => {
        if (profile?.avatar_url) return null // Will show image
        return (user?.email && user.email[0]) ? user.email[0].toUpperCase() : 'U'
    }

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file')
            return
        }

        setIsUploadingAvatar(true)
        const supabase = createClient()
        const fileExt = file.name.split('.').pop()
        const fileName = `${user.id}_${Date.now()}.${fileExt}`

        let publicUrl = '';
        try {
            const { error: uploadError } = await supabase.storage
                .from('service-images')
                .upload(fileName, file)

            if (uploadError) throw uploadError

            const { data } = supabase.storage
                .from('service-images')
                .getPublicUrl(fileName)
            publicUrl = data.publicUrl
        } catch (error: any) {
            toast.error('Upload failed: ' + (error.message || 'Unknown error'))
            setIsUploadingAvatar(false)
            if (avatarInputRef.current) avatarInputRef.current.value = ''
            return
        }

        try {
            await updateAvatarUrl(publicUrl)
            toast.success('Profile picture updated!')
            router.refresh()
        } catch (error: any) {
            toast.error('Database update failed: ' + (error.message || 'Unknown error'))
        } finally {
            setIsUploadingAvatar(false)
            // Reset file input so the same file can be re-selected
            if (avatarInputRef.current) avatarInputRef.current.value = ''
        }
    }

    const handleDelete = async (id: string) => {
        // Confirmation is handled by AlertDialog now

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

    const handleResetImage = async (id: string) => {
        setIsResetting(id)
        try {
            await resetServiceImage(id)
            toast.success('Service image reset successfully')
        } catch (error) {
            toast.error('Failed to reset service image')
            console.error(error)
        } finally {
            setIsResetting(null)
        }
    }

    const handleUpdateProfile = async (formData: FormData) => {
        setIsUpdating(true)
        try {
            const res = await updateProfile(formData)
            if (res.error) {
                toast.error(res.error)
            } else {
                toast.success('Saved!')
                router.refresh()
            }
        } catch (error) {
            toast.error('Failed to update profile')
            console.error(error)
        } finally {
            setIsUpdating(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* User Details */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <UserCog className="h-5 w-5" />
                        User Details
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-6">
                        {/* Clickable Avatar with Upload */}
                        <label htmlFor="avatar-upload" className="cursor-pointer relative group">
                            <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-2xl shadow-sm border border-primary/10 overflow-hidden">
                                {profile?.avatar_url ? (
                                    <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                                ) : (
                                    getAvatarDisplay()
                                )}
                                {isUploadingAvatar && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-full">
                                        <Loader2 className="h-5 w-5 animate-spin text-white" />
                                    </div>
                                )}
                            </div>
                            {/* Hover overlay */}
                            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <div className="flex flex-col items-center gap-0.5">
                                    <Camera className="h-4 w-4 text-white" />
                                    <span className="text-white text-[9px] font-semibold leading-tight">Change Photo</span>
                                </div>
                            </div>
                        </label>
                        <input
                            type="file"
                            id="avatar-upload"
                            ref={avatarInputRef}
                            accept="image/*"
                            className="hidden"
                            onChange={handleAvatarUpload}
                        />

                        <div className="space-y-2">
                            {/* Email with Icon */}
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Mail className="h-4 w-4" />
                                <span className="font-medium">{user?.email || 'User'}</span>
                            </div>

                            {/* Role Badge */}
                            <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4 text-muted-foreground" />
                                <Badge
                                    variant="outline"
                                    className={`${services.length > 0
                                        ? 'bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 border-yellow-200'
                                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200'
                                        } px-3 py-1 font-semibold`}
                                >
                                    {services.length > 0 ? 'Vendor Account' : 'Customer Account'}
                                </Badge>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

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
                        <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg bg-secondary/20">
                            You haven't posted any services yet.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {services.map((service) => (
                                <div key={service.id} className="flex items-center justify-between p-4 border border-border rounded-lg bg-card text-card-foreground">
                                    <div>
                                        <h4 className="font-semibold">{service.title}</h4>
                                        <p className="text-sm text-green-500 font-bold">{service.price} ETB</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="gap-2"
                                            onClick={() => handleResetImage(service.id)}
                                            disabled={isResetting === service.id}
                                            title="Reset Image"
                                        >
                                            <ImageOff className="h-4 w-4" />
                                            {isResetting === service.id ? '...' : ''}
                                        </Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    className="gap-2"
                                                    disabled={isDeleting === service.id}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                    {isDeleting === service.id ? 'Deleting...' : 'Delete'}
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This action cannot be undone. This will permanently delete your service
                                                        "{service.title}" and remove it from our servers.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                        onClick={() => handleDelete(service.id)}
                                                    >
                                                        Delete
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Quick Links */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <UserCog className="h-5 w-5" />
                        Quick Links
                    </CardTitle>
                    <CardDescription>Access your account features.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-1">
                    <button
                        onClick={() => toast.info('This feature is coming soon in V2!')}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors text-left"
                    >
                        <Heart className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">My Favorites</span>
                    </button>
                    <button
                        onClick={() => toast.info('This feature is coming soon in V2!')}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors text-left"
                    >
                        <CreditCard className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">Payment Methods</span>
                    </button>
                    <button
                        onClick={() => toast.info('This feature is coming soon in V2!')}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors text-left"
                    >
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">Identity Verification</span>
                    </button>
                    <button
                        onClick={() => toast.info('This feature is coming soon in V2!')}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors text-left"
                    >
                        <LifeBuoy className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">Help &amp; Support</span>
                    </button>
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
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="firstName">First Name</Label>
                                <Input
                                    id="firstName"
                                    name="firstName"
                                    defaultValue={getFirstName()}
                                    placeholder="First Name"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lastName">Last Name</Label>
                                <Input
                                    id="lastName"
                                    name="lastName"
                                    defaultValue={getLastName()}
                                    placeholder="Last Name"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phoneNumber">Phone Number</Label>
                            <Input
                                id="phoneNumber"
                                name="phoneNumber"
                                type="tel"
                                defaultValue={getPhone()}
                                placeholder="+251 ..."
                                required
                            />
                        </div>

                        <Button type="submit" disabled={isUpdating} className="w-full sm:w-auto">
                            {isUpdating ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Log Out Button */}
            <div className="flex justify-end pt-4 border-t border-border">
                <LogoutButton />
            </div>
        </div>
    )
}

