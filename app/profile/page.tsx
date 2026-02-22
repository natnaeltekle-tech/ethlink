import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProfileContent } from '@/components/profile/profile-content'
import { getUserBookings, getProviderStats, getProviderServices, getProfile } from '@/lib/actions'

export default async function ProfilePage() {
  const supabase = await createClient()

  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    // Expired/corrupt session — treat as logged out
  }

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
