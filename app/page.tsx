import HomeSplitter from '@/components/HomeSplitter'
import DesktopHome from '@/components/desktop/DesktopHome'
import { getFilteredServices } from '@/lib/actions'

export default async function Index() {
  // Fetch data from Supabase
  const services = await getFilteredServices('', '')

  return (
    <HomeSplitter 
      services={services || []} 
      desktopHome={<DesktopHome services={services || []} />} 
    />
  )
}