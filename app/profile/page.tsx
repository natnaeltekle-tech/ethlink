import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProfileContent } from '@/components/profile/profile-content'
import { getUserBookings, getProviderStats, getProviderServices, getProfile } from '@/lib/actions'

export default async function ProfilePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect('/auth/login')
  }

  const bookings = await getUserBookings()
  const providerStats = await getProviderStats()
  const providerServices = await getProviderServices()
  const profile = await getProfile()

  return (
    <div className="min-h-screen bg-background pb-20">
      <ProfileContent
        user={user}
        bookings={bookings}
        providerStats={providerStats}
        providerServices={providerServices}
        profile={profile}
      />
    </div>
  )
}
