'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Grid, Plus, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { addImageToGallery } from '@/lib/gallery-actions'
import { toast } from 'sonner'
import { DEFAULT_SERVICE_IMAGE } from '@/lib/constants'

interface ServiceGalleryProps {
    images: string[]
    title: string
    isOwner?: boolean
    serviceId?: string
    imageUrl?: string | null
}

export function ServiceGallery({ images, title, isOwner, serviceId, imageUrl }: ServiceGalleryProps) {
    const [isUploading, setIsUploading] = useState(false)
    const router = useRouter()

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

            router.refresh()
            toast.success('Image added successfully!')
        } catch (error: any) {
            console.error('Upload failed:', error)
            toast.error(`Failed to upload image: ${error.message || 'Unknown error'}`)
        } finally {
            setIsUploading(false)
        }
    }

    // Use gallery images if available, otherwise fallback to legacy imageUrl
    const displayImages = images && images.length > 0 ? images : (imageUrl ? [imageUrl] : [])

    // Empty state for non-owners
    if (displayImages.length === 0 && !isOwner) {
        return (
            <div className="relative aspect-video w-full overflow-hidden rounded-xl border bg-muted flex items-center justify-center text-muted-foreground mb-6">
                <div className="flex flex-col items-center gap-2">
                    <span className="text-4xl opacity-50">📷</span>
                    <span className="text-sm md:text-base">No photos available</span>
                </div>
            </div>
        )
    }

    // Empty state for owners - large upload prompt
    if (displayImages.length === 0 && isOwner && serviceId) {
        return (
            <div className="relative w-full overflow-hidden rounded-xl border-2 border-dashed border-primary/30 bg-muted/50 mb-6">
                <label className="cursor-pointer flex flex-col items-center justify-center gap-4 p-12 md:p-16 hover:bg-muted/80 transition-colors group/upload min-h-[300px]">
                    <div className="h-20 w-20 md:h-24 md:w-24 rounded-full bg-primary/10 group-hover/upload:bg-primary/20 flex items-center justify-center text-primary transition-colors">
                        {isUploading ? <Loader2 className="w-10 h-10 md:w-12 md:h-12 animate-spin" /> : <Plus className="w-10 h-10 md:w-12 md:h-12" />}
                    </div>
                    <div className="flex flex-col items-center gap-2">
                        <span className="text-lg md:text-xl font-semibold text-foreground group-hover/upload:text-primary transition-colors">Upload First Photo</span>
                        <span className="text-sm text-muted-foreground">Tap to add your first service photo</span>
                    </div>
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={isUploading} />
                </label>
            </div>
        )
    }

    return (
        <div className="relative mb-6">
            {/* Mobile: Horizontal Scroll */}
            <div className="md:hidden">
                <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2 -mx-4 px-4">
                    {/* Images */}
                    {displayImages.map((image, index) => (
                        <div
                            key={index}
                            className="flex-shrink-0 w-[calc(100vw-2rem)] aspect-[4/3] relative rounded-xl overflow-hidden bg-muted snap-start"
                        >
                            <Image
                                src={getFullUrl(image) || DEFAULT_SERVICE_IMAGE}
                                alt={`${title} - ${index + 1}`}
                                fill
                                className="object-cover"
                                priority={index === 0}
                                sizes="100vw"
                            />
                        </div>
                    ))}

                    {/* Add Image Button - Owner Only - End of scroll */}
                    {isOwner && serviceId && (
                        <label className="flex-shrink-0 w-[calc(100vw-2rem)] aspect-[4/3] rounded-xl border-2 border-dashed border-primary/30 bg-muted/50 cursor-pointer hover:bg-muted transition-colors snap-start flex flex-col items-center justify-center gap-3 active:scale-[0.98]">
                            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                {isUploading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Plus className="w-8 h-8" />}
                            </div>
                            <span className="text-base font-semibold text-foreground">Tap to Add Photo</span>
                            <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={isUploading} />
                        </label>
                    )}
                </div>

                {/* Photo counter */}
                {displayImages.length > 0 && (
                    <div className="flex justify-center mt-3">
                        <div className="px-3 py-1 rounded-full bg-black/60 text-white text-xs font-medium">
                            {displayImages.length} {displayImages.length === 1 ? 'photo' : 'photos'}
                        </div>
                    </div>
                )}
            </div>

            {/* Desktop: Grid Layout (unchanged) */}
            <div className="hidden md:block rounded-xl overflow-hidden group">
                <div className="grid grid-cols-2 gap-2 h-[500px]">
                    {/* Main Image (Left) */}
                    <div className="relative h-full w-full overflow-hidden bg-muted rounded-l-xl">
                        {displayImages[0] ? (
                            <Image
                                src={getFullUrl(displayImages[0]) || DEFAULT_SERVICE_IMAGE}
                                alt={`${title} - Main`}
                                fill
                                className="object-cover transition-transform duration-500 hover:scale-105"
                                priority
                                sizes="50vw"
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
                    <div className="flex flex-col gap-2 w-full h-full">
                        {/* Top Right */}
                        <div className="relative h-1/2 w-full overflow-hidden bg-muted rounded-tr-xl">
                            {displayImages[1] ? (
                                <Image
                                    src={getFullUrl(displayImages[1]) || DEFAULT_SERVICE_IMAGE}
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
                            {displayImages[2] ? (
                                <Image
                                    src={getFullUrl(displayImages[2]) || DEFAULT_SERVICE_IMAGE}
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

                            {/* Overlay for "View All" */}
                            {displayImages[2] && (
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
        </div>
    )
}
