import Head from 'next/head'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'
import { globalCSS } from '../../styles/theme'

export default function OnboardingReady() {
  const router = useRouter()
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    async function triggerFirstDigest() {
      const workspaceId = sessionStorage.getItem('lb_workspace_id')
      if (!workspaceId) { setStatus('done'); return }

      try {
        await fetch('/api/digest', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-loopback-secret': process.env.NEXT_PUBLIC_CRON_SECRET || '',
          },
          body: JSON.stringify({ workspace_id: workspaceId }),
        })
      } catch (e) {
        console.log('First digest trigger failed silently:', e)
      }

      setStatus('done')
    }

    triggerFirstDigest()
  }, [])

  return (
    <>
      <Head>
        <title>You are all set — Loopback</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </Head>
      <style dangerouslySetInnerHTML={{ __html: globalCSS }} />
      <style dangerouslySetInnerHTML={{ __html: `
        .ready-wrap {
          min-height: 100vh;
          display: flex; align-items: center; justify-content: center;
          padding: 2rem; text-align: center;
        }
        .ready-inner { max-width: 480px; }
        .ready-icon { font-size: 3rem; margin-bottom: 20px; }
        .ready-title {
          font-size: 1.8rem; font-weight: 800;
          letter-spacing: -0.03em; margin-bottom: 12px;
        }
        .ready-sub { font-size: 0.95rem; color: var(--text2); line-height: 1.7; margin-bottom: 28px; }
        .ready-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 28px; }
        .ready-card {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 10px; padding: 16px; text-align: left;
        }
        .ready-card-icon { font-size: 1.2rem; margin-bottom: 8px; }
        .ready-card-title { font-size: 0.83rem; font-weight: 600; margin-bottom: 4px; }
        .ready-card-desc { font-size: 0.75rem; color: var(--text2); line-height: 1.5; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner {
          width: 20px; height: 20px;
          border: 2px solid var(--border2);
          border-top-color: var(--blue);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 12px;
        }
      ` }} />

      <div className="ready-wrap">
        <div className="ready-inner">
          {status === 'loading' ? (
            <>
              <div className="spinner" />
              <p style={{ color: 'var(--text2)', fontSize: '0.9rem' }}>Generating your first digest...</p>
            </>
          ) : (
            <>
              <div className="ready-icon">🎉</div>
              <h1 className="ready-title">You are all set.</h1>
              <p className="ready-sub">
                Loopback is now connected to your support tool. Your first digest has been triggered —
                check your Slack and email. Every Monday at 8 AM, your digest will arrive automatically.
              </p>

              <div className="ready-cards">
                <div className="ready-card">
                  <div className="ready-card-icon">📩</div>
                  <div className="ready-card-title">Check Slack</div>
                  <div className="ready-card-desc">Your first digest was just sent to your connected channel.</div>
                </div>
                <div className="ready-card">
                  <div className="ready-card-icon">📧</div>
                  <div className="ready-card-title">Check email</div>
                  <div className="ready-card-desc">The digest was also sent to your account email.</div>
                </div>
                <div className="ready-card">
                  <div className="ready-card-icon">📅</div>
                  <div className="ready-card-title">Every Monday</div>
                  <div className="ready-card-desc">Digest delivered automatically at 8 AM before sprint planning.</div>
                </div>
                <div className="ready-card">
                  <div className="ready-card-icon">⚙️</div>
                  <div className="ready-card-title">Manage settings</div>
                  <div className="ready-card-desc">Update integrations and billing from your dashboard.</div>
                </div>
              </div>

              <button
                className="btn btn-primary"
                onClick={() => router.push('/dashboard')}
                style={{ maxWidth: '280px', margin: '0 auto' }}
              >
                Go to dashboard →
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}
