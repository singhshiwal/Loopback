import { supabaseAdmin } from '../../lib/supabase'
import { sendEarlyAccessConfirmation } from '../../lib/resend'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, company, role, support_tool, ticket_volume, note } = req.body

  // Validate
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' })
  }
  if (!company) {
    return res.status(400).json({ error: 'Company name required' })
  }

  try {
    // Insert into Supabase
    const { error } = await supabaseAdmin
      .from('early_access')
      .insert({
        email: email.toLowerCase().trim(),
        company: company.trim(),
        role: role || null,
        support_tool: support_tool || null,
        ticket_volume: ticket_volume || null,
        note: note || null,
        source: 'early_access_modal',
      })

    if (error) {
      console.error('Supabase early access error:', error)
      return res.status(500).json({ error: 'Failed to save request' })
    }

    // Send confirmation email (non-blocking)
    try {
      await sendEarlyAccessConfirmation(email, company)
    } catch (emailError) {
      console.error('Resend confirmation error (non-fatal):', emailError)
    }

    return res.status(200).json({ success: true, message: 'Early access request received' })
  } catch (err) {
    console.error('Early access handler error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
