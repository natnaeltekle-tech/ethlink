'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export function AddLinkButton() {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)

  // Prefetch the route on component mount for instant navigation
  useEffect(() => {
    router.prefetch('/services/new')
  }, [router])

  const handleClick = useCallback(() => {
    // Set pending state FIRST for instant feedback
    setIsPending(true)
    
    // Prevent double-clicks by checking if already pending
    if (isPending) return
    
    // Navigate to service creation page
    try {
      router.push('/services/new')
    } catch (error) {
      console.error('Navigation failed:', error)
      toast.error('Failed to navigate. Please try again.')
      setIsPending(false)
    }
    
    // Reset pending state after navigation timeout (in case navigation is slow)
    setTimeout(() => {
      setIsPending(false)
    }, 3000)
  }, [isPending, router])

  return (
    <Button 
      onClick={handleClick} 
      disabled={isPending}
      aria-label="Add new service"
      className="bg-primary text-black rounded-full h-12 w-12 flex items-center justify-center shadow-lg hover:scale-105 transition-transform disabled:opacity-70 disabled:cursor-not-allowed"
    >
      {isPending ? (
        <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
      ) : (
        <Plus className="h-6 w-6" aria-hidden="true" />
      )}
    </Button>
  )
}