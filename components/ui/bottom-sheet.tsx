'use client'

import * as React from 'react'
import { motion, AnimatePresence, PanInfo } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Haptics } from '@/lib/haptics'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
  snapPoints?: number[]
  initialSnap?: number
}

const DEFAULT_SNAP_POINTS = [0.25, 0.5, 0.9] // 25%, 50%, 90% of screen height

export function BottomSheet({
  isOpen,
  onClose,
  children,
  title,
  snapPoints = DEFAULT_SNAP_POINTS,
  initialSnap = 0,
}: BottomSheetProps) {
  const [currentSnap, setCurrentSnap] = React.useState(initialSnap)
  const constraintsRef = React.useRef<HTMLDivElement>(null)

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const velocity = info.velocity.y
    const offset = info.offset.y
    const sheetHeight = window.innerHeight

    // If dragged down significantly or with high velocity, close
    if (offset > sheetHeight * 0.15 || velocity > 300) {
      Haptics.medium()
      onClose()
      return
    }

    // Determine which snap point to use based on current position
    const currentY = Math.abs(offset) / sheetHeight
    let targetSnap = currentSnap

    // If dragged up significantly, go to next snap point
    if (velocity < -300 && currentSnap < snapPoints.length - 1) {
      targetSnap = currentSnap + 1
      Haptics.light()
    } else if (velocity > 300 && currentSnap > 0) {
      // If dragged down, go to previous snap point
      targetSnap = currentSnap - 1
      Haptics.light()
    } else {
      // Find the closest snap point based on position
      for (let i = 0; i < snapPoints.length; i++) {
        if (currentY <= snapPoints[i] + 0.1) {
          targetSnap = i
          break
        }
      }
    }

    setCurrentSnap(targetSnap)
  }

  const currentHeight = snapPoints[currentSnap] * 100

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          />

          {/* Bottom Sheet */}
          <motion.div
            ref={constraintsRef}
            initial={{ y: '100%' }}
            animate={{ y: `${100 - currentHeight}%` }}
            exit={{ y: '100%' }}
            transition={{
              type: 'spring',
              damping: 30,
              stiffness: 300,
            }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.1}
            onDragEnd={handleDragEnd}
            className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border rounded-t-3xl shadow-2xl"
            style={{ height: `${currentHeight}%`, maxHeight: '95vh' }}
          >
            {/* Drag Handle */}
            <div className="flex flex-col items-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
            </div>

            {/* Header */}
            {title && (
              <div className="flex items-center justify-between px-6 pb-4">
                <h2 className="text-xl font-bold text-foreground">{title}</h2>
                <button
                  onClick={() => {
                    Haptics.light()
                    onClose()
                  }}
                  className="p-2 rounded-full hover:bg-secondary transition-colors"
                >
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>
            )}

            {/* Content */}
            <div className="overflow-y-auto h-full pb-6 px-6">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
