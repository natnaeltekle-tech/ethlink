import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/navbar'
import { getMyServiceForEdit } from '@/lib/actions/service-edit'
import { ServiceEditForm } from './service-edit-form'

export const dynamic = 'force-dynamic'

export default async function EditServicePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()
    let user = null
    try { const { data } = await supabase.auth.getUser(); user = data.user } catch { /* no session */ }
    if (!user) redirect(`/auth/login?next=/services/${id}/edit`)

    const data = await getMyServiceForEdit(id)
    if (!data) notFound()

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Navbar hideSearch />
            <ServiceEditForm userId={data.userId} service={data.service} />
        </div>
    )
}
