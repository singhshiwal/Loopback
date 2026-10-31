import { createClient } from '@supabase/supabase-js'

// Public values (safe in the browser). Kept hardcoded on purpose: reading them
// from NEXT_PUBLIC_* env vars broke the Vercel build when the var was set to a
// non-URL value.
const SUPABASE_URL = 'https://fstymtartfimrlndgkhu.supabase.co'
const ANON_KEY = 'sb_publishable_6I4nQOTb1zNV5vwRMWH5jw_adgpO803'

export const supabase = createClient(SUPABASE_URL, ANON_KEY)

// Server-only admin client. Previously this silently fell back to the anon key
// when SUPABASE_SECRET_KEY was missing (e.g. only set for Production on
// Vercel), so every "admin" query ran under RLS as anon: role lookups returned
// null and Owners got 403 / bounced to onboarding. Fail loudly instead.
const SERVICE_KEY = process.env.SUPABASE_SECRET_KEY

export const supabaseAdmin = SERVICE_KEY
  ? createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  : new Proxy({}, {
      get() {
        throw new Error('SUPABASE_SECRET_KEY is not set for this environment. Add it in Vercel -> Settings -> Environment Variables (Production AND Preview).')
      },
    })
