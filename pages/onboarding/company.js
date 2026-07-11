import Head from 'next/head'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase, supabaseAdmin } from '../../lib/supabase'
import { globalCSS } from '../../styles/theme'

export default function OnboardingCompany() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [size, setSize] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.push('/login')
    })
  }, [])

  async function handleNext(e) {
    e.preventDefault()
    if (!name.trim()) { setError('Company name is required.'); return }
    setLoading(true)
    setError('')

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }

    // Create workspace
    const { data: workspace, error: wsError } = await supabaseAdmin
      .from('workspaces')
      .upsert({
        owner_email: session.user.email,
        name: name.trim(),
        plan: 'free',
      }, { onConflict: 'owner_email', ignoreDuplicates: false })
      .select()
      .single()

    if (wsError) {
      setError('Failed to save. Please try again.')
      setLoading(false)
      return
    }

    sessionStorage.setItem('lb_workspace_id', workspace.id)
    router.push('/onboarding/connect')
  }

  return (
    <>
      <Head>
        <title>Set up your workspace — Loopback</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </Head>
      <style dangerouslySetInnerHTML={{ __html: globalCSS }} />

      <div className="auth-wrap">
        <div className="auth-card">
          <div className="auth-logo"><div className="auth-logo-dot" />Loopback</div>

          <div className="progress-bar-wrap">
            <div className="progress-step done" />
            <div className="progress-step active" />
            <div className="progress-step" />
            <div className="progress-step" />
            <div className="progress-step" />
          </div>

          <div className="step-label">Step 1 of 4</div>
          <h1 className="auth-title">Set up your workspace</h1>
          <p className="auth-sub">Tell us about your company so we can personalise your digest.</p>

          {error && <div className="msg msg-error">{error}</div>}

          <form onSubmit={handleNext}>
            <div className="field">
              <label>Company name</label>
              <input
                type="text"
                placeholder="Acme Inc."
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="field">
              <label>Team size</label>
              <select value={size} onChange={e => setSize(e.target.value)}>
                <option value="">Select size</option>
                <option>1–5</option>
                <option>6–20</option>
                <option>21–50</option>
                <option>51–200</option>
                <option>200+</option>
              </select>
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Continue →'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
