import { createClient } from '@/lib/supabase/server'

export default async function Page() {
  const supabase = await createClient()
  const { data: notes } = await supabase.from('notes').select()

  return (
    // This outer div adds padding to the whole page
    <div className="flex-1 w-full flex flex-col gap-10 items-center p-10">
      
      <h1 className="text-4xl font-bold text-foreground">
        My Notes
      </h1>

      {/* This creates a grid layout for your notes */}
      <div className="w-full max-w-2xl grid gap-4">
        
        {/* This takes the list of notes and makes a "Card" for each one */}
        {notes?.map((note) => (
          <div 
            key={note.id} 
            className="p-6 bg-card border border-border rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <p className="text-lg font-medium">{note.title}</p>
            <p className="text-sm text-gray-500 mt-2">ID: {note.id}</p>
          </div>
        ))}

        {!notes?.length && (
          <p className="text-center text-gray-500">No notes found.</p>
        )}
        
      </div>

      {/* Example of a UI Button */}
      <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
        Add New Note (Example Button)
      </button>

    </div>
  )
}