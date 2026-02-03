'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UploadCloud, X, Loader2, Image as ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { DEFAULT_SERVICE_IMAGE } from '@/lib/constants'

interface ImageUploaderProps {
    defaultValue?: string
    name?: string
}

export function ImageUploader({ defaultValue = '', name = 'image_url' }: ImageUploaderProps) {
    const [imageUrl, setImageUrl] = useState(defaultValue)
    const [isUploading, setIsUploading] = useState(false)
    const [dragActive, setDragActive] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            await uploadImage(file)
        }
    }

    const uploadImage = async (file: File) => {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error("Please select an image file")
            return
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image size should be less than 5MB")
            return
        }

        setIsUploading(true)
        try {
            const supabase = createClient()

            // Create a unique file name
            const fileExt = file.name.split('.').pop()
            const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
            const filePath = `${fileName}`

            // Upload
            const { error: uploadError } = await supabase.storage
                .from('service-images')
                .upload(filePath, file)

            if (uploadError) {
                throw uploadError
            }

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('service-images')
                .getPublicUrl(filePath)

            // Validate that we got a valid URL
            if (!publicUrl || !publicUrl.startsWith('http')) {
                throw new Error('Failed to get valid public URL from storage')
            }

            setImageUrl(publicUrl)
            toast.success("Image uploaded successfully!")
        } catch (error) {
            console.error('Upload failed:', error)
            toast.error("Failed to upload image. Please try again.")
        } finally {
            setIsUploading(false)
        }
    }

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true)
        } else if (e.type === "dragleave") {
            setDragActive(false)
        }
    }

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            await uploadImage(e.dataTransfer.files[0])
        }
    }

    const removeImage = () => {
        setImageUrl('')
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    return (
        <div className="space-y-4">
            <Label>Service Image</Label>

            {/* Hidden Input for Form Submission */}
            <input type="hidden" name={name} value={imageUrl} />

            {!imageUrl ? (
                <div
                    className={cn(
                        "border-2 border-dashed rounded-xl p-8 transition-all text-center cursor-pointer hover:bg-muted/50",
                        dragActive ? "border-primary bg-primary/5" : "border-border",
                        isUploading ? "opacity-50 pointer-events-none" : ""
                    )}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        {isUploading ? (
                            <>
                                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                                <p className="text-sm font-medium text-foreground">Uploading...</p>
                            </>
                        ) : (
                            <>
                                <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center mb-2">
                                    <UploadCloud className="h-6 w-6" />
                                </div>
                                <p className="text-lg font-semibold text-foreground">Click to upload photo</p>
                                <p className="text-sm">or drag and drop</p>
                                <p className="text-xs text-muted-foreground mt-2">SVG, PNG, JPG or GIF (max. 5MB)</p>
                            </>
                        )}
                    </div>
                </div>
            ) : (
                <div className="relative rounded-xl overflow-hidden aspect-video border bg-muted group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={imageUrl}
                        alt="Service preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            const target = e.currentTarget as HTMLImageElement;
                            if (target.src !== DEFAULT_SERVICE_IMAGE) {
                                target.src = DEFAULT_SERVICE_IMAGE;
                            }
                        }}
                    />

                    {/* Delete button - Always visible on mobile, hover on desktop */}
                    <div className="absolute inset-0 bg-black/40 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="gap-2 min-h-[44px] min-w-[44px] touch-manipulation"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                removeImage();
                            }}
                        >
                            <X className="h-4 w-4" />
                            <span className="hidden sm:inline">Remove Photo</span>
                        </Button>
                    </div>
                </div>
            )}

            <Input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
            />
        </div>
    )
}
