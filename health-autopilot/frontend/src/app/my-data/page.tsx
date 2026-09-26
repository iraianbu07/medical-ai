'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { privacyApi } from '@/lib/api';

export default function MyDataPage() {
  const [info, setInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    privacyApi.getCollectionInfo().then(r => {
      setInfo(r.data);
      setPrivacyMode(r.data.privacy_mode_active);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const exportData = async () => {
    setExporting(true);
    try {
      const res = await privacyApi.exportData();
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-health-data-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
    setExporting(false);
  };

  const togglePrivacy = async () => {
    try {
      await privacyApi.togglePrivacyMode();
      setPrivacyMode(true);
    } catch {}
  };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <h1 style={{ fontFamily: 'Cabinet Grotesk', fontWeight: 800, fontSize: 'var(--text-3xl)', color: 'var(--text-primary)', letterSpacing: '-0.04em', margin: '0 0 8px' }}>
          🔐 Privacy Vault
        </h1>
        <p style={{ fontFamily: 'Satoshi', fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', margin: 0 }}>
          Your health data belongs to you. View, export, or delete it anytime.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

        {/* Data Collection */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card-l1" style={{ padding: 'var(--space-6)' }}>
          <h2 style={{ fontFamily: 'Cabinet Grotesk', fontWeight: 700, fontSize: 'var(--text-xl)', color: 'var(--text-primary)', letterSpacing: '-0.03em', margin: '0 0 var(--space-4)' }}>
            What we collect
          </h2>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 52 }} />)}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {info?.data_points?.map((dp: any, i: number) => (
                <motion.div
                  key={dp.name}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  style={{
                    padding: 'var(--space-4)',
                    background: 'var(--bg-base)',
                    borderRadius: 10,
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-4)',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'Satoshi', fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-primary)', marginBottom: 2 }}>{dp.name}</div>
                    <div style={{ fontFamily: 'Satoshi', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Source: {dp.source}</div>
                  </div>
                  <div style={{ fontFamily: 'Satoshi', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', maxWidth: 200, textAlign: 'right' }}>{dp.why}</div>
                </motion.div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)', flexWrap: 'wrap' }}>
            {info && [
              { label: `Retained ${info.retention_days}d`, color: 'var(--text-tertiary)' },
              { label: info.encrypted ? '🔒 AES-256 encrypted' : '', color: 'var(--success)' },
              { label: !info.shared_with_third_parties ? '✓ Never shared' : '⚠ Shared', color: 'var(--success)' },
            ].filter(t => t.label).map(t => (
              <span key={t.label} className="chip" style={{ background: 'var(--accent-subtle)', color: t.color, border: '1px solid var(--border-subtle)' }}>
                {t.label}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card-l1" style={{ padding: 'var(--space-6)' }}>
          <h2 style={{ fontFamily: 'Cabinet Grotesk', fontWeight: 700, fontSize: 'var(--text-xl)', color: 'var(--text-primary)', letterSpacing: '-0.03em', margin: '0 0 var(--space-4)' }}>
            Your rights
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <ActionRow
              title="Export my data"
              description="Download all your health data as JSON — GDPR-compliant portable format."
              action={
                <button onClick={exportData} className="btn-secondary" disabled={exporting} style={{ whiteSpace: 'nowrap' }}>
                  {exporting ? 'Exporting...' : '↓ Export'}
                </button>
              }
            />

            <ActionRow
              title="Privacy Mode (24h)"
              description="Pause all data collection for 24 hours. Recommendations will use last known data."
              action={
                <button
                  onClick={togglePrivacy}
                  className={privacyMode ? 'btn-primary' : 'btn-secondary'}
                  style={{ whiteSpace: 'nowrap' }}
                  disabled={privacyMode}
                >
                  {privacyMode ? '✓ Active' : 'Enable'}
                </button>
              }
            />

            <ActionRow
              title="Delete my account"
              description="Permanently delete all data after 30-day recovery window. This cannot be undone."
              action={
                <button
                  onClick={() => {
                    if (confirm('Request account deletion? You have 30 days to recover your account.')) {
                      privacyApi.deleteAccount().then(() => alert('Deletion requested. You have 30 days to recover your account.'));
                    }
                  }}
                  style={{
                    padding: '8px 16px',
                    background: 'rgba(255,87,87,0.1)',
                    border: '1px solid rgba(255,87,87,0.3)',
                    borderRadius: 8,
                    color: 'var(--danger)',
                    fontFamily: 'Satoshi',
                    fontWeight: 600,
                    fontSize: 'var(--text-xs)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Delete account
                </button>
              }
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function ActionRow({ title, description, action }: { title: string; description: string; action: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-4)',
      padding: 'var(--space-4)',
      background: 'var(--bg-base)',
      borderRadius: 10,
      border: '1px solid var(--border-subtle)',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'Satoshi', fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-primary)', marginBottom: 2 }}>{title}</div>
        <div style={{ fontFamily: 'Satoshi', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', lineHeight: 1.4 }}>{description}</div>
      </div>
      {action}
    </div>
  );
}
