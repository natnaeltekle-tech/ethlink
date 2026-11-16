"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { isChatThreadPath } from "@/lib/hooks/use-unread-messages"
import { X } from "lucide-react"

export function GlobalBanner() {
    const [isVisible, setIsVisible] = useState(true)
    const pathname = usePathname()

    if (!isVisible || isChatThreadPath(pathname)) return null

    return (
        <div className="bg-primary text-black px-4 py-2 text-sm font-medium relative z-[100]">
            <div className="container mx-auto flex items-center justify-between gap-4">
                <p className="text-center flex-1">
                    🚧 Eth-Links Beta: Feel free to list and book services!
                </p>
                <button
                    onClick={() => setIsVisible(false)}
                    className="hover:bg-black/10 rounded-full p-1 transition-colors"
                    aria-label="Close banner"
                    suppressHydrationWarning
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>
    )
}
