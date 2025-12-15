import Image from 'next/image'

interface ServiceGalleryProps {
    imageUrl: string | null
    title: string
}

export function ServiceGallery({ imageUrl, title }: ServiceGalleryProps) {
    // Construct full URL: if not http/https, assume it's a filename in Supabase storage
    const fullImageUrl = imageUrl?.startsWith('http')
        ? imageUrl
        : imageUrl
            ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/service-images/${imageUrl}`
            : null

    return (
        <div className="space-y-4">
            <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-muted group">
                {fullImageUrl ? (
                    <Image
                        src={fullImageUrl}
                        alt={title}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                        priority
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-secondary text-muted-foreground/50">
                        <div className="flex flex-col items-center gap-2">
                            <span className="text-4xl opacity-50">📷</span>
                            <span>No Image Available</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
