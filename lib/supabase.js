import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fstymtartfimrlndgkhu.supabase.co'
const ANON_KEY = 'sb_publishable_6I4nQOTb1zNV5vwRMWH5jw_adgpO803'
const SERVICE_KEY = process.env.SUPABASE_SECRET_KEY || ANON_KEY

export const supabase = createClient(SUPABASE_URL, ANON_KEY)
export const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY)
