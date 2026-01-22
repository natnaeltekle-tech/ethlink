'use client'

import { useState, useEffect } from 'react'
import { getUserBookings } from '@/lib/actions'
import { Calendar, MapPin, Clock, CheckCircle2, AlertCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Haptics } from '@/lib/haptics'
// Date formatting helper
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
}

const STATUS_COLORS = {
  pending: '#FBBF24', // Yellow
  confirmed: '#22C55E', // Green
  completed: '#3B82F6', // Blue
  cancelled: '#EF4444', // Red
}

export default function RequestsPage() {
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming')

  useEffect(() => {
    async function fetchBookings() {
      try {
        const data = await getUserBookings()
        setBookings(data || [])
      } catch (error) {
        console.error('Error fetching bookings:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchBookings()
  }, [])

  const upcomingBookings = bookings.filter(
    (b) => b.status !== 'completed' && b.status !== 'cancelled'
  )
  const historyBookings = bookings.filter(
    (b) => b.status === 'completed' || b.status === 'cancelled'
  )

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return STATUS_COLORS.pending
      case 'confirmed':
        return STATUS_COLORS.confirmed
      case 'completed':
        return STATUS_COLORS.completed
      case 'cancelled':
        return STATUS_COLORS.cancelled
      default:
        return STATUS_COLORS.pending
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return AlertCircle
      case 'confirmed':
        return CheckCircle2
      case 'completed':
        return CheckCircle2
      case 'cancelled':
        return AlertCircle
      default:
        return Info
    }
  }

  const displayBookings = activeTab === 'upcoming' ? upcomingBookings : historyBookings

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="px-4 py-4">
          <h1 className="text-2xl font-bold mb-4">My Requests</h1>

          {/* Segmented Controls */}
          <div className="flex gap-2 bg-secondary p-1 rounded-lg">
            <button
              onClick={() => {
                Haptics.light()
                setActiveTab('upcoming')
              }}
              className={cn(
                'flex-1 py-2 px-4 rounded-md font-medium transition-all',
                activeTab === 'upcoming'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Upcoming
            </button>
            <button
              onClick={() => {
                Haptics.light()
                setActiveTab('history')
              }}
              className={cn(
                'flex-1 py-2 px-4 rounded-md font-medium transition-all',
                activeTab === 'history'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              History
            </button>
          </div>
        </div>
      </div>

      {/* Bookings List */}
      <div className="p-4 space-y-4">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : displayBookings.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {activeTab === 'upcoming'
              ? 'No upcoming bookings'
              : 'No booking history'}
          </div>
        ) : (
          displayBookings.map((booking) => {
            const StatusIcon = getStatusIcon(booking.status)
            const statusColor = getStatusColor(booking.status)

            return (
              <div
                key={booking.id}
                className="p-4 bg-card border border-border rounded-xl"
              >
                {/* Status Badge */}
                <div className="flex items-center justify-between mb-3">
                  <div
                    className="flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold"
                    style={{
                      backgroundColor: `${statusColor}20`,
                      color: statusColor,
                    }}
                  >
                    <StatusIcon className="w-4 h-4" />
                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                  </div>
                </div>

                {/* Service Title */}
                <h3 className="font-bold text-lg mb-2">{booking.services?.title || 'Service'}</h3>

                {/* Date */}
                {booking.date && (
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">
                      {formatDate(booking.date)}
                    </span>
                  </div>
                )}

                {/* Price */}
                {booking.services?.price && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Price</span>
                      <span className="text-xl font-bold text-primary">
                        ETB {booking.services.price.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
