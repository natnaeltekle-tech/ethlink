'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Grid, Plus, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { addImageToGallery } from '@/lib/gallery-actions'
import { toast } from 'sonner'

interface ServiceGalleryProps {
    images: string[]
    title: string
    isOwner?: boolean
    serviceId?: string
}

export function ServiceGallery({ images, title, isOwner, serviceId }: ServiceGalleryProps) {
    const [isUploading, setIsUploading] = useState(false)

    // Helper to get full URL
    const getFullUrl = (path: string | null) => {
        if (!path) return null
        return path.startsWith('http')
            ? path
            : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/service-images/${path}`
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0] || !serviceId) return

        const file = e.target.files[0]
        setIsUploading(true)

        try {
            const supabase = createClient()
            const fileExt = file.name.split('.').pop()
            const fileName = `${serviceId}-${Math.random().toString(36).substring(2)}.${fileExt}`
            // We just store the filename in the DB as per getFullUrl logic
            const filePath = `${fileName}`

            // 1. Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('service-images')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            // 2. Add to Gallery in DB
            await addImageToGallery(serviceId, filePath)

            toast.success('Image added successfully!')
        } catch (error: any) {
            console.error('Upload failed:', error)
            toast.error(`Failed to upload image: ${error.message || 'Unknown error'}`)
        } finally {
            setIsUploading(false)
        }
    }

    // Ensure we have at least standard array structure
    const displayImages = images && images.length > 0 ? images : []
    // If we have images, use them. If main image is missing but we have side images, valid but rare.
    // If displayImages is empty, we handle placeholders below.

    const mainImage = displayImages[0]
    const sideImages = displayImages.slice(1, 3) // Get next 2 images

    // If completely empty and not owner, show simple placeholder
    if (displayImages.length === 0 && !isOwner) {
        return (
            <div className="relative aspect-video w-full overflow-hidden rounded-xl border bg-muted flex items-center justify-center text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                    <span className="text-4xl opacity-50">📷</span>
                    <span>No Images Available</span>
                </div>
            </div>
        )
    }

    return (
        <div className="relative rounded-xl overflow-hidden group mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 h-[400px] md:h-[500px]">
                {/* Main Image (Left) */}
                <div className="relative h-full w-full overflow-hidden bg-muted rounded-l-xl">
                    {mainImage ? (
                        <Image
                            src={getFullUrl(mainImage) || ''}
                            alt={`${title} - Main`}
                            fill
                            className="object-cover transition-transform duration-500 hover:scale-105"
                            priority
                            sizes="(max-width: 768px) 100vw, 50vw"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            {isOwner && serviceId ? (
                                <label className="cursor-pointer flex flex-col items-center gap-2 p-4 hover:bg-muted/50 rounded-lg transition-colors group/upload">
                                    <div className="h-16 w-16 rounded-full bg-primary/10 group-hover/upload:bg-primary/20 flex items-center justify-center text-primary transition-colors">
                                        {isUploading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Plus className="w-8 h-8" />}
                                    </div>
                                    <span className="text-sm font-medium text-muted-foreground group-hover/upload:text-primary transition-colors">Add Main Photo</span>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={isUploading} />
                                </label>
                            ) : (
                                <span className="text-muted-foreground">No Main Image</span>
                            )}
                        </div>
                    )}
                </div>

                {/* Side Images (Right) */}
                <div className="hidden md:flex flex-col gap-2 h-full">
                    {/* Top Right */}
                    <div className="relative h-1/2 w-full overflow-hidden bg-muted rounded-tr-xl">
                        {sideImages[0] ? (
                            <Image
                                src={getFullUrl(sideImages[0]) || ''}
                                alt={`${title} - 2`}
                                fill
                                className="object-cover transition-transform duration-500 hover:scale-105"
                                sizes="25vw"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                {isOwner && serviceId ? (
                                    <label className="cursor-pointer flex flex-col items-center gap-2 p-4 hover:bg-muted/50 rounded-lg transition-colors group/upload">
                                        <div className="h-12 w-12 rounded-full bg-primary/10 group-hover/upload:bg-primary/20 flex items-center justify-center text-primary transition-colors">
                                            {isUploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Plus className="w-6 h-6" />}
                                        </div>
                                        <span className="text-xs font-medium text-muted-foreground group-hover/upload:text-primary transition-colors">Add Photo</span>
                                        <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={isUploading} />
                                    </label>
                                ) : (
                                    <span className="text-muted-foreground/30 font-bold text-xl">Eth-Links</span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Bottom Right */}
                    <div className="relative h-1/2 w-full overflow-hidden bg-muted rounded-br-xl">
                        {sideImages[1] ? (
                            <Image
                                src={getFullUrl(sideImages[1]) || ''}
                                alt={`${title} - 3`}
                                fill
                                className="object-cover transition-transform duration-500 hover:scale-105"
                                sizes="25vw"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                {isOwner && serviceId ? (
                                    <label className="cursor-pointer flex flex-col items-center gap-2 p-4 hover:bg-muted/50 rounded-lg transition-colors group/upload">
                                        <div className="h-12 w-12 rounded-full bg-primary/10 group-hover/upload:bg-primary/20 flex items-center justify-center text-primary transition-colors">
                                            {isUploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Plus className="w-6 h-6" />}
                                        </div>
                                        <span className="text-xs font-medium text-muted-foreground group-hover/upload:text-primary transition-colors">Add Photo</span>
                                        <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={isUploading} />
                                    </label>
                                ) : (
                                    <span className="text-muted-foreground/30 font-bold text-xl">Eth-Links</span>
                                )}
                            </div>
                        )}

                        {/* Overlay for "View All" (Only if we have images in this slot or more) */}
                        {sideImages[1] && (
                            <div className="absolute inset-0 bg-black/10 transition-colors hover:bg-black/20 flex items-end justify-end p-4">
                                <Button size="sm" variant="secondary" className="gap-2 font-semibold shadow-md pointer-events-none">
                                    <Grid className="w-4 h-4" />
                                    See all photos
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
