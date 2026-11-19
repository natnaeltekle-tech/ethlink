import { revalidatePath } from 'next/cache'

/** Refresh every workspace page that shows bookings, jobs, services or the profile. */
export function revalidateWorkspaces() {
    revalidatePath('/provider', 'layout')
    revalidatePath('/profile', 'layout')
    revalidatePath('/bookings')
    revalidatePath('/saved')
}
