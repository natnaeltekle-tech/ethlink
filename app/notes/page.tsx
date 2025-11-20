import { createClient } from '@/utils/supabase/server' // Note: check your path, it might be @/lib/supabase/server depending on your starter

export default async function Page() {
  const supabase = await createClient()
  const { data: notes } = await supabase.from('notes').select()

  return <pre>{JSON.stringify(notes, null, 2)}</pre>
}