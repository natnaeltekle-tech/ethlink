'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Haptics } from '@/lib/haptics'

const categories = [
  { label: 'Hotels', icon: '🏨', href: '/search?category=Hospitality', color: 'bg-blue-500' },
  { label: 'Transport', icon: '🚗', href: '/search?category=Transport', color: 'bg-green-500' },
  { label: 'Cleaning', icon: '🧹', href: '/search?category=Home Services', color: 'bg-purple-500' },
  { label: 'Tech', icon: '💻', href: '/search?category=Tech', color: 'bg-orange-500' },
  { label: 'Events', icon: '🎉', href: '/search?category=Events', color: 'bg-pink-500' },
  { label: 'Health', icon: '🏥', href: '/search?category=Health', color: 'bg-red-500' },
  { label: 'Food', icon: '🍔', href: '/search?category=Food', color: 'bg-yellow-500' },
  { label: 'More', icon: '➕', href: '/search', color: 'bg-gray-500' },
]

export function CategoryCircles() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide px-4 -mx-4">
      {categories.map((category, index) => (
        <motion.div
          key={category.label}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
        >
          <Link
            href={category.href}
            onClick={() => Haptics.light()}
            className="flex flex-col items-center gap-2 min-w-[80px]"
          >
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                'w-16 h-16 rounded-full flex items-center justify-center text-2xl shadow-lg',
                category.color
              )}
            >
              {category.icon}
            </motion.div>
            <span className="text-xs font-medium text-foreground text-center">
              {category.label}
            </span>
          </Link>
        </motion.div>
      ))}
    </div>
  )
}
