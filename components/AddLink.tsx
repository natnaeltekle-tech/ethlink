'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

export function AddLinkButton() {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)

  const handleClick = () => {
    // 1. Instant Feedback (Vibe)
    setIsPending(true)
    
    // 2. Navigate immediately
    router.push('/services/new')
  }

  return (
    <Button 
      onClick={handleClick} 
      disabled={isPending}
      className="bg-primary text-black rounded-full h-12 w-12 flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
    >
      {isPending ? (
        <span className="animate-spin">⌛</span>
      ) : (
        <Plus className="h-6 w-6" />
      )}
    </Button>
  )
}