'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { usersApi } from '@/lib/api';
import HealthScoreRing from '@/components/health/HealthScoreRing';
import RecommendationCard from '@/components/health/RecommendationCard';
import TypewriterText from '@/components/health/TypewriterText';
import StreakFlame from '@/components/health/StreakFlame';
import { Activity, Moon, Droplets, TrendingUp, AlertTriangle, ChevronRight } from 'lucide-react';

interface DashboardData {
  user: { name?: string; streak_days: number; plan: string };
  health_score: { score: number; score_breakdown: any; delta_yesterday?: number; predicted_tomorrow?: number };
  recommendations: any[];
  active_flags: any[];
  predictions?: any;
  narrative: string;
  today_metrics?: any;
  unseen_achievements: any[];
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.1 }
  }
};

const childVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } }
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    try {
      const res = await usersApi.getDashboard();
      setData(res.data);
    } catch (e: any) {
      if (e.response?.status === 401) {
        window.location.href = '/login';
      } else {
        setError('Failed to load dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) return <DashboardSkeleton />;
  if (error) return <ErrorState message={error} onRetry={fetchDashboard} />;
  if (!data) return null;

  const { user, health_score, recommendations, active_flags, predictions, narrative, today_metrics } = data;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const confidence = health_score.score >= 70 ? 'High confidence' : 'Moderate confidence';
  const sources = [
    today_metrics?.steps && 'Steps',
    today_metrics?.sleep_hours && 'Sleep',
    today_metrics?.mood_score && 'Mood',
  ].filter(Boolean);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 'var(--space-8)', alignItems: 'start' }}
    >
      {/* ─── CENTER COLUMN ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

        {/* 1. Today's Brief */}
        <motion.div variants={childVariants} className="card-l1" style={{ padding: 'var(--space-6)' }}>
          <p style={{
            fontFamily: 'Satoshi, sans-serif',
            fontSize: 'var(--text-sm)',
            color: 'var(--text-tertiary)',
            margin: '0 0 8px',
          }}>
            {greeting}{user.name ? `, ${user.name}` : ''} · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>

          <div style={{ marginBottom: 16 }}>
            <TypewriterText text={narrative} speed={22} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="chip" style={{
              background: 'var(--accent-subtle)',
              color: 'var(--accent-primary)',
              border: '1px solid var(--border-default)',
            }}>
              {confidence} · {sources.length || 'estimated'} {sources.length === 1 ? 'source' : 'sources'}
            </span>
          </div>
        </motion.div>

        {/* 2. Health Score Card */}
        <motion.div variants={childVariants} className="card-l2" style={{ padding: 'var(--space-6)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-8)' }}>
            <HealthScoreRing
              score={health_score.score}
              breakdown={health_score.score_breakdown}
              delta={health_score.delta_yesterday}
              predictedTomorrow={health_score.predicted_tomorrow}
            />

            {/* Subscore pills */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', justifyContent: 'center' }}>
              {health_score.score_breakdown && Object.entries(health_score.score_breakdown).map(([key, val]: [string, any]) => (
                <SubscorePill key={key} label={key} score={val.score} max={val.max} />
              ))}
              <p style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--text-tertiary)',
                fontFamily: 'Satoshi, sans-serif',
                margin: '4px 0 0',
              }}>
                Tap ring to see breakdown →
              </p>
            </div>
          </div>
        </motion.div>

        {/* 3. Recommendations */}
        <motion.div variants={childVariants}>
          <h2 style={{
            fontFamily: 'Cabinet Grotesk, sans-serif',
            fontWeight: 700,
            fontSize: 'var(--text-xl)',
            color: 'var(--text-primary)',
            letterSpacing: '-0.03em',
            margin: '0 0 var(--space-4)',
          }}>
            Today's Actions
          </h2>

          {recommendations.length === 0 ? (
            <EmptyRecommendations />
          ) : (
            recommendations.map((rec) => (
              <RecommendationCard
                key={rec.id}
                rec={rec}
                onAccepted={fetchDashboard}
                onDismissed={fetchDashboard}
              />
            ))
          )}
        </motion.div>

        {/* 4. Active Behavior Flags */}
        {active_flags.length > 0 && (
          <motion.div variants={childVariants}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-3)' }}>
              <AlertTriangle size={16} color="var(--warning)" />
              <h3 style={{
                fontFamily: 'Satoshi, sans-serif',
                fontWeight: 600,
                fontSize: 'var(--text-sm)',
                color: 'var(--text-secondary)',
                margin: 0,
              }}>
                Active Patterns
              </h3>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              {active_flags.map((flag) => (
                <FlagChip key={flag.id} flag={flag} />
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* ─── RIGHT CONTEXT PANEL ────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }} className="context-panel">

        {/* Tomorrow Preview */}
        {predictions && (
          <motion.div variants={childVariants}>
            <TomorrowPreviewCard predictions={predictions} score={health_score.predicted_tomorrow} />
          </motion.div>
        )}

        {/* Streak Card */}
        <motion.div variants={childVariants} className="card-l1" style={{ padding: 'var(--space-5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 12 }}>
            <StreakFlame streakDays={user.streak_days} size={28} />
            <div>
              <div style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 600,
                fontSize: 'var(--text-2xl)',
                color: user.streak_days > 0 ? 'var(--warning)' : 'var(--text-tertiary)',
              }}>
                {user.streak_days}
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>day streak</div>
            </div>
          </div>
          <StreakProgress days={user.streak_days} />
        </motion.div>

        {/* Quick Stats */}
        <motion.div variants={childVariants} className="card-l1" style={{ padding: 'var(--space-5)' }}>
          <h3 style={{
            fontFamily: 'Satoshi, sans-serif',
            fontWeight: 600,
            fontSize: 'var(--text-sm)',
            color: 'var(--text-secondary)',
            margin: '0 0 var(--space-4)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}>
            Today
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <QuickStat icon={Activity} label="Steps" value={today_metrics?.steps?.toLocaleString() || '—'} color="var(--success)" />
            <QuickStat icon={Moon} label="Sleep" value={today_metrics?.sleep_hours ? `${today_metrics.sleep_hours}h` : '—'} color="#818CF8" />
            <QuickStat icon={Droplets} label="Hydration" value={today_metrics?.hydration_cups ? `${today_metrics.hydration_cups} cups` : '—'} color="var(--accent-primary)" />
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

function SubscorePill({ label, score, max }: { label: string; score: number; max: number }) {
  const colors: Record<string, string> = {
    sleep: '#818CF8', activity: '#34D399', mental: '#FB923C', nutrition: '#60A5FA'
  };
  const pct = Math.round(score / max * 100);
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '8px 14px',
      background: 'var(--bg-overlay)',
      borderRadius: 10,
      border: '1px solid var(--border-subtle)',
    }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: colors[label] || 'var(--accent-primary)', flexShrink: 0 }} />
      <span style={{ fontFamily: 'Satoshi', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', flex: 1 }}>
        {label}
      </span>
      <span style={{ fontFamily: 'JetBrains Mono', fontSize: 'var(--text-xs)', color: colors[label] || 'var(--accent-primary)', fontWeight: 500 }}>
        {pct}%
      </span>
    </div>
  );
}

function TomorrowPreviewCard({ predictions, score }: { predictions: any; score?: number }) {
  return (
    <div style={{
      padding: 'var(--space-5)',
      background: 'var(--bg-elevated)',
      borderRadius: 20,
      border: '1px solid var(--border-default)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Animated gradient border */}
      <div style={{
        position: 'absolute',
        inset: 0,
        borderRadius: 20,
        background: 'linear-gradient(135deg, var(--accent-primary)20, transparent, var(--score-high)20)',
        zIndex: 0,
        animation: 'pulse-glow 2s ease-in-out infinite',
        pointerEvents: 'none',
      }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <TrendingUp size={14} color="var(--accent-primary)" />
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Satoshi' }}>
            Tomorrow Preview
          </span>
        </div>
        {score && (
          <div style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 'var(--text-3xl)',
            fontWeight: 600,
            color: 'var(--accent-primary)',
            marginBottom: 8,
          }}>
            {score}<span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', fontFamily: 'Satoshi' }}>/100</span>
          </div>
        )}
        {predictions.productivity_window && (
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', margin: 0, fontFamily: 'Satoshi' }}>
            Peak window: <strong style={{ color: 'var(--text-primary)' }}>{predictions.productivity_window}</strong>
          </p>
        )}
        {predictions.predicted_mood_tomorrow && (
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', margin: '4px 0 0', fontFamily: 'Satoshi' }}>
            Mood forecast: <strong style={{ color: predictions.predicted_mood_tomorrow < 2.5 ? 'var(--danger)' : 'var(--success)' }}>
              {predictions.predicted_mood_tomorrow >= 4 ? 'Good' : predictions.predicted_mood_tomorrow >= 2.5 ? 'Neutral' : 'Low'}
            </strong>
          </p>
        )}
      </div>
    </div>
  );
}

function StreakProgress({ days }: { days: number }) {
  const milestones = [3, 7, 14, 30];
  const next = milestones.find(m => m > days) || 30;
  const prev = milestones.filter(m => m <= days).at(-1) || 0;
  const pct = Math.min(100, ((days - prev) / (next - prev)) * 100);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', fontFamily: 'Satoshi' }}>
        <span>Next: {next} days</span>
        <span>{days}/{next}</span>
      </div>
      <div style={{ height: 4, background: 'var(--border-subtle)', borderRadius: 2 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: 'var(--warning)', borderRadius: 2, transition: 'width 600ms ease' }} />
      </div>
    </div>
  );
}

function QuickStat({ icon: Icon, label, value, color }: any) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <Icon size={16} color={color} />
      <span style={{ flex: 1, fontFamily: 'Satoshi', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontFamily: 'JetBrains Mono', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}

function FlagChip({ flag }: { flag: any }) {
  const SEVERITY_LABELS: Record<string, string> = {
    sleep_debt: 'Sleep debt',
    low_activity: 'Low activity',
    chronic_stress: 'Chronic stress',
    dehydration_risk: 'Dehydration risk',
    recovery_needed: 'Recovery needed',
    late_night_usage: 'Late screens',
    irregular_routine: 'Irregular sleep',
  };
  return (
    <span className={`chip chip-severity-${flag.severity}`}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'currentColor', flexShrink: 0 }} />
      {SEVERITY_LABELS[flag.flag_type] || flag.flag_type}
    </span>
  );
}

function EmptyRecommendations() {
  return (
    <div style={{
      textAlign: 'center',
      padding: 'var(--space-12) var(--space-8)',
      background: 'var(--bg-surface)',
      borderRadius: 16,
      border: '1px solid var(--border-subtle)',
    }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🎯</div>
      <h3 style={{ fontFamily: 'Cabinet Grotesk', fontWeight: 700, fontSize: 'var(--text-xl)', color: 'var(--text-primary)', margin: '0 0 8px' }}>
        All caught up
      </h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', margin: '0 0 20px', fontFamily: 'Satoshi' }}>
        No urgent actions today. Log your mood to refine tomorrow's plan.
      </p>
      <a href="/check-in" className="btn-primary" style={{ display: 'inline-flex' }}>Do a check-in</a>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {[1, 2, 3].map(i => (
        <div key={i} className="skeleton" style={{ height: i === 2 ? 200 : 120 }} />
      ))}
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div style={{ textAlign: 'center', padding: 'var(--space-16)' }}>
      <p style={{ color: 'var(--danger)', marginBottom: 16, fontFamily: 'Satoshi' }}>{message}</p>
      <button className="btn-secondary" onClick={onRetry}>Retry</button>
    </div>
  );
}
