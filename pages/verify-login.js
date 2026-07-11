import Head from 'next/head'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import { globalCSS } from '../styles/theme'

export default function VerifyLogin() {
  const router = useRouter()
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const inputs = useRef([])

  useEffect(() => {
    const e = sessionStorage.getItem('lb_pending_email')
    if (e) setEmail(e)
  }, [])

  function handleChange(val, idx) {
    if (!/^\d*$/.test(val)) return
    const next = [...otp]
    next[idx] = val.slice(-1)
    setOtp(next)
    if (val && idx < 5) inputs.current[idx + 1]?.focus()
  }

  function handleKeyDown(e, idx) {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) inputs.current[idx - 1]?.focus()
  }

  function handlePaste(e) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) { setOtp(pasted.split('')); inputs.current[5]?.focus() }
  }

  async function handleVerify() {
    const code = otp.join('')
    if (code.length !== 6) { setError('Enter the 6-digit code from your email.'); return }
    setLoading(true)
    setError('')

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'email',
    })

    if (verifyError) {
      setError(verifyError.message || 'Invalid code. Please try again.')
      setLoading(false)
      return
    }

    sessionStorage.removeItem('lb_pending_email')
    router.push('/dashboard')
  }

  return (
    <>
      <Head>
        <title>Verify sign in — Loopback</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </Head>
      <style dangerouslySetInnerHTML={{ __html: globalCSS }} />

      <div className="auth-wrap">
        <div className="auth-card">
          <div className="auth-logo"><div className="auth-logo-dot" />Loopback</div>
          <h1 className="auth-title">Check your email</h1>
          <p className="auth-sub">
            We sent a 6-digit sign-in code to <strong style={{ color: 'var(--text)' }}>{email}</strong>.
          </p>

          {error && <div className="msg msg-error">{error}</div>}

          <div className="otp-grid" onPaste={handlePaste}>
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={el => inputs.current[i] = el}
                className={`otp-input${digit ? ' filled' : ''}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleChange(e.target.value, i)}
                onKeyDown={e => handleKeyDown(e, i)}
                autoFocus={i === 0}
              />
            ))}
          </div>

          <button className="btn btn-primary" onClick={handleVerify} disabled={loading}>
            {loading ? 'Verifying...' : 'Sign in →'}
          </button>
        </div>
      </div>
    </>
  )
}
