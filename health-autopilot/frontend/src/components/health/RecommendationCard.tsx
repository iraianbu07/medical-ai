'use client';
import { useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { Moon, Activity, Monitor, Droplets, Wind, Zap, Check, Clock, X, CloudRain } from 'lucide-react';
import { recsApi } from '@/lib/api';

interface Recommendation {
  id: string;
  action: string;
  reason: string;
  confidence: number;
  priority: number;
  category?: string;
  accepted?: boolean;
  snoozed_until?: string;
  dismissed: boolean;
  times_shown: number;
  weather_influenced: boolean;
  weather_condition?: string;
}

interface Props {
  rec: Recommendation;
  onAccepted?: () => void;
  onDismissed?: () => void;
}

const CATEGORY_ICONS: Record<string, React.ComponentType<any>> = {
  sleep:    Moon,
  movement: Activity,
  screen:   Monitor,
  nutrition: Droplets,
  mental:   Wind,
  general:  Zap,
};

const CATEGORY_LABELS: Record<string, string> = {
  sleep: 'Sleep', movement: 'Movement', screen: 'Screen',
  nutrition: 'Nutrition', mental: 'Mental', general: 'General',
};

function ConfidenceLabel({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const color = pct >= 80 ? 'var(--success)' : pct >= 60 ? 'var(--warning)' : 'var(--text-tertiary)';
  return (
    <span style={{
      fontSize: 'var(--text-xs)',
      color,
      fontFamily: 'Satoshi, sans-serif',
      fontWeight: 500,
    }}>
      {pct}% confidence
    </span>
  );
}

export default function RecommendationCard({ rec, onAccepted, onDismissed }: Props) {
  const [status, setStatus] = useState<'idle' | 'accepting' | 'done' | 'snoozed' | 'dismissed'>('idle');
  const [snoozedUntil, setSnoozedUntil] = useState<Date | null>(
    rec.snoozed_until ? new Date(rec.snoozed_until) : null
  );

  const Icon = CATEGORY_ICONS[rec.category || 'general'] || Zap;
  const isSnoozed = snoozedUntil && snoozedUntil > new Date();

  const handleAccept = async () => {
    setStatus('accepting');
    try {
      await recsApi.takeAction(rec.id, 'accept');
      // Step 1: flash border, Step 2: show check, Step 3: collapse
      setTimeout(() => setStatus('done'), 150);
      setTimeout(() => onAccepted?.(), 700);
    } catch {
      setStatus('idle');
    }
  };

  const handleSnooze = async () => {
    try {
      await recsApi.takeAction(rec.id, 'snooze');
      const until = new Date(Date.now() + 2 * 60 * 60 * 1000);
      setSnoozedUntil(until);
      setStatus('snoozed');
    } catch {}
  };

  const handleDismiss = async (action: 'dismiss' | 'not_relevant') => {
    try {
      await recsApi.takeAction(rec.id, action);
      setStatus('dismissed');
      setTimeout(() => onDismissed?.(), 400);
    } catch {}
  };

  return (
    <AnimatePresence>
      {status !== 'dismissed' && (
        <motion.div
          layout
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          transition={{ duration: 0.4, ease: [0.76, 0, 0.24, 1] }}
          className="card-l1 card-interactive"
          style={{
            padding: 'var(--space-5)',
            marginBottom: 'var(--space-4)',
            border: status === 'accepting'
              ? '1px solid var(--success)'
              : status === 'done'
              ? '1px solid var(--success)'
              : '1px solid var(--border-subtle)',
            transition: 'border-color 150ms ease',
          }}
        >
          {status === 'done' ? (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '8px 0',
                color: 'var(--success)',
              }}
            >
              <Check size={20} />
              <span style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                Done! Streak +1 🔥
              </span>
            </motion.div>
          ) : (
            <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-start' }}>
              {/* Category icon */}
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'var(--accent-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Icon size={18} color="var(--accent-primary)" />
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{
                    fontFamily: 'Satoshi, sans-serif',
                    fontWeight: 500,
                    fontSize: 'var(--text-xs)',
                    color: 'var(--text-tertiary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}>
                    {CATEGORY_LABELS[rec.category || 'general']}
                  </span>
                  {rec.times_shown >= 3 && (
                    <span style={{
                      fontSize: 'var(--text-xs)',
                      color: 'var(--warning)',
                      fontFamily: 'Satoshi, sans-serif',
                    }}>
                      ⚠ Escalated
                    </span>
                  )}
                </div>

                <p style={{
                  fontFamily: 'Satoshi, sans-serif',
                  fontWeight: 600,
                  fontSize: 'var(--text-base)',
                  color: 'var(--text-primary)',
                  margin: '0 0 4px',
                  lineHeight: 1.4,
                }}>
                  {rec.action}
                </p>

                <p style={{
                  fontFamily: 'Satoshi, sans-serif',
                  fontWeight: 400,
                  fontSize: 'var(--text-sm)',
                  color: 'var(--text-secondary)',
                  margin: '0 0 10px',
                  lineHeight: 1.5,
                }}>
                  {rec.reason}
                </p>

                {/* Weather chip */}
                {rec.weather_influenced && (
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    marginBottom: 12,
                  }}>
                    <span className="chip" style={{
                      background: 'rgba(130, 180, 255, 0.12)',
                      color: '#60A5FA',
                      border: '1px solid rgba(130, 180, 255, 0.25)',
                    }}>
                      <CloudRain size={10} />
                      Weather adapted
                    </span>
                  </div>
                )}

                {/* Confidence + Snooze countdown */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <ConfidenceLabel confidence={rec.confidence} />
                  {isSnoozed && (
                    <span style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 'var(--text-xs)',
                      color: 'var(--warning)',
                      fontFamily: 'JetBrains Mono, monospace',
                    }}>
                      <Clock size={10} />
                      Snoozed · returns {snoozedUntil?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>

                {/* Actions */}
                {!isSnoozed && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="btn-primary" onClick={handleAccept}
                      style={{ padding: '8px 16px', minHeight: 36, fontSize: 'var(--text-xs)' }}>
                      <Check size={14} /> Done
                    </button>
                    <button className="btn-secondary" onClick={handleSnooze}
                      style={{ padding: '8px 14px', minHeight: 36, fontSize: 'var(--text-xs)' }}>
                      <Clock size={14} /> Later
                    </button>
                    <button className="btn-ghost" onClick={() => handleDismiss('not_relevant')}
                      style={{ padding: '8px 12px', minHeight: 36, fontSize: 'var(--text-xs)' }}>
                      <X size={14} /> Not relevant
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
