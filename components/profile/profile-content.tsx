'use client'

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { User, Building2, Settings } from 'lucide-react'
import { Haptics } from '@/lib/haptics'
import { cn } from '@/lib/utils'

interface ProfileContentProps {
  user: any
  bookings: any[]
  providerStats: any
  providerServices: any[]
  profile: any
}

export function ProfileContent({
  user,
  bookings,
  providerStats,
  providerServices,
  profile,
}: ProfileContentProps) {
  const { theme, setTheme } = useTheme()
  const [isVendorMode, setIsVendorMode] = useState(false)

  useEffect(() => {
    // Check if vendor mode is enabled (you can store this in localStorage or user profile)
    const vendorMode = localStorage.getItem('vendorMode') === 'true'
    setIsVendorMode(vendorMode)
    
    // Apply theme based on vendor mode
    if (vendorMode) {
      document.documentElement.setAttribute('data-theme', 'purple')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
  }, [])

  const handleVendorToggle = (checked: boolean) => {
    Haptics.medium()
    setIsVendorMode(checked)
    localStorage.setItem('vendorMode', checked.toString())
    
    // Apply theme change
    if (checked) {
      document.documentElement.setAttribute('data-theme', 'purple')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="px-4 py-4">
          <h1 className="text-2xl font-bold mb-4">Profile</h1>
        </div>
      </div>

      {/* Profile Info */}
      <div className="p-4 space-y-6">
        {/* User Info Card */}
        <div className="p-6 bg-card border border-border rounded-xl">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">{user.email}</h2>
              <p className="text-sm text-muted-foreground">
                {profile?.full_name || 'User'}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
            <div>
              <p className="text-sm text-muted-foreground">Bookings</p>
              <p className="text-2xl font-bold">{bookings.length}</p>
            </div>
            {providerStats && (
              <div>
                <p className="text-sm text-muted-foreground">Services</p>
                <p className="text-2xl font-bold">{providerServices.length}</p>
              </div>
            )}
          </div>
        </div>

        {/* Vendor Switch */}
        <div className="p-6 bg-card border border-border rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <Label htmlFor="vendor-mode" className="text-base font-semibold cursor-pointer">
                  Vendor Mode
                </Label>
                <p className="text-sm text-muted-foreground">
                  Switch to business theme
                </p>
              </div>
            </div>
            <Switch
              id="vendor-mode"
              checked={isVendorMode}
              onCheckedChange={handleVendorToggle}
              className="data-[state=checked]:bg-purple-500"
            />
          </div>
        </div>

        {/* Settings Section */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold px-2">Settings</h3>
          <div className="space-y-2">
            <button className="w-full p-4 bg-card border border-border rounded-xl text-left hover:bg-secondary/50 transition-colors flex items-center gap-3">
              <Settings className="w-5 h-5 text-muted-foreground" />
              <span>Account Settings</span>
            </button>
            {providerStats && (
              <button className="w-full p-4 bg-card border border-border rounded-xl text-left hover:bg-secondary/50 transition-colors flex items-center gap-3">
                <Building2 className="w-5 h-5 text-muted-foreground" />
                <span>Manage Services</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
