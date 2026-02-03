'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

export function AddLinkButton() {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)

  const handleClick = useCallback(() => {
    // Prevent double-clicks by checking if already pending
    if (isPending) return
    
    // Set pending state to prevent multiple triggers
    setIsPending(true)
    
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
        <span className="animate-spin" aria-hidden="true">⌛</span>
      ) : (
        <Plus className="h-6 w-6" aria-hidden="true" />
      )}
    </Button>
  )
}