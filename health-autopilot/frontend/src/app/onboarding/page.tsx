'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usersApi } from '@/lib/api';

type Step = 0 | 1 | 2 | 3;

const GOALS = [
  { id: 'reduce_stress',  label: 'Reduce Stress',       emoji: '🧘', description: 'Lower cortisol, build calm' },
  { id: 'improve_sleep',  label: 'Better Sleep',         emoji: '🌙', description: 'Consistent, restorative sleep' },
  { id: 'lose_weight',    label: 'Weight Management',    emoji: '⚖️', description: 'Sustainable body composition' },
  { id: 'build_fitness',  label: 'Build Fitness',        emoji: '💪', description: 'Strength & cardio improvements' },
  { id: 'boost_energy',   label: 'Boost Energy',         emoji: '⚡', description: 'More fuel, less fatigue' },
  { id: 'mental_clarity', label: 'Mental Clarity',       emoji: '🧠', description: 'Focus, memory, mood' },
];

const SLEEP_TARGETS = ['22:00', '22:30', '23:00', '23:30', '00:00', '00:30'];
const WAKE_TARGETS  = ['05:00', '05:30', '06:00', '06:30', '07:00', '07:30', '08:00'];

interface OnboardingData {
  primary_goal?: string;
  age?: number;
  timezone?: string;
  sleep_target?: string;
  wake_target?: string;
  notifications?: boolean;
}

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>(0);
  const [data, setData] = useState<OnboardingData>({});
  const [loading, setLoading] = useState(false);

  const STEPS = ['Goal', 'Profile', 'Sleep', 'Ready'];

  const next = () => setStep(s => Math.min(3, s + 1) as Step);
  const prev = () => setStep(s => Math.max(0, s - 1) as Step);

  const finish = async () => {
    setLoading(true);
    try {
      await usersApi.completeOnboarding({
        primary_goal:  data.primary_goal,
        age:           data.age,
        timezone:      Intl.DateTimeFormat().resolvedOptions().timeZone,
        consent_given: true,
      });
      window.location.href = '/dashboard';
    } catch {
      window.location.href = '/dashboard';
    }
    setLoading(false);
  };

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit:  (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-6)',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'radial-gradient(ellipse at 20% 20%, var(--accent-glow), transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(0,224,150,0.06), transparent 60%)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: 560, position: 'relative' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'var(--accent-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto var(--space-4)',
          }}>
            <span style={{ fontSize: 24 }}>⚡</span>
          </div>
          <h1 style={{
            fontFamily: 'Cabinet Grotesk, sans-serif',
            fontWeight: 800, fontSize: 'var(--text-3xl)',
            color: 'var(--text-primary)', letterSpacing: '-0.04em', margin: '0 0 6px',
          }}>
            {step === 3 ? "You're all set" : 'Set up Autopilot'}
          </h1>
          <p style={{ fontFamily: 'Satoshi', fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', margin: 0 }}>
            {step === 3 ? 'Autopilot is ready to operate.' : `Step ${step + 1} of 4 — ${STEPS[step]}`}
          </p>
        </div>

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 'var(--space-8)' }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              width: i === step ? 24 : 8,
              height: 8,
              borderRadius: 4,
              background: i <= step ? 'var(--accent-primary)' : 'var(--border-subtle)',
              transition: 'all 300ms ease',
            }} />
          ))}
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait" custom={1}>
          {step === 0 && (
            <motion.div key="goal" custom={1} variants={slideVariants} initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.3, ease: [0.76, 0, 0.24, 1] }}>
              <StepGoal data={data} onChange={d => setData(prev => ({ ...prev, ...d }))} onNext={next} />
            </motion.div>
          )}
          {step === 1 && (
            <motion.div key="profile" custom={1} variants={slideVariants} initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.3, ease: [0.76, 0, 0.24, 1] }}>
              <StepProfile data={data} onChange={d => setData(prev => ({ ...prev, ...d }))} onNext={next} onPrev={prev} />
            </motion.div>
          )}
          {step === 2 && (
            <motion.div key="sleep" custom={1} variants={slideVariants} initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.3, ease: [0.76, 0, 0.24, 1] }}>
              <StepSleep data={data} onChange={d => setData(prev => ({ ...prev, ...d }))} onNext={next} onPrev={prev} />
            </motion.div>
          )}
          {step === 3 && (
            <motion.div key="ready" custom={1} variants={slideVariants} initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.3, ease: [0.76, 0, 0.24, 1] }}>
              <StepReady data={data} onFinish={finish} onPrev={prev} loading={loading} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Step 1: Goal ──────────────────────────────────────────────────────────

