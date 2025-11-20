import { createClient } from '@/utils/supabase/server'; // or @/lib/supabase/server depending on your folder structure

export default async function Notes() {
  const supabase = await createClient();
  const { data: notes } = await supabase.from("notes").select();

  return (
    <div style={{ padding: '50px' }}>
      <h1>My Notes</h1>
      <pre>{JSON.stringify(notes, null, 2)}</pre>
    </div>
  );
}