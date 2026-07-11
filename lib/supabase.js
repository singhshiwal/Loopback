import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fstymtartfimrlndgkhu.supabase.co'
const ANON_KEY = 'YOUR_PUBLISHABLE_KEY'
const SERVICE_KEY = process.env.SUPABASE_SECRET_KEY

export const supabase = createClient(SUPABASE_URL, ANON_KEY)
export const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY)
