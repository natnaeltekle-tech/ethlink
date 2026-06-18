import { createClient } from '@supabase/supabase-js'
import { Database } from '../lib/types/database'

const supabase = createClient<Database>('https://example.com', 'key')

async function test() {
    const { data, error } = await supabase.from('services').select('*')
    if (data) {
        data.forEach(item => {
            console.log(item.id)
        })
    }
}
