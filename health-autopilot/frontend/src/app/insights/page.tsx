'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import CircadianClock from '@/components/health/CircadianClock';
import { metricsApi } from '@/lib/api';

export default function InsightsPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    metricsApi.getHistory(14).then(r => setHistory(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const today = history[0];

  // Compute averages
  const avg = (field: string) => {
    const vals = history.map((m: any) => m[field]).filter((v: any) => v != null);
    return vals.length ? Math.round(vals.reduce((a: number, b: number) => a + b, 0) / vals.length * 10) / 10 : null;
  };

  const patterns = [
    {
      label: 'Avg Sleep',
      value: avg('sleep_hours'),
      unit: 'h',
      target: 7.5,
      good: (v: number) => v >= 7,
      format: (v: number) => `${v}h`,
    },
    {
      label: 'Avg Steps',
      value: avg('steps'),
      unit: '',
      target: 8000,
      good: (v: number) => v >= 7000,
      format: (v: number) => v.toLocaleString(),
    },
    {
      label: 'Avg Mood',
      value: avg('mood_score'),
      unit: '/5',
      target: 4,
      good: (v: number) => v >= 3.5,
      format: (v: number) => `${v}/5`,
    },
    {
      label: 'Avg Stress',
      value: avg('stress_level'),
      unit: '/5',
      target: 2,
      good: (v: number) => v <= 3,
      format: (v: number) => `${v}/5`,
    },
    {
      label: 'Avg Hydration',
      value: avg('hydration_cups'),
      unit: ' cups',
      target: 8,
      good: (v: number) => v >= 6,
      format: (v: number) => `${v} cups`,
    },
  ];

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ fontFamily: 'Cabinet Grotesk', fontWeight: 800, fontSize: 'var(--text-3xl)', color: 'var(--text-primary)', letterSpacing: '-0.04em', margin: '0 0 8px' }}>
        Insights
      </h1>
      <p style={{ fontFamily: 'Satoshi', fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', margin: '0 0 var(--space-8)' }}>
        Pattern recognition from 14 days of data
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>

        {/* Circadian Clock */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-l1"
          style={{ padding: 'var(--space-6)' }}
        >
          <h2 style={{ fontFamily: 'Cabinet Grotesk', fontWeight: 700, fontSize: 'var(--text-xl)', color: 'var(--text-primary)', letterSpacing: '-0.03em', margin: '0 0 var(--space-5)' }}>
            Circadian Profile
          </h2>
          {today ? (
            <CircadianClock
              data={{
                sleepStart:    today.sleep_start_time ? parseInt(today.sleep_start_time?.split(':')[0]) : 23,
                sleepEnd:      today.sleep_end_time ? parseInt(today.sleep_end_time?.split(':')[0]) : 7,
                activityStart: 9,
                activityEnd:   10,
                screenStart:   20,
                screenEnd:     23,
              }}
              size={220}
            />
          ) : (
            <div className="skeleton" style={{ height: 260, borderRadius: '50%' }} />
          )}
        </motion.div>

        {/* 14-Day Patterns */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card-l1"
          style={{ padding: 'var(--space-6)' }}
        >
          <h2 style={{ fontFamily: 'Cabinet Grotesk', fontWeight: 700, fontSize: 'var(--text-xl)', color: 'var(--text-primary)', letterSpacing: '-0.03em', margin: '0 0 var(--space-5)' }}>
            14-Day Averages
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {loading ? (
              [1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 48 }} />)
            ) : (
              patterns.map((p, i) => {
                const val = p.value;
                if (val === null) return (
                  <div key={p.label} style={{ padding: '12px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontFamily: 'Satoshi', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{p.label}</div>
                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>No data</div>
                  </div>
                );

                const isGood = p.good(val);
                const color = isGood ? 'var(--success)' : 'var(--warning)';

                return (
                  <motion.div
                    key={p.label}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-4)',
                      padding: '10px 0',
                      borderBottom: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'Satoshi', fontWeight: 500, fontSize: 'var(--text-sm)', color: 'var(--text-primary)', marginBottom: 2 }}>{p.label}</div>
                      <div style={{ fontFamily: 'Satoshi', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                        Target: {p.format(p.target)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 600, fontSize: 'var(--text-base)', color }}>
                        {p.format(val)}
                      </div>
                      <div style={{ fontFamily: 'Satoshi', fontSize: 'var(--text-xs)', color: isGood ? 'var(--success)' : 'var(--warning)' }}>
                        {isGood ? '✓ On track' : '↑ Improve'}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </motion.div>

        {/* Mood trend heatmap */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card-l1"
          style={{ padding: 'var(--space-6)', gridColumn: '1 / -1' }}
        >
          <h2 style={{ fontFamily: 'Cabinet Grotesk', fontWeight: 700, fontSize: 'var(--text-xl)', color: 'var(--text-primary)', letterSpacing: '-0.03em', margin: '0 0 var(--space-5)' }}>
            Mood & Stress Heatmap (14 Days)
          </h2>
          <div style={{ display: 'flex', gap: 'var(--space-3)', overflowX: 'auto', paddingBottom: 8 }}>
            {loading ? (
              [1,2,3,4,5,6,7].map(i => <div key={i} className="skeleton" style={{ width: 48, height: 80, flexShrink: 0 }} />)
            ) : (
              history.slice(0, 14).reverse().map((m: any, i: number) => {
                const mood = m.mood_score;
                const stress = m.stress_level;
                const moodColor = mood ? `hsl(${(mood - 1) * 30}, 70%, 55%)` : 'var(--border-subtle)';
                return (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      background: moodColor,
                      opacity: mood ? 0.8 : 0.2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {mood && <span style={{ fontSize: 16 }}>{['😞','😕','😐','🙂','😄'][mood-1]}</span>}
                    </div>
                    <div style={{ fontFamily: 'Satoshi', fontSize: 8, color: 'var(--text-tertiary)', textAlign: 'center' }}>
                      {new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
