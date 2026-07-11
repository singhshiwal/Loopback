// Shared design tokens and utilities for auth + onboarding + dashboard
// Import this in any page that needs the dark theme

export const theme = {
  bg: '#08090F',
  surface: '#0F111A',
  surface2: '#151824',
  border: '#1E2235',
  border2: '#252A40',
  text: '#E8EAF2',
  text2: '#8B90A8',
  text3: '#555C78',
  blue: '#3B7EFF',
  blueDim: '#1A3A80',
  blueGlow: 'rgba(59,126,255,0.14)',
  green: '#10B981',
  greenDim: '#064E3B',
  red: '#EF4444',
  redDim: '#450A0A',
  amber: '#F59E0B',
}

export const globalCSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #08090F; --surface: #0F111A; --surface2: #151824;
    --border: #1E2235; --border2: #252A40;
    --text: #E8EAF2; --text2: #8B90A8; --text3: #555C78;
    --blue: #3B7EFF; --blue-dim: #1A3A80; --blue-glow: rgba(59,126,255,0.14);
    --green: #10B981; --green-dim: #064E3B;
    --red: #EF4444; --red-dim: #450A0A;
    --amber: #F59E0B;
    --sans: 'Inter', sans-serif;
    --mono: 'JetBrains Mono', monospace;
  }
  html { scroll-behavior: smooth; }
  body {
    font-family: var(--sans);
    background: var(--bg);
    color: var(--text);
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }
  a { color: var(--blue); text-decoration: none; }
  a:hover { opacity: 0.85; }

  /* Auth layout */
  .auth-wrap {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
  }
  .auth-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 40px;
    width: 100%;
    max-width: 420px;
  }
  .auth-logo {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--text);
    margin-bottom: 28px;
  }
  .auth-logo-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: var(--blue);
    box-shadow: 0 0 8px var(--blue);
  }
  .auth-title {
    font-size: 1.4rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    margin-bottom: 6px;
  }
  .auth-sub {
    font-size: 0.875rem;
    color: var(--text2);
    margin-bottom: 28px;
    line-height: 1.6;
  }

  /* Form elements */
  .field { margin-bottom: 16px; }
  .field label {
    display: block;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text2);
    margin-bottom: 6px;
  }
  .field input, .field select, .field textarea {
    width: 100%;
    background: var(--bg);
    border: 1px solid var(--border2);
    border-radius: 8px;
    padding: 11px 14px;
    font-family: var(--sans);
    font-size: 0.9rem;
    color: var(--text);
    outline: none;
    transition: border-color 0.2s;
  }
  .field input:focus, .field select:focus, .field textarea:focus {
    border-color: var(--blue);
  }
  .field input.error { border-color: var(--red); }
  .field select option { background: var(--surface2); }

  /* Buttons */
  .btn {
    width: 100%;
    padding: 13px;
    border-radius: 8px;
    font-family: var(--sans);
    font-size: 0.9rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
  }
  .btn-primary {
    background: var(--blue);
    color: #08090F;
    box-shadow: 0 0 20px rgba(59,126,255,0.25);
  }
  .btn-primary:hover { opacity: 0.88; transform: translateY(-1px); }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
  .btn-ghost {
    background: transparent;
    color: var(--text2);
    border: 1px solid var(--border2);
  }
  .btn-ghost:hover { border-color: var(--blue); color: var(--blue); }

  /* Error/success messages */
  .msg {
    padding: 10px 14px;
    border-radius: 8px;
    font-size: 0.83rem;
    margin-bottom: 16px;
    line-height: 1.5;
  }
  .msg-error { background: var(--red-dim); color: var(--red); border: 1px solid rgba(239,68,68,0.2); }
  .msg-success { background: rgba(16,185,129,0.1); color: var(--green); border: 1px solid rgba(16,185,129,0.2); }

  /* Progress bar for onboarding */
  .progress-bar-wrap {
    display: flex;
    gap: 6px;
    margin-bottom: 32px;
  }
  .progress-step {
    flex: 1;
    height: 3px;
    border-radius: 10px;
    background: var(--border2);
    transition: background 0.3s;
  }
  .progress-step.done { background: var(--blue); }
  .progress-step.active { background: var(--blue); opacity: 0.5; }

  /* Step label */
  .step-label {
    font-family: var(--mono);
    font-size: 0.68rem;
    color: var(--blue);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 8px;
  }

  /* OTP input grid */
  .otp-grid {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
  }
  .otp-input {
    flex: 1;
    aspect-ratio: 1;
    text-align: center;
    font-size: 1.4rem;
    font-weight: 700;
    background: var(--bg);
    border: 1px solid var(--border2);
    border-radius: 8px;
    color: var(--text);
    outline: none;
    transition: border-color 0.2s;
    font-family: var(--mono);
  }
  .otp-input:focus { border-color: var(--blue); }
  .otp-input.filled { border-color: var(--blue); }

  /* Dashboard sidebar */
  .dash-layout {
    display: flex;
    min-height: 100vh;
  }
  .dash-sidebar {
    width: 220px;
    background: var(--surface);
    border-right: 1px solid var(--border);
    padding: 24px 0;
    display: flex;
    flex-direction: column;
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
  }
  .dash-logo {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 1rem;
    font-weight: 700;
    padding: 0 20px 24px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 16px;
  }
  .dash-nav-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 20px;
    font-size: 0.875rem;
    color: var(--text2);
    cursor: pointer;
    transition: all 0.15s;
    border-left: 2px solid transparent;
    text-decoration: none;
  }
  .dash-nav-item:hover { color: var(--text); background: var(--surface2); }
  .dash-nav-item.active { color: var(--blue); border-left-color: var(--blue); background: var(--blue-glow); }
  .dash-main {
    margin-left: 220px;
    flex: 1;
    padding: 32px;
    max-width: 900px;
  }
  .dash-header {
    margin-bottom: 28px;
    padding-bottom: 20px;
    border-bottom: 1px solid var(--border);
  }
  .dash-title {
    font-size: 1.3rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    margin-bottom: 4px;
  }
  .dash-sub { font-size: 0.875rem; color: var(--text2); }

  /* Stat cards */
  .stat-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 14px;
    margin-bottom: 28px;
  }
  .stat-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 16px 18px;
  }
  .stat-label { font-size: 0.7rem; color: var(--text3); font-family: var(--mono); text-transform: uppercase; margin-bottom: 6px; }
  .stat-val { font-size: 1.6rem; font-weight: 700; color: var(--text); letter-spacing: -0.02em; }
  .stat-val.green { color: var(--green); }
  .stat-val.blue { color: var(--blue); }

  /* Digest card in dashboard */
  .digest-item {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    overflow: hidden;
    margin-bottom: 14px;
    transition: border-color 0.2s;
  }
  .digest-item:hover { border-color: var(--border2); }
  .di-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 18px;
    cursor: pointer;
  }
  .di-week { font-size: 0.9rem; font-weight: 600; }
  .di-meta { font-size: 0.75rem; color: var(--text3); font-family: var(--mono); }
  .di-body { padding: 0 18px 16px; border-top: 1px solid var(--border); }
  .di-insight { padding: 12px 0; border-bottom: 1px solid var(--border); }
  .di-insight:last-child { border-bottom: none; }
  .di-label { font-size: 0.68rem; font-family: var(--mono); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px; }
  .di-label.pain { color: var(--red); }
  .di-label.feat { color: var(--blue); }
  .di-label.churn { color: var(--amber); }
  .di-theme { font-size: 0.875rem; font-weight: 600; margin-bottom: 6px; }
  .di-quote { font-size: 0.78rem; color: var(--text2); font-style: italic; padding: 6px 10px; background: var(--bg); border-left: 2px solid var(--border2); border-radius: 0 4px 4px 0; }

  /* Settings form */
  .settings-section {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 20px;
  }
  .settings-section-title {
    font-size: 0.875rem;
    font-weight: 700;
    margin-bottom: 4px;
  }
  .settings-section-sub {
    font-size: 0.78rem;
    color: var(--text2);
    margin-bottom: 20px;
    line-height: 1.5;
  }

  /* Badge */
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 0.68rem;
    font-weight: 600;
    padding: 3px 9px;
    border-radius: 20px;
    font-family: var(--mono);
  }
  .badge-green { background: rgba(16,185,129,0.1); color: var(--green); border: 1px solid rgba(16,185,129,0.2); }
  .badge-blue { background: var(--blue-glow); color: var(--blue); border: 1px solid var(--blue-dim); }
  .badge-amber { background: rgba(245,158,11,0.1); color: var(--amber); border: 1px solid rgba(245,158,11,0.2); }

  @media (max-width: 768px) {
    .dash-sidebar { display: none; }
    .dash-main { margin-left: 0; padding: 20px; }
    .auth-card { padding: 28px 20px; }
  }
`
