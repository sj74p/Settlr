import { describe, it, expect } from 'vitest'
import { supabase } from '../src/lib/supabaseClient'

describe('Supabase Connection', () => {
  it('should connect to the Supabase API', async () => {
    // We try to fetch from the groups table. 
    // Even if it's empty, a 200 OK response from Supabase confirms the URL and Key are valid.
    const { data, error } = await supabase.from('groups').select('*').limit(1)
    
    if (error) {
      console.error('Supabase Error:', error)
    }
    
    expect(error).toBeNull()
    expect(Array.isArray(data)).toBe(true)
  })
})
