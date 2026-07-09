import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_testing_SUPABASE_URL

export const supabase = createClient(
  SUPABASE_URL,
  process.env.SUPABASE_PUBLISHABLE_KEY
)

export const supabaseAdmin = createClient(
  SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)
