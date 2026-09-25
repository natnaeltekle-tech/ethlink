import {
  getAdminStats,
  getRecentServices,
  getRecentBookings,
  getPendingPaymentBookings,
} from '@/lib/admin-actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Briefcase, Calendar, Banknote } from 'lucide-react'
import { DeleteServiceButton } from '@/components/admin/delete-service-button'
import { ConfirmPaymentButton } from '@/components/admin/confirm-payment-button'
import Link from 'next/link'
import { isSimulationMode } from '@/lib/payment-mode'

export default async function AdminDashboard() {
  const stats = await getAdminStats()
  const recentServices = await getRecentServices()
  const recentBookings = await getRecentBookings()
  const pendingPayments = await getPendingPaymentBookings()
  const simulation = isSimulationMode()

  if (!stats) {
    return <div className="p-8 text-center">Loading admin data...</div>
  }

  return (
    <div className="space-y-8">
      {simulation && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
          <strong>Payment mode: simulation.</strong> Live Chapa is off. Confirm
          bank / offline transfers below with <em>Confirm paid</em>. Set{' '}
          <code className="text-xs">PAYMENT_MODE=live</code> and{' '}
          <code className="text-xs">CHAPA_SECRET_KEY</code> when regs are ready.
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">Registered users (approx)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Services</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalServices}</div>
            <p className="text-xs text-muted-foreground">Active listings</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBookings}</div>
            <p className="text-xs text-muted-foreground">All time bookings</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platform Revenue</CardTitle>
            <span className="font-bold text-green-600">ETB</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.totalRevenue?.toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">Total Commission (10%)</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending payments — simulation / offline confirm */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            Pending payment confirmation
          </CardTitle>
          <span className="text-sm text-muted-foreground">
            {pendingPayments.length} pending
          </span>
        </CardHeader>
        <CardContent>
          {pendingPayments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No pending bookings waiting for payment confirmation.
            </p>
          ) : (
            <div className="space-y-4">
              {pendingPayments.map((booking) => {
                const service = Array.isArray(booking.services)
                  ? booking.services[0]
                  : booking.services
                const price = service?.price
                const amountLabel =
                  price != null ? `${price} ETB` : undefined
                return (
                  <div
                    key={booking.id}
                    className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3 last:border-0 last:pb-0"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {service?.title || 'Unknown service'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {amountLabel && (
                          <span className="font-medium text-foreground">
                            {amountLabel}
                          </span>
                        )}
                        {amountLabel && ' · '}
                        Ref {booking.id.slice(0, 8).toUpperCase()} ·{' '}
                        {new Date(booking.created_at).toLocaleString()}
                      </p>
                    </div>
                    <ConfirmPaymentButton
                      bookingId={booking.id}
                      amountLabel={amountLabel}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {recentServices.length === 0 ? (
                <p className="text-sm text-muted-foreground">No services found.</p>
              ) : (
                recentServices.map((service) => (
                  <div key={service.id} className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">
                        <Link href={`/services/${service.id}`} className="hover:underline">
                          {service.title}
                        </Link>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {service.category} • {service.price} ETB
                      </p>
                    </div>
                    <DeleteServiceButton id={service.id} title={service.title} />
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {recentBookings.length === 0 ? (
                <p className="text-sm text-muted-foreground">No bookings found.</p>
              ) : (
                recentBookings.map((booking) => (
                  <div key={booking.id} className="flex items-center">
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {Array.isArray(booking.services)
                          ? booking.services[0]?.title
                          : booking.services?.title || 'Unknown Service'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(booking.date).toLocaleDateString()} •
                        <span
                          className={`ml-2 capitalize ${
                            booking.status === 'paid' || booking.status === 'confirmed'
                              ? 'text-green-600'
                              : 'text-yellow-600'
                          }`}
                        >
                          {booking.status}
                        </span>
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