function StepGoal({ data, onChange, onNext }: any) {
  return (
    <div className="card-l2" style={{ padding: 'var(--space-8)' }}>
      <h2 style={{
        fontFamily: 'Cabinet Grotesk', fontWeight: 700,
        fontSize: 'var(--text-2xl)', color: 'var(--text-primary)',
        letterSpacing: '-0.03em', margin: '0 0 6px',
      }}>
        What's your primary goal?
      </h2>
      <p style={{ fontFamily: 'Satoshi', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: '0 0 24px' }}>
        Autopilot will prioritize recommendations around this. You can change it anytime.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
        {GOALS.map(g => (
          <motion.button
            key={g.id}
            onClick={() => { onChange({ primary_goal: g.id }); }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            style={{
              padding: '16px 14px',
              borderRadius: 12,
              border: data.primary_goal === g.id ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
              background: data.primary_goal === g.id ? 'var(--accent-subtle)' : 'var(--bg-base)',
              cursor: 'pointer',
              textAlign: 'left',
              boxShadow: data.primary_goal === g.id ? '0 0 0 3px var(--accent-glow)' : 'none',
              transition: 'all 150ms ease',
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 6 }}>{g.emoji}</div>
            <div style={{ fontFamily: 'Satoshi', fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--text-primary)', marginBottom: 2 }}>
              {g.label}
            </div>
            <div style={{ fontFamily: 'Satoshi', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
              {g.description}
            </div>
          </motion.button>
        ))}
      </div>
      <button
        className="btn-primary"
        onClick={onNext}
        disabled={!data.primary_goal}
        style={{ width: '100%', justifyContent: 'center' }}
      >
        Continue →
      </button>
    </div>
  );
}

// ─── Step 2: Profile ───────────────────────────────────────────────────────

function StepProfile({ data, onChange, onNext, onPrev }: any) {
  return (
    <div className="card-l2" style={{ padding: 'var(--space-8)' }}>
      <h2 style={{
        fontFamily: 'Cabinet Grotesk', fontWeight: 700,
        fontSize: 'var(--text-2xl)', color: 'var(--text-primary)',
        letterSpacing: '-0.03em', margin: '0 0 6px',
      }}>
        Tell us about yourself
      </h2>
      <p style={{ fontFamily: 'Satoshi', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: '0 0 24px' }}>
        Used to calibrate sleep targets and activity norms.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 28 }}>
        <div>
          <label style={{ fontFamily: 'Satoshi', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
            Age
          </label>
          <input
            type="number"
            min={13}
            max={110}
            value={data.age || ''}
            onChange={e => onChange({ age: parseInt(e.target.value) || undefined })}
            placeholder="28"
            className="input-field"
          />
        </div>
        <div>
          <label style={{ fontFamily: 'Satoshi', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 10 }}>
            Biological Sex (for hormone & sleep calibration)
          </label>
          <div style={{ display: 'flex', gap: 10 }}>
            {['Male', 'Female', 'Other'].map(g => (
              <button
                key={g}
                onClick={() => onChange({ gender: g.toLowerCase() })}
                style={{
                  flex: 1, padding: '10px 8px', borderRadius: 10,
                  border: data.gender === g.toLowerCase() ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                  background: data.gender === g.toLowerCase() ? 'var(--accent-subtle)' : 'var(--bg-base)',
                  color: data.gender === g.toLowerCase() ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  fontFamily: 'Satoshi', fontWeight: 500, fontSize: 'var(--text-sm)',
                  cursor: 'pointer', transition: 'all 150ms ease',
                }}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
        <div style={{
          padding: 'var(--space-4)', borderRadius: 10,
          background: 'var(--accent-subtle)', border: '1px solid var(--border-default)',
        }}>
          <p style={{ fontFamily: 'Satoshi', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            🔒 This data is stored locally encrypted. It is never sold or shared. See <a href="/my-data" style={{ color: 'var(--accent-primary)' }}>Privacy Vault</a>.
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <button className="btn-ghost" onClick={onPrev} style={{ flex: 1, justifyContent: 'center' }}>← Back</button>
        <button className="btn-primary" onClick={onNext} style={{ flex: 2, justifyContent: 'center' }}>Continue →</button>
      </div>
    </div>
  );
}

// ─── Step 3: Sleep schedule ────────────────────────────────────────────────

function StepSleep({ data, onChange, onNext, onPrev }: any) {
  return (
    <div className="card-l2" style={{ padding: 'var(--space-8)' }}>
      <h2 style={{
        fontFamily: 'Cabinet Grotesk', fontWeight: 700,
        fontSize: 'var(--text-2xl)', color: 'var(--text-primary)',
        letterSpacing: '-0.03em', margin: '0 0 6px',
      }}>
        Ideal sleep schedule
      </h2>
      <p style={{ fontFamily: 'Satoshi', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: '0 0 24px' }}>
        We'll nudge you toward this schedule. Your actual sleep is inferred from device signals.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 28 }}>
        <div>
          <label style={{ fontFamily: 'Satoshi', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 10 }}>
            Target Bedtime
          </label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {SLEEP_TARGETS.map(t => (
              <button
                key={t}
                onClick={() => onChange({ sleep_target: t })}
                style={{
                  padding: '8px 14px', borderRadius: 8,
                  border: data.sleep_target === t ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                  background: data.sleep_target === t ? 'var(--accent-subtle)' : 'transparent',
                  color: data.sleep_target === t ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  fontFamily: 'JetBrains Mono', fontWeight: 500, fontSize: 'var(--text-sm)',
                  cursor: 'pointer', transition: 'all 150ms ease',
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label style={{ fontFamily: 'Satoshi', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 10 }}>
            Target Wake Time
          </label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {WAKE_TARGETS.map(t => (
              <button
                key={t}
                onClick={() => onChange({ wake_target: t })}
                style={{
                  padding: '8px 14px', borderRadius: 8,
                  border: data.wake_target === t ? '1px solid var(--success)' : '1px solid var(--border-subtle)',
                  background: data.wake_target === t ? 'rgba(0,224,150,0.1)' : 'transparent',
                  color: data.wake_target === t ? 'var(--success)' : 'var(--text-secondary)',
                  fontFamily: 'JetBrains Mono', fontWeight: 500, fontSize: 'var(--text-sm)',
                  cursor: 'pointer', transition: 'all 150ms ease',
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        {data.sleep_target && data.wake_target && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              padding: 'var(--space-4)', borderRadius: 10,
              background: 'rgba(0,224,150,0.08)', border: '1px solid rgba(0,224,150,0.2)',
            }}
          >
            <p style={{ fontFamily: 'Satoshi', fontSize: 'var(--text-sm)', color: 'var(--text-primary)', margin: 0 }}>
              🌙 Sleep window: <strong style={{ color: 'var(--accent-primary)' }}>{data.sleep_target}</strong> → <strong style={{ color: 'var(--success)' }}>{data.wake_target}</strong>
            </p>
          </motion.div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <button className="btn-ghost" onClick={onPrev} style={{ flex: 1, justifyContent: 'center' }}>← Back</button>
        <button className="btn-primary" onClick={onNext} style={{ flex: 2, justifyContent: 'center' }}>Continue →</button>
      </div>
    </div>
  );
}

// ─── Step 4: Ready ─────────────────────────────────────────────────────────

function StepReady({ data, onFinish, onPrev, loading }: any) {
  const goalLabel = GOALS.find(g => g.id === data.primary_goal);

  return (
    <div className="card-l2" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.1 }}
        style={{ fontSize: 72, marginBottom: 20 }}
      >
        🚀
      </motion.div>

      <h2 style={{
        fontFamily: 'Cabinet Grotesk', fontWeight: 800, fontSize: 'var(--text-2xl)',
        color: 'var(--text-primary)', letterSpacing: '-0.04em', margin: '0 0 8px',
      }}>
        Autopilot is calibrated
      </h2>
      <p style={{ fontFamily: 'Satoshi', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: '0 0 28px', lineHeight: 1.6 }}>
        Your first health briefing is being generated now. The system learns from your patterns — it gets smarter every day.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28, textAlign: 'left' }}>
        {[
          { emoji: goalLabel?.emoji || '🎯', label: 'Primary Goal', value: goalLabel?.label || 'Not set' },
          { emoji: '🌙', label: 'Bedtime Target', value: data.sleep_target || 'Not set' },
          { emoji: '☀️', label: 'Wake Target', value: data.wake_target || 'Not set' },
          { emoji: '🔒', label: 'Privacy', value: 'AES-256 encrypted, zero sharing' },
        ].map(item => (
          <div key={item.label} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 14px', background: 'var(--bg-overlay)',
            borderRadius: 10, border: '1px solid var(--border-subtle)',
          }}>
            <span style={{ fontSize: 18 }}>{item.emoji}</span>
            <span style={{ fontFamily: 'Satoshi', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', flex: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {item.label}
            </span>
            <span style={{ fontFamily: 'Satoshi', fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
              {item.value}
            </span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <button className="btn-ghost" onClick={onPrev} style={{ flex: 1, justifyContent: 'center' }}>← Edit</button>
        <button
          className="btn-primary"
          onClick={onFinish}
          disabled={loading}
          style={{ flex: 2, justifyContent: 'center', minHeight: 48 }}
        >
          {loading ? 'Launching...' : 'Launch Autopilot ⚡'}
        </button>
      </div>
    </div>
  );
}
