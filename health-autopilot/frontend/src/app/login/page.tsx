'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { authApi } from '@/lib/api';

type Tab = 'login' | 'register';

export default function LoginPage() {
  const [tab, setTab] = useState<Tab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (tab === 'login') {
        const res = await authApi.login(email, password);
        localStorage.setItem('access_token', res.data.access_token);
        window.location.href = '/dashboard';
      } else {
        const res = await authApi.register(email, password, name || undefined);
        localStorage.setItem('access_token', res.data.access_token);
        window.location.href = '/onboarding';
      }
    } catch (e: any) {
      const msg = e.response?.data?.detail || 'Something went wrong';
      setError(typeof msg === 'string' ? msg : 'Invalid credentials');
    }
    setLoading(false);
  };

  const demoLogin = async () => {
    setEmail('demo@autopilot.os');
    setPassword('Demo1234!');
    setLoading(true);
    try {
      const res = await authApi.login('demo@autopilot.os', 'Demo1234!');
      localStorage.setItem('access_token', res.data.access_token);
      window.location.href = '/dashboard';
    } catch {
      setError('Demo account not available yet — run the seed script first');
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-6)',
    }}>
      {/* Background radial glow */}
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'radial-gradient(ellipse at 30% 30%, var(--accent-glow), transparent 60%), radial-gradient(ellipse at 70% 70%, rgba(0,224,150,0.06), transparent 60%)',
        pointerEvents: 'none',
      }} />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        style={{
          width: '100%',
          maxWidth: 400,
          background: 'var(--bg-elevated)',
          borderRadius: 24,
          border: '1px solid var(--border-strong)',
          padding: 'var(--space-10)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
          position: 'relative',
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: 'var(--accent-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto var(--space-4)',
          }}>
            <span style={{ fontSize: 24 }}>⚡</span>
          </div>
          <h1 style={{
            fontFamily: 'Cabinet Grotesk, sans-serif',
            fontWeight: 800,
            fontSize: 'var(--text-2xl)',
            color: 'var(--text-primary)',
            letterSpacing: '-0.04em',
            margin: '0 0 6px',
          }}>
            Health Autopilot OS
          </h1>
          <p style={{ fontFamily: 'Satoshi', fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', margin: 0 }}>
            Your autonomous health decision engine
          </p>
        </div>

        {/* Tab switcher */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 4,
          background: 'var(--bg-base)',
          borderRadius: 10,
          padding: 4,
          marginBottom: 'var(--space-6)',
        }}>
          {(['login', 'register'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '9px',
                borderRadius: 8,
                border: 'none',
                background: tab === t ? 'var(--bg-elevated)' : 'transparent',
                color: tab === t ? 'var(--text-primary)' : 'var(--text-tertiary)',
                fontFamily: 'Satoshi',
                fontWeight: 600,
                fontSize: 'var(--text-sm)',
                cursor: 'pointer',
                textTransform: 'capitalize',
                boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.2)' : 'none',
                transition: 'all 150ms ease',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {tab === 'register' && (
            <div>
              <label style={{ fontFamily: 'Satoshi', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                Name (optional)
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Alex"
                className="input-field"
              />
            </div>
          )}

          <div>
            <label style={{ fontFamily: 'Satoshi', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="input-field"
              required
            />
          </div>

          <div>
            <label style={{ fontFamily: 'Satoshi', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              className="input-field"
              required
              minLength={8}
            />
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="error-shake"
              style={{ color: 'var(--danger)', fontSize: 'var(--text-sm)', fontFamily: 'Satoshi', margin: 0 }}
            >
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
            disabled={loading}
          >
            {loading ? 'Please wait...' : tab === 'login' ? 'Sign In →' : 'Create Account →'}
          </button>
        </form>

        <div style={{ marginTop: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
          <span style={{ fontFamily: 'Satoshi', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>or</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
        </div>

        <button
          onClick={demoLogin}
          className="btn-secondary"
          style={{ width: '100%', justifyContent: 'center', marginTop: 'var(--space-4)' }}
          disabled={loading}
        >
          🎭 Try Demo Account
        </button>

        <p style={{
          fontFamily: 'Satoshi',
          fontSize: 'var(--text-xs)',
          color: 'var(--text-tertiary)',
          textAlign: 'center',
          marginTop: 'var(--space-6)',
          lineHeight: 1.5,
        }}>
          No tracking. No selling your data. Open data export always available.
        </p>
      </motion.div>
    </div>
  );
}
