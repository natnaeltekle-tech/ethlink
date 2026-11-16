import { redirect } from 'next/navigation'

export default function RequestsPage() {
    redirect('/dashboard?mode=provider&tab=requests')
}
