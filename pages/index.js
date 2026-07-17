import Head from 'next/head'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

const CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#08090F;--surface:#0F111A;--surface2:#151824;
  --border:#1E2235;--border2:#252A40;
  --text:#E8EAF2;--text2:#8B90A8;--text3:#555C78;
  --blue:#3B7EFF;--blue-dim:#1A3A80;--blue-glow:rgba(59,126,255,0.14);
  --green:#10B981;--green-dim:#064E3B;
  --amber:#F59E0B;--amber-dim:#451A03;
  --red:#EF4444;--red-dim:#450A0A;
  --purple:#8B5CF6;--purple-dim:#2E1065;
  --mono:'JetBrains Mono',monospace;--sans:'Inter',sans-serif;
}
html{scroll-behavior:smooth}
body{font-family:var(--sans);background:var(--bg);color:var(--text);line-height:1.6;-webkit-font-smoothing:antialiased}
nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:0 2rem;height:60px;background:rgba(8,9,15,0.88);backdrop-filter:blur(16px);border-bottom:1px solid var(--border)}
.nav-logo{font-size:1.05rem;font-weight:700;letter-spacing:-0.02em;color:var(--text);display:flex;align-items:center;gap:8px;text-decoration:none}
.nav-dot{width:8px;height:8px;border-radius:50%;background:var(--blue);box-shadow:0 0 8px var(--blue);animation:pulse 2s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(.85)}}
.nav-right{display:flex;align-items:center;gap:10px}
.nav-signin{font-size:.85rem;font-weight:600;color:var(--text2);background:transparent;border:none;cursor:pointer;text-decoration:none;padding:7px 14px;border-radius:6px;transition:color .2s}
.nav-signin:hover{color:var(--text)}
.nav-cta{font-size:.8rem;font-weight:600;color:var(--bg);background:var(--blue);border:none;border-radius:6px;padding:7px 16px;cursor:pointer;text-decoration:none;transition:opacity .2s}
.nav-cta:hover{opacity:.85}
.hero{min-height:100vh;display:grid;grid-template-columns:1fr 1fr;gap:4rem;align-items:center;padding:100px 5% 60px;max-width:1200px;margin:0 auto}
.hero-left{max-width:520px}
.eyebrow{display:inline-flex;align-items:center;gap:8px;font-family:var(--mono);font-size:.7rem;color:var(--blue);letter-spacing:.1em;text-transform:uppercase;background:var(--blue-glow);border:1px solid var(--blue-dim);border-radius:100px;padding:5px 12px;margin-bottom:1.5rem}
.eyebrow-dot{width:5px;height:5px;border-radius:50%;background:var(--blue)}
h1{font-size:clamp(1.9rem,3.5vw,2.9rem);font-weight:800;line-height:1.1;letter-spacing:-.03em;margin-bottom:1.25rem}
h1 em{font-style:normal;background:linear-gradient(135deg,#3B7EFF,#06B6D4);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.hero-sub{font-size:1rem;color:var(--text2);line-height:1.7;margin-bottom:2rem;max-width:420px}
.hero-ctas{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:2.5rem}
.btn-primary{display:inline-flex;align-items:center;gap:8px;background:var(--blue);color:var(--bg);font-size:.9rem;font-weight:700;padding:12px 24px;border-radius:8px;border:none;cursor:pointer;text-decoration:none;transition:all .2s;box-shadow:0 0 24px rgba(59,126,255,.28)}
.btn-primary:hover{transform:translateY(-1px);box-shadow:0 0 36px rgba(59,126,255,.45)}
.btn-secondary{display:inline-flex;align-items:center;gap:8px;background:transparent;color:var(--text);font-size:.9rem;font-weight:600;padding:12px 24px;border-radius:8px;border:1px solid var(--border2);cursor:pointer;text-decoration:none;transition:all .2s}
.btn-secondary:hover{border-color:var(--blue);color:var(--blue)}
.hero-trust{display:flex;align-items:center;gap:10px;font-size:.75rem;color:var(--text3)}
.trust-dot{width:3px;height:3px;border-radius:50%;background:var(--text3)}
.digest-card{background:var(--surface);border:1px solid var(--border);border-radius:16px;overflow:hidden;box-shadow:0 0 60px rgba(59,126,255,.07),0 24px 64px rgba(0,0,0,.5)}
.dc-header{background:var(--surface2);border-bottom:1px solid var(--border);padding:13px 17px;display:flex;align-items:center;justify-content:space-between}
.dc-header-l{display:flex;align-items:center;gap:10px}
.dc-slack{width:20px;height:20px;background:#4A154B;border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:11px}
.dc-title{font-size:.78rem;font-weight:600}
.dc-time{font-family:var(--mono);font-size:.65rem;color:var(--text3)}
.dc-live{font-family:var(--mono);font-size:.62rem;background:rgba(16,185,129,.1);color:var(--green);border:1px solid rgba(16,185,129,.2);border-radius:4px;padding:2px 8px}
.dc-body{padding:15px;display:flex;flex-direction:column;gap:11px}
.dc-intro{font-size:.74rem;color:var(--text2);line-height:1.5;padding-bottom:11px;border-bottom:1px solid var(--border)}
.dc-intro strong{color:var(--text)}
.insight{background:var(--bg);border:1px solid var(--border);border-radius:9px;overflow:hidden}
.insight-top{display:flex;align-items:center;justify-content:space-between;padding:9px 13px;border-bottom:1px solid var(--border)}
.ilabel{font-family:var(--mono);font-size:.62rem;font-weight:500;letter-spacing:.05em;text-transform:uppercase}
.ilabel.pain{color:var(--red)}.ilabel.feat{color:var(--blue)}.ilabel.churn{color:var(--amber)}
.isev{font-family:var(--mono);font-size:.6rem;padding:2px 7px;border-radius:4px}
.sev-h{background:var(--red-dim);color:var(--red)}.sev-m{background:var(--blue-dim);color:var(--blue)}.sev-w{background:var(--amber-dim);color:var(--amber)}
.insight-body{padding:11px 13px}
.itheme{font-size:.82rem;font-weight:600;margin-bottom:4px}
.icount{font-family:var(--mono);font-size:.65rem;color:var(--text3);margin-bottom:8px}
.iquote{font-size:.71rem;color:var(--text2);line-height:1.5;padding:6px 9px;background:var(--surface2);border-left:2px solid var(--border2);border-radius:0 4px 4px 0;margin-bottom:4px;font-style:italic}
.dc-foot{padding:11px 15px;border-top:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;font-family:var(--mono);font-size:.63rem;color:var(--text3)}
.dc-link{color:var(--blue);text-decoration:none;font-size:.65rem}
.wrap{max-width:1200px;margin:0 auto;padding:80px 5%}
.sec-label{font-family:var(--mono);font-size:.68rem;color:var(--blue);letter-spacing:.1em;text-transform:uppercase;margin-bottom:10px}
.sec-title{font-size:clamp(1.5rem,2.8vw,2.1rem);font-weight:800;letter-spacing:-.03em;margin-bottom:.9rem}
.sec-sub{font-size:.95rem;color:var(--text2);max-width:500px;line-height:1.7;margin-bottom:2.5rem}
.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem}
.step{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:26px;transition:border-color .2s}
.step:hover{border-color:var(--blue-dim)}
.step-n{font-family:var(--mono);font-size:.68rem;color:var(--blue);margin-bottom:14px;display:flex;align-items:center;gap:8px}
.step-n::after{content:'';flex:1;height:1px;background:var(--border)}
.step-icon{font-size:1.4rem;margin-bottom:11px}
.step h3{font-size:.9rem;font-weight:700;margin-bottom:7px}
.step p{font-size:.8rem;color:var(--text2);line-height:1.6}
.vs-wrap{background:var(--surface);border-top:1px solid var(--border);border-bottom:1px solid var(--border);padding:80px 5%}
.vs-inner{max-width:1200px;margin:0 auto}
.vs-grid{display:grid;grid-template-columns:1fr 1fr;gap:3rem;margin-top:2.5rem}
.vs-col-title{font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin-bottom:14px}
.vs-col-title.bef{color:var(--text3)}.vs-col-title.aft{color:var(--green)}
.vs-item{display:flex;align-items:flex-start;gap:9px;margin-bottom:11px;font-size:.83rem;line-height:1.5}
.vs-item.bad{color:var(--text2)}.vs-item.good{color:var(--text)}
.price-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--border);border:1px solid var(--border);border-radius:12px;overflow:hidden;margin-top:2.5rem}
.price-cell{background:var(--surface2);padding:18px 20px;text-align:center}
.pc-lbl{font-size:.68rem;color:var(--text3);margin-bottom:5px;font-family:var(--mono)}
.pc-val{font-size:1.15rem;font-weight:800;letter-spacing:-.02em}
.pc-val.hi{color:var(--green)}
.pc-note{font-size:.67rem;color:var(--text3);margin-top:3px}
.pricing-section{padding:80px 5%;max-width:1200px;margin:0 auto}
.plan-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1.5rem;margin-top:2.5rem}
.plan{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:28px;display:flex;flex-direction:column;position:relative;transition:border-color .2s}
.plan:hover{border-color:var(--border2)}
.plan.featured{border-color:var(--blue);background:linear-gradient(180deg,rgba(59,126,255,.06) 0%,var(--surface) 40%)}
.plan-badge{position:absolute;top:-12px;left:50%;transform:translateX(-50%);font-family:var(--mono);font-size:.62rem;font-weight:700;color:var(--bg);background:var(--blue);border-radius:100px;padding:3px 12px;white-space:nowrap}
.plan-name{font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text3);margin-bottom:10px;font-family:var(--mono)}
.plan-price{font-size:2rem;font-weight:800;letter-spacing:-.04em;margin-bottom:4px;display:flex;align-items:flex-end;gap:4px}
.plan-price span{font-size:.85rem;font-weight:500;color:var(--text3);margin-bottom:4px}
.plan-cycle{font-size:.75rem;color:var(--text3);margin-bottom:6px}
.plan-tagline{font-size:.78rem;color:var(--text2);line-height:1.5;margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid var(--border)}
.plan-features{flex:1;display:flex;flex-direction:column;gap:9px;margin-bottom:24px}
.pf{display:flex;align-items:flex-start;gap:9px;font-size:.78rem;color:var(--text2);line-height:1.4}
.pf-check{font-size:.7rem;flex-shrink:0;margin-top:1px}
.pf.on .pf-check{color:var(--green)}.pf.off .pf-check{color:var(--text3)}.pf.off span{color:var(--text3)}
.plan-phase{font-family:var(--mono);font-size:.62rem;padding:3px 9px;border-radius:4px;display:inline-flex;align-items:center;gap:5px;margin-bottom:14px}
.phase-mvp{background:rgba(59,126,255,.1);color:var(--blue);border:1px solid var(--blue-dim)}
.phase-v11{background:rgba(16,185,129,.1);color:var(--green);border:1px solid var(--green-dim)}
.phase-v2{background:rgba(245,158,11,.1);color:var(--amber);border:1px solid var(--amber-dim)}
.phase-v3{background:rgba(139,92,246,.1);color:var(--purple);border:1px solid var(--purple-dim)}
.plan-cta{width:100%;padding:11px;border-radius:8px;font-family:var(--sans);font-size:.85rem;font-weight:700;cursor:pointer;transition:all .2s;border:none;text-decoration:none;display:block;text-align:center}
.plan-cta.solid{background:var(--blue);color:var(--bg)}
.plan-cta.solid:hover{opacity:.85}
.plan-cta.outline{background:transparent;color:var(--text);border:1px solid var(--border2)}
.plan-cta.outline:hover{border-color:var(--blue);color:var(--blue)}
.cta-section{padding:100px 5%;text-align:center;position:relative;overflow:hidden}
.cta-glow{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:600px;height:280px;background:radial-gradient(ellipse,rgba(59,126,255,.07) 0%,transparent 70%);pointer-events:none}
.cta-inner{max-width:540px;margin:0 auto;position:relative}
.cta-btns{display:flex;gap:12px;justify-content:center;margin-top:2rem;flex-wrap:wrap}
.footer-wrap{border-top:1px solid var(--border);padding:26px 5%}
.footer-inner{max-width:1200px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;font-size:.73rem;color:var(--text3)}
.footer-logo{font-weight:700;font-size:.85rem;color:var(--text2);display:flex;align-items:center;gap:6px}
.footer-links{display:flex;gap:18px}
.footer-links a{color:var(--text3);text-decoration:none}
.footer-links a:hover{color:var(--text2)}
@media(max-width:1000px){.plan-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:900px){.hero{grid-template-columns:1fr;gap:3rem;padding-top:90px}.steps{grid-template-columns:1fr}.vs-grid{grid-template-columns:1fr}.price-strip{grid-template-columns:1fr 1fr}}
@media(max-width:600px){.hero-ctas,.cta-btns{flex-direction:column;align-items:stretch}.plan-grid{grid-template-columns:1fr}.price-strip{grid-template-columns:1fr 1fr}.footer-inner{flex-direction:column;gap:14px;text-align:center}.footer-links{flex-wrap:wrap;justify-content:center}}
`

export default function Home() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.push('/dashboard')
      } else {
        setChecking(false)
      }
    })
  }, [])

  if (checking) return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: '0.875rem' }}>Loading...</div>
    </>
  )

  return (
    <>
      <Head>
        <title>Loopback — Stop guessing what your customers want.</title>
        <meta name="description" content="Loopback reads your support tickets every week and delivers a three-point product intelligence digest to Slack and email." />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </Head>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* NAV */}
      <nav>
        <a href="/" className="nav-logo"><div className="nav-dot"></div>Loopback</a>
        <div className="nav-right">
          <a href="/login" className="nav-signin">Sign in</a>
          <a href="/signup" className="nav-cta">Get started free</a>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-left">
          <div className="eyebrow"><div className="eyebrow-dot"></div>Now in private beta · Aug 17 launch</div>
          <h1>Stop guessing what your customers want.<br /><em>Your tickets already know.</em></h1>
          <p className="hero-sub">Loopback reads your support tickets every week and delivers a three-point product intelligence digest to Slack and email — automatically. No dashboards. No analysts. No taxonomy.</p>
          <div className="hero-ctas">
            <a href="/signup" className="btn-primary">Start free →</a>
            <a href="/login" className="btn-secondary">Sign in</a>
          </div>
          <div className="hero-trust"><span>Built for B2B SaaS</span><div className="trust-dot"></div><span>Freshdesk, Zendesk + more</span><div className="trust-dot"></div><span>$49/month</span></div>
        </div>

        {/* DIGEST PREVIEW */}
        <div className="digest-card">
          <div className="dc-header">
            <div className="dc-header-l">
              <div className="dc-slack">💬</div>
              <div><div className="dc-title">Loopback Weekly Digest</div><div className="dc-time">Mon 8:04 AM · #product-insights</div></div>
            </div>
            <span className="dc-live">LIVE</span>
          </div>
          <div className="dc-body">
            <div className="dc-intro"><strong>Week of Jul 7, 2026</strong> — Analysed <strong>187 tickets</strong> from your support workspace.</div>
            <div className="insight">
              <div className="insight-top"><span className="ilabel pain">⬡ Top Pain Point</span><span className="isev sev-h">HIGH · 43 tickets</span></div>
              <div className="insight-body">
                <div className="itheme">Onboarding flow breaks on mobile for new accounts</div>
                <div className="icount">43 tickets this week · up 18% from last week</div>
                <div className="iquote">&ldquo;Tried signing up on my phone three times. The next button just doesn&apos;t work.&rdquo;</div>
              </div>
            </div>
            <div className="insight">
              <div className="insight-top"><span className="ilabel feat">⬡ Top Feature Request</span><span className="isev sev-m">MED · 29 tickets</span></div>
              <div className="insight-body">
                <div className="itheme">CSV export for all reports, not just summary view</div>
                <div className="icount">29 tickets · consistent for 3 weeks</div>
                <div className="iquote">&ldquo;We need to export data for our board deck every month.&rdquo;</div>
              </div>
            </div>
            <div className="insight">
              <div className="insight-top"><span className="ilabel churn">⚠ Churn Signal</span><span className="isev sev-w">WATCH · 11 tickets</span></div>
              <div className="insight-body">
                <div className="itheme">Enterprise accounts comparing competitor pricing</div>
                <div className="icount">11 tickets · 3 accounts · new signal this week</div>
                <div className="iquote">&ldquo;We&apos;re evaluating alternatives before our renewal in 60 days.&rdquo;</div>
              </div>
            </div>
          </div>
          <div className="dc-foot"><span>Loopback · 187 tickets analysed</span><a href="/signup" className="dc-link">Get this for your team →</a></div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="wrap">
        <div className="sec-label">How it works</div>
        <h2 className="sec-title">From your support tickets to insights in three steps.</h2>
        <p className="sec-sub">Your support lead sets it up once. Your PM gets value every Monday. Zero overlap required.</p>
        <div className="steps">
          <div className="step"><div className="step-n">01</div><div className="step-icon">🔌</div><h3>Connect your support tool</h3><p>Connect Freshdesk, Zendesk, Intercom, or upload a CSV. Loopback pulls your tickets and syncs every 24 hours.</p></div>
          <div className="step"><div className="step-n">02</div><div className="step-icon">🧠</div><h3>AI synthesises signal</h3><p>Every week, Claude reads every ticket and identifies the top pain point, top feature request, and one churn signal — with counts and real quotes.</p></div>
          <div className="step"><div className="step-n">03</div><div className="step-icon">📩</div><h3>Digest lands in Slack</h3><p>Every Monday at 8 AM your digest arrives before sprint planning. No login required. Three bullets. Better decisions.</p></div>
        </div>
      </section>

      {/* BEFORE / AFTER */}
      <div className="vs-wrap">
        <div className="vs-inner">
          <div className="sec-label">Before vs After</div>
          <h2 className="sec-title">What changes when you use Loopback</h2>
          <div className="vs-grid">
            <div>
              <div className="vs-col-title bef">✕ &nbsp;Without Loopback</div>
              <div className="vs-item bad"><span>•&nbsp;</span><span>PM reads tickets manually for 4+ hours before every sprint</span></div>
              <div className="vs-item bad"><span>•&nbsp;</span><span>Support writes a 3-hour Friday summary nobody reads</span></div>
              <div className="vs-item bad"><span>•&nbsp;</span><span>Roadmap driven by gut feel or whoever shouted loudest</span></div>
              <div className="vs-item bad"><span>•&nbsp;</span><span>Churn signals buried in tickets, found too late</span></div>
              <div className="vs-item bad"><span>•&nbsp;</span><span>Enterpret or Productboard: $36K/year, needs a dedicated analyst</span></div>
            </div>
            <div>
              <div className="vs-col-title aft">✓ &nbsp;With Loopback</div>
              <div className="vs-item good"><span style={{color:'var(--green)'}}>•&nbsp;</span><span>Monday digest in Slack before standup. Zero PM effort.</span></div>
              <div className="vs-item good"><span style={{color:'var(--green)'}}>•&nbsp;</span><span>Support lead sets it up once. Fully automated from that point.</span></div>
              <div className="vs-item good"><span style={{color:'var(--green)'}}>•&nbsp;</span><span>Every sprint priority backed by real ticket counts and quotes</span></div>
              <div className="vs-item good"><span style={{color:'var(--green)'}}>•&nbsp;</span><span>Churn signals flagged the week they first appear</span></div>
              <div className="vs-item good"><span style={{color:'var(--green)'}}>•&nbsp;</span><span>$49/month. Self-serve. No demo. No sales call.</span></div>
            </div>
          </div>
          <div className="price-strip">
            <div className="price-cell"><div className="pc-lbl">Loopback Starter</div><div className="pc-val hi">$49/mo</div><div className="pc-note">Self-serve</div></div>
            <div className="price-cell"><div className="pc-lbl">Canny</div><div className="pc-val">$400/mo</div><div className="pc-note">Voting portals</div></div>
            <div className="price-cell"><div className="pc-lbl">UserVoice</div><div className="pc-val">$899/mo</div><div className="pc-note">Needs sales call</div></div>
            <div className="price-cell"><div className="pc-lbl">Enterpret</div><div className="pc-val">$36K/yr</div><div className="pc-note">Enterprise only</div></div>
          </div>
        </div>
      </div>

      {/* PRICING */}
      <section className="pricing-section">
        <div className="sec-label">Pricing</div>
        <h2 className="sec-title">Simple, transparent pricing.</h2>
        <p className="sec-sub">Start free. Upgrade when you are ready. No sales calls. No demos.</p>
        <div className="plan-grid">
          <div className="plan">
            <div className="plan-phase phase-mvp">⬡ Available now</div>
            <div className="plan-name">Free</div>
            <div className="plan-price">$0<span>/mo</span></div>
            <div className="plan-cycle">Forever free · Pilot only</div>
            <div className="plan-tagline">Try Loopback with your own ticket data before committing.</div>
            <div className="plan-features">
              <div className="pf on"><span className="pf-check">✓</span><span>CSV upload (any platform)</span></div>
              <div className="pf on"><span className="pf-check">✓</span><span>Last 7 days of tickets</span></div>
              <div className="pf on"><span className="pf-check">✓</span><span>Email digest only</span></div>
              <div className="pf on"><span className="pf-check">✓</span><span>Up to 50 tickets/run</span></div>
              <div className="pf off"><span className="pf-check">—</span><span>API connection</span></div>
              <div className="pf off"><span className="pf-check">—</span><span>Slack delivery</span></div>
            </div>
            <a href="/signup" className="plan-cta outline">Start free</a>
          </div>
          <div className="plan featured">
            <div className="plan-badge">Most popular</div>
            <div className="plan-phase phase-mvp">⬡ Launch · Aug 17</div>
            <div className="plan-name">Starter</div>
            <div className="plan-price">$49<span>/mo</span></div>
            <div className="plan-cycle">Billed monthly · Cancel anytime</div>
            <div className="plan-tagline">For solo PMs and founders who want weekly product intelligence.</div>
            <div className="plan-features">
              <div className="pf on"><span className="pf-check">✓</span><span>Freshdesk API connection</span></div>
              <div className="pf on"><span className="pf-check">✓</span><span>Last 30 days of tickets</span></div>
              <div className="pf on"><span className="pf-check">✓</span><span>Slack + Email digest</span></div>
              <div className="pf on"><span className="pf-check">✓</span><span>Up to 200 tickets/week</span></div>
              <div className="pf on"><span className="pf-check">✓</span><span>CSV upload (any platform)</span></div>
              <div className="pf off"><span className="pf-check">—</span><span>Digest history dashboard</span></div>
            </div>
            <a href="/signup" className="plan-cta solid">Get started →</a>
          </div>
          <div className="plan">
            <div className="plan-phase phase-v11">⬡ Sep–Oct 2026</div>
            <div className="plan-name">Pro</div>
            <div className="plan-price">$99<span>/mo</span></div>
            <div className="plan-cycle">Billed monthly · Cancel anytime</div>
            <div className="plan-tagline">For growing teams who want trend tracking and multi-workspace support.</div>
            <div className="plan-features">
              <div className="pf on"><span className="pf-check">✓</span><span>Everything in Starter</span></div>
              <div className="pf on"><span className="pf-check">✓</span><span>Digest history (8 weeks)</span></div>
              <div className="pf on"><span className="pf-check">✓</span><span>Ticket volume trend chart</span></div>
              <div className="pf on"><span className="pf-check">✓</span><span>Multi-workspace (up to 3)</span></div>
              <div className="pf on"><span className="pf-check">✓</span><span>Up to 500 tickets/week</span></div>
            </div>
            <a href="/signup" className="plan-cta outline">Join waitlist for Pro</a>
          </div>
          <div className="plan">
            <div className="plan-phase phase-v2">⬡ Nov 2026</div>
            <div className="plan-name">Team</div>
            <div className="plan-price">$199<span>/mo</span></div>
            <div className="plan-cycle">Billed monthly · Cancel anytime</div>
            <div className="plan-tagline">For product teams who need multi-source intelligence and team collaboration.</div>
            <div className="plan-features">
              <div className="pf on"><span className="pf-check">✓</span><span>Everything in Pro</span></div>
              <div className="pf on"><span className="pf-check">✓</span><span>Zendesk + Intercom ingestion</span></div>
              <div className="pf on"><span className="pf-check">✓</span><span>Salesforce Cases ingestion</span></div>
              <div className="pf on"><span className="pf-check">✓</span><span>Jira issue creation</span></div>
              <div className="pf on"><span className="pf-check">✓</span><span>Team seats (up to 5)</span></div>
            </div>
            <a href="/signup" className="plan-cta outline">Join waitlist for Team</a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="cta-glow"></div>
        <div className="cta-inner">
          <div className="sec-label" style={{textAlign:'center'}}>Get started today</div>
          <h2 className="sec-title">Your tickets are already telling you what to build next.</h2>
          <p className="sec-sub" style={{margin:'0 auto',textAlign:'center'}}>Join the first 20 teams and get personally onboarded by the founder.</p>
          <div className="cta-btns">
            <a href="/signup" className="btn-primary">Start free — no credit card →</a>
            <a href="/login" className="btn-secondary">Sign in to dashboard</a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <div className="footer-wrap">
        <div className="footer-inner">
          <div className="footer-logo"><div className="nav-dot" style={{width:'6px',height:'6px'}}></div>Loopback</div>
          <div>Built in India · Targeting US &amp; Canada</div>
          <div className="footer-links"><a href="mailto:singhshiwal@gmail.com">Contact</a><a href="#">Privacy</a></div>
        </div>
      </div>
    </>
  )
}
