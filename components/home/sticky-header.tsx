'use client'

import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Haptics } from '@/lib/haptics'
import { useState } from 'react'

export function StickyHeader() {
  const [notificationCount] = useState(3) // Mock notification count

  return (
    <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-gradient-gold">Eth-Links</h1>
        </div>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => Haptics.light()}
          className="relative"
        >
          <Bell className="h-6 w-6 text-foreground" />
          {notificationCount > 0 && (
            <span className="absolute top-1 right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}
        </Button>
      </div>
    </div>
  )
}
