'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { achievementsApi } from '@/lib/api';

const RARITY_COLORS: Record<string, string> = {
  common: '#8888AA',
  uncommon: '#34D399',
  rare: '#818CF8',
  legendary: '#F59E0B',
};

const RARITY_BG: Record<string, string> = {
  common: 'rgba(136,136,170,0.1)',
  uncommon: 'rgba(52,211,153,0.1)',
  rare: 'rgba(129,140,248,0.1)',
  legendary: 'rgba(245,158,11,0.12)',
};

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await achievementsApi.getAll();
        setAchievements(res.data);
        await achievementsApi.markSeen();
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  // All possible achievements (locked ones show as locked)
  const ALL_ACHIEVEMENTS = [
    { achievement_type: 'streak_3',        title: '3-Day Streak',        icon: '🔥', rarity: 'common',    description: 'Accepted at least one recommendation 3 days in a row.' },
    { achievement_type: 'week_warrior',    title: 'Week Warrior',        icon: '⚡', rarity: 'uncommon',  description: 'Maintained a 7-day streak. A full week of conscious health decisions.' },
    { achievement_type: 'fortnight_focus', title: 'Fortnight Focus',     icon: '🏆', rarity: 'rare',      description: '14 consecutive days. Your habits are becoming automatic.' },
    { achievement_type: 'month_master',    title: 'Month Master',        icon: '💎', rarity: 'legendary', description: '30-day streak. You\'ve unlocked the full power of Autopilot OS.' },
    { achievement_type: 'first_checkin',   title: 'First Check-in',      icon: '✅', rarity: 'common',    description: 'Completed your first daily mood check-in.' },
    { achievement_type: 'voice_pioneer',   title: 'Voice Pioneer',       icon: '🎙️', rarity: 'common',    description: 'Logged your first voice event.' },
  ];

  const unlockedTypes = new Set(achievements.map(a => a.achievement_type));

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <h1 style={{ fontFamily: 'Cabinet Grotesk', fontWeight: 800, fontSize: 'var(--text-3xl)', color: 'var(--text-primary)', letterSpacing: '-0.04em', margin: '0 0 8px' }}>
        Achievements
      </h1>
      <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)', margin: '0 0 var(--space-8)', fontFamily: 'Satoshi' }}>
        {achievements.length} unlocked · {ALL_ACHIEVEMENTS.length - achievements.length} to discover
      </p>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton" style={{ height: 120 }} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
          {ALL_ACHIEVEMENTS.map((a, idx) => {
            const unlocked = unlockedTypes.has(a.achievement_type);
            const unlockedData = achievements.find(u => u.achievement_type === a.achievement_type);
            return (
              <motion.div
                key={a.achievement_type}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                whileHover={{ scale: 1.03, y: -2 }}
                onClick={() => unlocked && setSelected({ ...a, ...unlockedData })}
                style={{
                  padding: 'var(--space-5)',
                  borderRadius: 16,
                  border: `1px solid ${unlocked ? RARITY_COLORS[a.rarity] + '40' : 'var(--border-subtle)'}`,
                  background: unlocked ? RARITY_BG[a.rarity] : 'var(--bg-surface)',
                  cursor: unlocked ? 'pointer' : 'default',
                  filter: unlocked ? 'none' : 'grayscale(80%)',
                  opacity: unlocked ? 1 : 0.5,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: 'var(--space-3)',
                }}
              >
                <div style={{ fontSize: 36 }}>{unlocked ? a.icon : '🔒'}</div>
                <div>
                  <div style={{
                    fontFamily: 'Satoshi',
                    fontWeight: 700,
                    fontSize: 'var(--text-sm)',
                    color: unlocked ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    marginBottom: 4,
                  }}>
                    {a.title}
                  </div>
                  <div style={{
                    fontFamily: 'Satoshi',
                    fontSize: 'var(--text-xs)',
                    color: RARITY_COLORS[a.rarity],
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    fontWeight: 600,
                  }}>
                    {a.rarity}
                  </div>
                </div>
                {unlocked && unlockedData && (
                  <div style={{
                    fontFamily: 'Satoshi',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--text-tertiary)',
                  }}>
                    {new Date(unlockedData.unlocked_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Detail sheet */}
      <AnimatePresence>
        {selected && (
          <>
            <div className="bottom-sheet-overlay" onClick={() => setSelected(null)} />
            <motion.div
              className="bottom-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <div className="bottom-sheet-handle" />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 64, marginBottom: 16 }}>{selected.icon}</div>
                <h2 style={{ fontFamily: 'Cabinet Grotesk', fontWeight: 800, fontSize: 'var(--text-2xl)', color: 'var(--text-primary)', letterSpacing: '-0.03em', margin: '0 0 8px' }}>
                  {selected.title}
                </h2>
                <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 6, background: RARITY_BG[selected.rarity], color: RARITY_COLORS[selected.rarity], fontSize: 'var(--text-xs)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
                  {selected.rarity}
                </span>
                <p style={{ fontFamily: 'Satoshi', fontSize: 'var(--text-base)', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 24px' }}>
                  {selected.description}
                </p>
                {selected.unlocked_at && (
                  <p style={{ fontFamily: 'JetBrains Mono', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                    Unlocked {new Date(selected.unlocked_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </p>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
