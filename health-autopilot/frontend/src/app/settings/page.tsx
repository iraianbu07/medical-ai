'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { usersApi, billingApi } from '@/lib/api';
import { THEME_ACCENTS, THEME_LABELS, ThemeName, applyTheme, getStoredTheme } from '@/lib/themes';
import { authApi } from '@/lib/api';

const GOALS = [
  { id: 'reduce_stress',  label: 'Reduce Stress',     emoji: '🧘' },
  { id: 'improve_sleep',  label: 'Better Sleep',       emoji: '🌙' },
  { id: 'lose_weight',    label: 'Weight Management',  emoji: '⚖️' },
  { id: 'build_fitness',  label: 'Build Fitness',      emoji: '💪' },
  { id: 'boost_energy',   label: 'Boost Energy',       emoji: '⚡' },
];

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [theme, setTheme] = useState<ThemeName>('midnight');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    usersApi.getMe().then(r => {
      setUser(r.data);
      setTheme(r.data.theme_preference || getStoredTheme());
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleTheme = async (t: ThemeName) => {
    setTheme(t);
    applyTheme(t);
    await usersApi.updatePreferences({ theme_preference: t }).catch(() => {});
  };

  const handleGoal = async (goal: string) => {
    setUser((u: any) => ({ ...u, primary_goal: goal }));
    await usersApi.updateMe({ primary_goal: goal }).catch(() => {});
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await usersApi.updateMe({
        name: user.name,
        age: user.age,
        gender: user.gender,
        timezone: user.timezone,
        primary_goal: user.primary_goal,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  };

  const handleUpgrade = async () => {
    try {
      const res = await billingApi.createCheckout();
      if (res.data.checkout_url) window.location.href = res.data.checkout_url;
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Billing not configured');
    }
  };

  const handleLogout = async () => {
    await authApi.logout().catch(() => {});
    localStorage.removeItem('access_token');
    window.location.href = '/login';
  };

  if (loading) return <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>{[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 120 }} />)}</div>;

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <h1 style={{ fontFamily: 'Cabinet Grotesk', fontWeight: 800, fontSize: 'var(--text-3xl)', color: 'var(--text-primary)', letterSpacing: '-0.04em', margin: '0 0 var(--space-8)' }}>
        Settings
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

        {/* Profile */}
        <SettingsSection title="Profile">
          <Field label="Name">
            <input className="input-field" value={user?.name || ''} onChange={e => setUser((u: any) => ({ ...u, name: e.target.value }))} placeholder="Your name" />
          </Field>
          <Field label="Age">
            <input className="input-field" type="number" min={13} max={120} value={user?.age || ''} onChange={e => setUser((u: any) => ({ ...u, age: parseInt(e.target.value) || null }))} placeholder="28" />
          </Field>
          <Field label="Timezone">
            <input className="input-field" value={user?.timezone || ''} onChange={e => setUser((u: any) => ({ ...u, timezone: e.target.value }))} placeholder="Asia/Kolkata" />
          </Field>
          <button onClick={handleSave} className="btn-primary" disabled={saving} style={{ alignSelf: 'flex-start' }}>
            {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Changes'}
          </button>
        </SettingsSection>

        {/* Primary Goal */}
        <SettingsSection title="Primary Goal">
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {GOALS.map(g => (
              <button
                key={g.id}
                onClick={() => handleGoal(g.id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 10,
                  border: user?.primary_goal === g.id ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                  background: user?.primary_goal === g.id ? 'var(--accent-subtle)' : 'var(--bg-base)',
                  color: user?.primary_goal === g.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  fontFamily: 'Satoshi',
                  fontWeight: 500,
                  fontSize: 'var(--text-sm)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 150ms ease',
                }}
              >
                {g.emoji} {g.label}
              </button>
            ))}
          </div>
        </SettingsSection>

        {/* Theme */}
        <SettingsSection title="Theme">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {(Object.entries(THEME_LABELS) as [ThemeName, string][]).map(([name, label]) => (
              <motion.button
                key={name}
                onClick={() => handleTheme(name)}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                style={{
                  padding: '12px 8px',
                  borderRadius: 12,
                  border: theme === name ? `2px solid ${THEME_ACCENTS[name]}` : '1px solid var(--border-subtle)',
                  background: theme === name ? `${THEME_ACCENTS[name]}18` : 'var(--bg-base)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: theme === name ? `0 0 0 3px ${THEME_ACCENTS[name]}30` : 'none',
                  transition: 'all 200ms ease',
                }}
              >
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: THEME_ACCENTS[name] }} />
                <span style={{ fontFamily: 'Satoshi', fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--text-secondary)' }}>{label}</span>
              </motion.button>
            ))}
          </div>
        </SettingsSection>

        {/* Plan */}
        {user?.plan !== 'pro' && (
          <SettingsSection title="Plan">
            <div style={{
              padding: 'var(--space-5)',
              borderRadius: 14,
              background: 'linear-gradient(135deg, rgba(0,229,255,0.08), rgba(0,224,150,0.06))',
              border: '1px solid var(--border-default)',
            }}>
              <div style={{ fontFamily: 'Cabinet Grotesk', fontWeight: 700, fontSize: 'var(--text-xl)', color: 'var(--text-primary)', marginBottom: 8 }}>
                Upgrade to Pro
              </div>
              <ul style={{ fontFamily: 'Satoshi', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: '0 0 16px', paddingLeft: 20, lineHeight: 2 }}>
                <li>Unlimited recommendations (3 vs 1)</li>
                <li>30-day history & Time Machine</li>
                <li>Weekly AI digest PDF</li>
                <li>PDF export</li>
              </ul>
              <button onClick={handleUpgrade} className="btn-primary">
                Upgrade — $5/month
              </button>
            </div>
          </SettingsSection>
        )}

        {user?.plan === 'pro' && (
          <div style={{ padding: 'var(--space-4) var(--space-5)', background: 'rgba(0,224,150,0.1)', border: '1px solid rgba(0,224,150,0.3)', borderRadius: 12 }}>
            <span style={{ fontFamily: 'Satoshi', fontWeight: 600, color: 'var(--success)' }}>✓ Pro Plan Active</span>
          </div>
        )}

        {/* Sign out */}
        <SettingsSection title="Account">
          <button onClick={handleLogout} className="btn-ghost" style={{ color: 'var(--danger)', justifyContent: 'flex-start' }}>
            Sign out
          </button>
          <a href="/my-data" className="btn-ghost" style={{ color: 'var(--text-secondary)', justifyContent: 'flex-start', display: 'flex', alignItems: 'center' }}>
            Manage my data →
          </a>
        </SettingsSection>
      </div>
    </div>
  );
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-l1"
      style={{ padding: 'var(--space-6)' }}
    >
      <h2 style={{ fontFamily: 'Satoshi', fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 var(--space-5)' }}>
        {title}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {children}
      </div>
    </motion.div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontFamily: 'Satoshi', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </label>
      {children}
    </div>
  );
}
