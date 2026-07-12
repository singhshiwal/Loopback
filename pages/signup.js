import Head from 'next/head'
import { useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import { globalCSS } from '../styles/theme'

export default function Signup() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSignup(e) {
    e.preventDefault()
    setError('')
    if (!email || !password) { setError('Email and password are required.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    setLoading(true)

    const { error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: undefined,
        data: { signed_up_from: 'loopback' }
      }
    })

    if (signupError) {
      setError(signupError.message)
      setLoading(false)
      return
    }

    sessionStorage.setItem('lb_pending_email', email)
    router.push('/verify')
  }

  return (
    <>
      <Head>
        <title>Sign up — Loopback</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </Head>
      <style dangerouslySetInnerHTML={{ __html: globalCSS }} />
      <div className="auth-wrap">
        <div className="auth-card">
          <div className="auth-logo"><div className="auth-logo-dot" />Loopback</div>
          <h1 className="auth-title">Create your account</h1>
          <p className="auth-sub">Start turning your support tickets into product intelligence.</p>
          {error && <div className="msg msg-error">{error}</div>}
          <form onSubmit={handleSignup}>
            <div className="field">
              <label>Work email</label>
              <input type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} autoFocus />
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" placeholder="Min 8 characters" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? 'Creating account...' : 'Create account →'}
            </button>
          </form>
          <p style={{ marginTop: '20px', fontSize: '0.8rem', color: 'var(--text3)', textAlign: 'center' }}>
            Already have an account? <a href="/login">Sign in</a>
          </p>
        </div>
      </div>
    </>
  )
}
