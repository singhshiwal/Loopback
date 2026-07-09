import { createClient } from '@supabase/supabase-js'

// Public client — safe to use in browser and API routes for non-sensitive reads
export const supabase = createClient(
  process.env.NEXT_PUBLIC_testing_SUPABASE_URL,
  process.env.NEXT_PUBLIC_testing_SUPABASE_ANON_KEY
)

// Admin client — server-side only, never expose to browser
// Uses service role key which bypasses Row Level Security
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_testing_SUPABASE_URL,
  process.env.testing_SUPABASE_SERVICE_ROLE_KEY
)
