import { supabaseAdmin } from '../../lib/supabase'
import { sendWaitlistConfirmation } from '../../lib/resend'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, source = 'landing_page' } = req.body

  // Validate
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' })
  }

  try {
    // Insert into Supabase — ignore duplicate emails gracefully
    const { error } = await supabaseAdmin
      .from('waitlist')
      .upsert({ email: email.toLowerCase().trim(), source }, { onConflict: 'email', ignoreDuplicates: true })

    if (error) {
      console.error('Supabase waitlist error:', error)
      return res.status(500).json({ error: 'Failed to add to waitlist' })
    }

    // Send confirmation email (non-blocking — don't fail if Resend is down)
    try {
      await sendWaitlistConfirmation(email)
    } catch (emailError) {
      console.error('Resend confirmation error (non-fatal):', emailError)
    }

    return res.status(200).json({ success: true, message: 'Added to waitlist' })
  } catch (err) {
    console.error('Waitlist handler error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
