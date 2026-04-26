import HomeSplitter from '@/components/HomeSplitter'
import DesktopHome from '@/components/desktop/DesktopHome'

export default async function Index() {
  // Fetch data from Supabase here
  const services: any[] = []

  return (
    <HomeSplitter 
      services={services} 
      desktopHome={<DesktopHome services={services} />} 
    />
  )
}