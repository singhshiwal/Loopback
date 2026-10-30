import Head from 'next/head'
import { useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import { globalCSS } from '../styles/theme'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    if (!email || !password) { setError('Email and password are required.'); return }
    setLoading(true)

    const cleanEmail = email.trim().toLowerCase()
    const { error: loginError } = await supabase.auth.signInWithPassword({ email: cleanEmail, password })

    if (loginError) {
      // Account was created but the signup code was never entered.
      if (/not confirmed/i.test(loginError.message || '')) {
        await supabase.auth.resend({ type: 'signup', email: cleanEmail })
        sessionStorage.setItem('lb_pending_email', cleanEmail)
        router.push('/verify')
        return
      }
      setError(loginError.message || 'Invalid email or password.')
      setLoading(false)
      return
    }

    // Password is correct. Second factor: drop this password session and
    // email a 6-digit code; the session is only created once the code is
    // verified on /verify-login.
    await supabase.auth.signOut()
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: { shouldCreateUser: false },
    })
    if (otpError) {
      setError(otpError.message || 'Could not send the sign-in code. Please try again in a minute.')
      setLoading(false)
      return
    }

    sessionStorage.setItem('lb_pending_email', cleanEmail)
    router.push('/verify-login')
  }

  return (
    <>
      <Head>
        <title>Sign in — Ticktology</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </Head>
      <style dangerouslySetInnerHTML={{ __html: globalCSS }} />

      <div className="auth-wrap">
        <div className="auth-card">
          <div className="auth-logo"><div className="auth-logo-dot" />Ticktology</div>
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-sub">Sign in to your Ticktology workspace.</p>

          {error && <div className="msg msg-error">{error}</div>}

          <form onSubmit={handleLogin}>
            <div className="field">
              <label>Work email</label>
              <input type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} autoFocus />
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" placeholder="Your password" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in →'}
            </button>
          </form>

          <p style={{ marginTop: '20px', fontSize: '0.8rem', color: 'var(--text3)', textAlign: 'center' }}>
            Do not have an account? <a href="/signup">Sign up free</a>
          </p>
        </div>
      </div>
    </>
  )
}
