'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { recsApi } from '@/lib/api';
import RecommendationCard from '@/components/health/RecommendationCard';

export default function RecommendationsPage() {
  const [recs, setRecs] = useState<any[]>([]);
  const [adherence, setAdherence] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'today' | 'history'>('today');

  const load = async () => {
    setLoading(true);
    try {
      const [recsRes, adRes] = await Promise.all([
        tab === 'today' ? recsApi.getToday() : recsApi.getHistory(7),
        recsApi.getAdherence(),
      ]);
      setRecs(recsRes.data);
      setAdherence(adRes.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [tab]);

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <h1 style={{ fontFamily: 'Cabinet Grotesk', fontWeight: 800, fontSize: 'var(--text-3xl)', color: 'var(--text-primary)', letterSpacing: '-0.04em', margin: '0 0 var(--space-8)' }}>
        Recommendations
      </h1>

      {/* Adherence stat */}
      {adherence && (
        <div className="card-l1" style={{ padding: 'var(--space-5)', marginBottom: 'var(--space-6)', display: 'flex', alignItems: 'center', gap: 'var(--space-6)' }}>
          <div>
            <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 'var(--text-2xl)', color: adherence.rate >= 70 ? 'var(--success)' : 'var(--warning)' }}>
              {adherence.rate}%
            </div>
            <div style={{ fontFamily: 'Satoshi', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              7-Day Adherence
            </div>
          </div>
          <div style={{ flex: 1, height: 8, background: 'var(--border-subtle)', borderRadius: 4, overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${adherence.rate}%` }}
              transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
              style={{
                height: '100%',
                background: adherence.rate >= 70 ? 'var(--success)' : 'var(--warning)',
                borderRadius: 4,
              }}
            />
          </div>
          <div style={{ fontFamily: 'Satoshi', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
            {adherence.accepted} / {adherence.total}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 'var(--space-6)' }}>
        {(['today', 'history'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '8px 18px', borderRadius: 8,
            border: tab === t ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
            background: tab === t ? 'var(--accent-subtle)' : 'transparent',
            color: tab === t ? 'var(--accent-primary)' : 'var(--text-secondary)',
            fontFamily: 'Satoshi', fontWeight: 500, fontSize: 'var(--text-sm)',
            cursor: 'pointer', transition: 'all 150ms ease', textTransform: 'capitalize',
          }}>
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 120 }} />)}
        </div>
      ) : recs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--text-tertiary)', fontFamily: 'Satoshi' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎯</div>
          <p>No recommendations {tab === 'today' ? 'for today' : 'in history'}.</p>
          {tab === 'today' && <a href="/check-in" className="btn-primary" style={{ display: 'inline-flex', marginTop: 16 }}>Do a check-in</a>}
        </div>
      ) : (
        <AnimatePresence>
          {recs.map((rec, i) => (
            <motion.div key={rec.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <RecommendationCard rec={rec} onAccepted={load} onDismissed={load} />
            </motion.div>
          ))}
        </AnimatePresence>
      )}
    </div>
  );
}
