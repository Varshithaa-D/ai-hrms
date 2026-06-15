'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import api from '@/lib/api';

const FWCLogo = () => (
  <svg width="120" height="36" viewBox="0 0 120 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* FWC rings */}
    <circle cx="14" cy="18" r="12" stroke="#1565C0" strokeWidth="3.5" fill="none"/>
    <circle cx="26" cy="18" r="12" stroke="#1565C0" strokeWidth="3.5" fill="none"/>
    {/* FWC text */}
    <text x="44" y="24" fontFamily="Georgia, serif" fontWeight="700" fontSize="18" fill="#1565C0" letterSpacing="1">FWC</text>
  </svg>
);

const STATS = [
  { value: '5,000+', label: 'Employees Supported' },
  { value: '4', label: 'Access Roles' },
  { value: 'AI', label: 'Powered Screening' },
  { value: '99.9%', label: 'Uptime SLA' },
];

const DEMO_ACCOUNTS = [
  { role: 'Admin', email: 'admin@hrms.com', color: '#4f8ef7', desc: 'Full system access' },
  { role: 'Manager', email: 'manager@hrms.com', color: '#7c5cfc', desc: 'Team oversight' },
  { role: 'HR', email: 'hr@hrms.com', color: '#22c97a', desc: 'Recruitment & screening' },
  { role: 'Employee', email: 'emp@hrms.com', color: '#f5a623', desc: 'Self-service portal' },
];

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [activeRole, setActiveRole] = useState<string | null>(null);

  useEffect(() => { setMounted(true); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const { data } = await api.post('/auth/login', form);
      setAuth(data.user, data.token);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid credentials. Please try again.');
    } finally { setLoading(false); }
  };

  const fillDemo = (email: string, role: string) => {
    setForm({ email, password: 'password123' });
    setActiveRole(role);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .login-root {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1fr 480px;
          background: #03071a;
          font-family: 'DM Sans', sans-serif;
        }

        /* ── LEFT PANEL ── */
        .left-panel {
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 48px 56px;
          overflow: hidden;
          background: linear-gradient(135deg, #03071a 0%, #080f28 50%, #0a0620 100%);
        }

        .left-panel::before {
          content: '';
          position: absolute;
          width: 700px; height: 700px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(79,142,247,0.18) 0%, transparent 65%);
          top: -200px; left: -200px;
          pointer-events: none;
        }
        .left-panel::after {
          content: '';
          position: absolute;
          width: 500px; height: 500px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(124,92,252,0.14) 0%, transparent 65%);
          bottom: -150px; right: 0;
          pointer-events: none;
        }

        .brand-top {
          display: flex;
          align-items: center;
          gap: 14px;
          position: relative;
          z-index: 1;
        }

        .brand-divider {
          width: 1px;
          height: 28px;
          background: rgba(255,255,255,0.15);
        }

        .brand-text {
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 500;
          color: rgba(255,255,255,0.5);
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .hero-content {
          position: relative;
          z-index: 1;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 6px 14px;
          border-radius: 99px;
          background: rgba(79,142,247,0.12);
          border: 1px solid rgba(79,142,247,0.25);
          font-size: 11px;
          font-weight: 600;
          color: #7eb4ff;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 20px;
        }

        .hero-badge-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #4f8ef7;
          box-shadow: 0 0 8px #4f8ef7;
          animation: pulse-dot 2s infinite;
        }

        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        .hero-title {
          font-family: 'Playfair Display', serif;
          font-size: 52px;
          font-weight: 800;
          line-height: 1.1;
          color: #fff;
          margin-bottom: 18px;
          letter-spacing: -0.5px;
        }

        .hero-title span {
          background: linear-gradient(135deg, #4f8ef7, #7c5cfc);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .hero-sub {
          font-size: 15px;
          color: rgba(255,255,255,0.45);
          line-height: 1.7;
          max-width: 440px;
          margin-bottom: 40px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          max-width: 440px;
        }

        .stat-card {
          padding: 18px 20px;
          border-radius: 14px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          backdrop-filter: blur(10px);
        }

        .stat-value {
          font-family: 'Playfair Display', serif;
          font-size: 28px;
          font-weight: 700;
          color: #fff;
          margin-bottom: 4px;
        }

        .stat-label {
          font-size: 12px;
          color: rgba(255,255,255,0.4);
          font-weight: 500;
        }

        .left-footer {
          font-size: 12px;
          color: rgba(255,255,255,0.2);
          position: relative;
          z-index: 1;
        }

        /* ── RIGHT PANEL ── */
        .right-panel {
          background: #07111f;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 48px 44px;
          border-left: 1px solid rgba(255,255,255,0.05);
          position: relative;
        }

        .form-header {
          margin-bottom: 36px;
        }

        .form-title {
          font-family: 'Playfair Display', serif;
          font-size: 28px;
          font-weight: 700;
          color: #fff;
          margin-bottom: 6px;
        }

        .form-subtitle {
          font-size: 13px;
          color: rgba(255,255,255,0.4);
        }

        .field-label {
          display: block;
          font-size: 11px;
          font-weight: 600;
          color: rgba(255,255,255,0.35);
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .field-input {
          width: 100%;
          padding: 13px 16px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.04);
          color: #fff;
          font-size: 14px;
          font-family: 'DM Sans', sans-serif;
          outline: none;
          transition: border-color 0.2s, background 0.2s;
        }

        .field-input:focus {
          border-color: rgba(79,142,247,0.5);
          background: rgba(79,142,247,0.06);
        }

        .field-input::placeholder { color: rgba(255,255,255,0.2); }

        .sign-in-btn {
          width: 100%;
          padding: 14px;
          border-radius: 12px;
          border: none;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          font-family: 'DM Sans', sans-serif;
          letter-spacing: 0.03em;
          transition: all 0.2s;
          background: linear-gradient(135deg, #4f8ef7, #7c5cfc);
          color: white;
          box-shadow: 0 4px 24px rgba(79,142,247,0.35);
          margin-top: 8px;
        }

        .sign-in-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 32px rgba(79,142,247,0.5);
        }

        .sign-in-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .error-box {
          padding: 10px 14px;
          border-radius: 8px;
          background: rgba(247,82,90,0.1);
          border: 1px solid rgba(247,82,90,0.25);
          color: #ff8a8a;
          font-size: 13px;
          margin-bottom: 16px;
        }

        .demo-section {
          margin-top: 28px;
          padding: 18px;
          border-radius: 14px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
        }

        .demo-title {
          font-size: 10px;
          font-weight: 700;
          color: rgba(255,255,255,0.25);
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-bottom: 12px;
        }

        .demo-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .demo-card {
          padding: 10px 12px;
          border-radius: 9px;
          cursor: pointer;
          transition: all 0.15s;
          border: 1px solid transparent;
        }

        .demo-card:hover { background: rgba(255,255,255,0.05); }

        .demo-card.active {
          background: rgba(79,142,247,0.08);
          border-color: rgba(79,142,247,0.2);
        }

        .demo-role {
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 2px;
        }

        .demo-email {
          font-size: 10px;
          color: rgba(255,255,255,0.3);
        }

        .demo-hint {
          font-size: 11px;
          color: rgba(255,255,255,0.2);
          margin-top: 10px;
          text-align: center;
        }

        .fwc-logo-svg circle { stroke: #4f8ef7; }
        .fwc-logo-svg text { fill: #4f8ef7; }

        @keyframes fade-up {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-in { animation: fade-up 0.5s ease forwards; }
        .delay-1 { animation-delay: 0.1s; opacity: 0; }
        .delay-2 { animation-delay: 0.2s; opacity: 0; }
        .delay-3 { animation-delay: 0.3s; opacity: 0; }
        .delay-4 { animation-delay: 0.4s; opacity: 0; }

        @media (max-width: 900px) {
          .login-root { grid-template-columns: 1fr; }
          .left-panel { display: none; }
          .right-panel { padding: 36px 24px; justify-content: center; min-height: 100vh; }
        }
      `}</style>

      <div className="login-root">

        {/* ── LEFT PANEL ── */}
        <div className="left-panel">
          {/* Brand top bar */}
          <div className="brand-top animate-in">
            {/* FWC Logo SVG inline */}
            <svg className="fwc-logo-svg" width="110" height="34" viewBox="0 0 110 34" fill="none">
              <circle cx="13" cy="17" r="11" stroke="#4f8ef7" strokeWidth="3" fill="none"/>
              <circle cx="24" cy="17" r="11" stroke="#4f8ef7" strokeWidth="3" fill="none"/>
              <text x="40" y="23" fontFamily="Georgia,serif" fontWeight="700" fontSize="17" fill="#4f8ef7" letterSpacing="1.5">FWC</text>
            </svg>
            <div className="brand-divider" />
            <span className="brand-text">HRMS Platform</span>
          </div>

          {/* Hero */}
          <div className="hero-content">
            <div className="hero-badge animate-in delay-1">
              <div className="hero-badge-dot" />
              AI-Powered · Enterprise-Ready
            </div>
            <h1 className="hero-title animate-in delay-2">
              Human Resources,<br />
              <span>Reimagined</span>
            </h1>
            <p className="hero-sub animate-in delay-3">
              FWC's next-generation HRMS with AI resume screening,
              voice interviews, real-time analytics, and intelligent
              workforce management — built for 5,000+ employees.
            </p>
            <div className="stats-grid animate-in delay-4">
              {STATS.map(s => (
                <div key={s.label} className="stat-card">
                  <div className="stat-value">{s.value}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="left-footer">
            © 2026 FWC Inc. · All rights reserved · Confidential
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="right-panel">

          {/* Mobile logo */}
          <div style={{ display: 'none', marginBottom: 32, textAlign: 'center' }}>
            <svg width="110" height="34" viewBox="0 0 110 34" fill="none">
              <circle cx="13" cy="17" r="11" stroke="#4f8ef7" strokeWidth="3" fill="none"/>
              <circle cx="24" cy="17" r="11" stroke="#4f8ef7" strokeWidth="3" fill="none"/>
              <text x="40" y="23" fontFamily="Georgia,serif" fontWeight="700" fontSize="17" fill="#4f8ef7" letterSpacing="1.5">FWC</text>
            </svg>
          </div>

          <div className="form-header">
            <h2 className="form-title">Welcome back</h2>
            <p className="form-subtitle">Sign in to your FWC workspace</p>
          </div>

          {error && <div className="error-box">{error}</div>}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="field-label">Email Address</label>
              <input
                className="field-input"
                type="email"
                placeholder="you@fwc.com"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                required
                suppressHydrationWarning
              />
            </div>
            <div>
              <label className="field-label">Password</label>
              <input
                className="field-input"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                required
                suppressHydrationWarning
              />
            </div>
            <button className="sign-in-btn" type="submit" disabled={loading} suppressHydrationWarning>
              {loading ? '◌  Signing in...' : 'Sign In  →'}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="demo-section">
            <div className="demo-title">Demo Accounts — click to fill</div>
            <div className="demo-grid">
              {DEMO_ACCOUNTS.map(d => (
                <div
                  key={d.role}
                  className={`demo-card${activeRole === d.role ? ' active' : ''}`}
                  onClick={() => fillDemo(d.email, d.role)}
                >
                  <div className="demo-role" style={{ color: d.color }}>{d.role}</div>
                  <div className="demo-email">{d.desc}</div>
                </div>
              ))}
            </div>
            <div className="demo-hint">Password: password123</div>
          </div>
        </div>
      </div>
    </>
  );
}