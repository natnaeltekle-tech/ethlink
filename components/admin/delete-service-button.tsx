'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { adminDeleteService } from '@/lib/admin-actions'
import { toast } from 'sonner'

export function DeleteServiceButton({ id, title }: { id: string, title: string }) {
    const [isDeleting, setIsDeleting] = useState(false)

    const handleDelete = async () => {
        if (!confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
            return
        }

        setIsDeleting(true)
        try {
            await adminDeleteService(id)
            toast.success(`Service "${title}" deleted successfully`)
        } catch (error) {
            console.error('Delete failed:', error)
            toast.error("Failed to delete service")
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
        >
            <Trash2 className="h-4 w-4 mr-2" />
            {isDeleting ? 'Deleting...' : 'Delete'}
        </Button>
    )
}
