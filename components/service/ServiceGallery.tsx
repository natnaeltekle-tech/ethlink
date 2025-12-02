import Image from 'next/image'

interface ServiceGalleryProps {
    images: string[] | null
    title: string
}

export function ServiceGallery({ images, title }: ServiceGalleryProps) {
    // Placeholder images if none provided
    const displayImages = images && images.length > 0
        ? images
        : ['/placeholder-service.jpg'] // We might need a real placeholder or handle this better

    return (
        <div className="space-y-4">
            <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-muted">
                {/* Main Image */}
                {displayImages[0] ? (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                        {/* Using a div placeholder if no actual image URL is valid or available for now to avoid next/image errors with external domains if not configured */}
                        {/* In a real app, we'd use next/image with a valid src */}
                        <span className="text-lg">Image for {title}</span>
                    </div>
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                        No Image Available
                    </div>
                )}
            </div>
            {/* Thumbnails could go here */}
        </div>
    )
}
