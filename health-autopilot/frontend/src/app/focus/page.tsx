'use client';
import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Wind } from 'lucide-react';

type FocusMode = 'breathe' | 'body_scan' | 'mindful';

const EXERCISES = {
  breathe: {
    name: 'Box Breathing',
    description: '4 seconds each phase. Used by Navy SEALs to control stress.',
    phases: [
      { name: 'Inhale', duration: 4, scale: 1.6, color: '#818CF8' },
      { name: 'Hold', duration: 4, scale: 1.6, color: '#F59E0B' },
      { name: 'Exhale', duration: 4, scale: 1, color: '#34D399' },
      { name: 'Hold', duration: 4, scale: 1, color: '#FB923C' },
    ]
  },
  body_scan: {
    name: '4-7-8 Breathing',
    description: 'Inhale 4, hold 7, exhale 8. Activates parasympathetic nervous system.',
    phases: [
      { name: 'Inhale', duration: 4, scale: 1.7, color: '#818CF8' },
      { name: 'Hold', duration: 7, scale: 1.7, color: '#F59E0B' },
      { name: 'Exhale', duration: 8, scale: 1, color: '#34D399' },
    ]
  },
  mindful: {
    name: 'Coherent Breathing',
    description: '5-5 rhythm. Balances heart rate variability.',
    phases: [
      { name: 'Inhale', duration: 5, scale: 1.5, color: '#60A5FA' },
      { name: 'Exhale', duration: 5, scale: 1, color: '#34D399' },
    ]
  }
};

export default function FocusPage() {
  const [selected, setSelected] = useState<FocusMode>('breathe');
  const [active, setActive] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [phaseProgress, setPhaseProgress] = useState(0);
  const [cycle, setCycle] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const animFrameRef = useRef<number>();
  const startRef = useRef<number>(0);
  const phaseStartRef = useRef<number>(0);
  const selectedRef = useRef<FocusMode>('breathe'); // ← always up-to-date inside rAF

  // Keep ref in sync with state
  useEffect(() => { selectedRef.current = selected; }, [selected]);

  const ex = EXERCISES[selected];
  const phase = ex.phases[phaseIndex % ex.phases.length];
  const totalPhases = ex.phases.length;

  const start = () => {
    setActive(true);
    setPhaseIndex(0);
    setPhaseProgress(0);
    setCycle(0);
    setElapsed(0);
    startRef.current = Date.now();
    phaseStartRef.current = Date.now();
    tick();
  };

  const stop = () => {
    setActive(false);
    cancelAnimationFrame(animFrameRef.current!);
    setPhaseIndex(0);
    setPhaseProgress(0);
  };

  const tick = () => {
    animFrameRef.current = requestAnimationFrame(() => {
      const now = Date.now();
      const elapsedMs = now - startRef.current;
      setElapsed(Math.floor(elapsedMs / 1000));

      // Read exercise from ref (avoids stale closure)
      const ex = EXERCISES[selectedRef.current];
      const totalPhaseDuration = ex.phases.reduce((a, p) => a + p.duration, 0) * 1000;
      const cycleMs = elapsedMs % totalPhaseDuration;

      let acc = 0;
      let pIdx = 0;
      let phaseMs = 0;
      for (let i = 0; i < ex.phases.length; i++) {
        const dur = ex.phases[i].duration * 1000;
        if (cycleMs < acc + dur) {
          pIdx = i;
          phaseMs = cycleMs - acc;
          break;
        }
        acc += dur;
      }

      setPhaseIndex(pIdx);
      setPhaseProgress(phaseMs / (ex.phases[pIdx].duration * 1000));
      setCycle(Math.floor(elapsedMs / totalPhaseDuration));

      tick();
    });
  };

  useEffect(() => () => cancelAnimationFrame(animFrameRef.current!), []);

  const formatElapsed = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{
      maxWidth: 600,
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 'var(--space-8)',
      paddingTop: 'var(--space-8)',
    }}>
      <div style={{ textAlign: 'center' }}>
        <Wind size={24} color="var(--accent-primary)" style={{ marginBottom: 12 }} />
        <h1 style={{ fontFamily: 'Cabinet Grotesk', fontWeight: 800, fontSize: 'var(--text-3xl)', color: 'var(--text-primary)', letterSpacing: '-0.04em', margin: '0 0 8px' }}>
          Focus Mode
        </h1>
        <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)', margin: 0, fontFamily: 'Satoshi' }}>
          Guided breathing for stress reduction and nervous system reset
        </p>
      </div>

      {/* Exercise selector */}
      {!active && (
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', justifyContent: 'center' }}>
          {(Object.entries(EXERCISES) as [FocusMode, typeof EXERCISES[FocusMode]][]).map(([key, ex]) => (
            <button
              key={key}
              onClick={() => setSelected(key)}
              style={{
                padding: '10px 18px',
                borderRadius: 10,
                border: selected === key ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                background: selected === key ? 'var(--accent-subtle)' : 'transparent',
                color: selected === key ? 'var(--accent-primary)' : 'var(--text-secondary)',
                fontFamily: 'Satoshi',
                fontWeight: 500,
                fontSize: 'var(--text-sm)',
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
            >
              {ex.name}
            </button>
          ))}
        </div>
      )}

      {/* Description */}
      {!active && (
        <p style={{
          fontFamily: 'Satoshi',
          fontSize: 'var(--text-sm)',
          color: 'var(--text-secondary)',
          textAlign: 'center',
          maxWidth: 400,
          lineHeight: 1.6,
          margin: 0,
        }}>
          {ex.description}
        </p>
      )}

      {/* Breathing circle */}
      <div style={{ position: 'relative', width: 220, height: 220 }}>
        {/* Outer ring */}
        {active && (
          <motion.div
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ repeat: Infinity, duration: phase.duration * 2, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              inset: -30,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${phase.color}20, transparent)`,
            }}
          />
        )}

        {/* Main circle */}
        <motion.div
          animate={active ? { scale: phase.scale } : { scale: 1 }}
          transition={{
            duration: phase.duration,
            ease: phase.name === 'Inhale' ? 'easeIn' : phase.name === 'Exhale' ? 'easeOut' : 'linear',
          }}
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: active
              ? `radial-gradient(circle at 40% 40%, ${phase.color}30, ${phase.color}10)`
              : 'var(--accent-subtle)',
            border: `2px solid ${active ? phase.color : 'var(--accent-primary)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 8,
            cursor: active ? 'default' : 'pointer',
            boxShadow: active ? `0 0 40px ${phase.color}30` : '0 0 20px var(--accent-glow)',
            transition: 'border-color 500ms ease, box-shadow 500ms ease',
          }}
          onClick={!active ? start : undefined}
        >
          {active ? (
            <>
              <span style={{
                fontFamily: 'Cabinet Grotesk',
                fontWeight: 800,
                fontSize: 'var(--text-3xl)',
                color: phase.color,
                letterSpacing: '-0.03em',
              }}>
                {phase.name}
              </span>
              <span style={{
                fontFamily: 'JetBrains Mono',
                fontSize: 'var(--text-sm)',
                color: 'var(--text-secondary)',
              }}>
                {phase.duration}s
              </span>
            </>
          ) : (
            <>
              <Wind size={32} color="var(--accent-primary)" />
              <span style={{
                fontFamily: 'Satoshi',
                fontWeight: 600,
                fontSize: 'var(--text-sm)',
                color: 'var(--accent-primary)',
              }}>
                Tap to start
              </span>
            </>
          )}
        </motion.div>
      </div>

      {/* Stats when active */}
      {active && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: 'flex',
            gap: 'var(--space-6)',
            textAlign: 'center',
          }}
        >
          <div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 'var(--text-xl)', fontWeight: 600, color: 'var(--text-primary)' }}>
              {formatElapsed(elapsed)}
            </div>
            <div style={{ fontFamily: 'Satoshi', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Time</div>
          </div>
          <div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 'var(--text-xl)', fontWeight: 600, color: 'var(--accent-primary)' }}>
              {cycle + 1}
            </div>
            <div style={{ fontFamily: 'Satoshi', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Cycles</div>
          </div>
        </motion.div>
      )}

      {/* Phase progress bar */}
      {active && (
        <div style={{ width: '100%', maxWidth: 300, height: 3, background: 'var(--border-subtle)', borderRadius: 2 }}>
          <motion.div
            animate={{ width: `${phaseProgress * 100}%` }}
            style={{ height: '100%', background: phase.color, borderRadius: 2 }}
            transition={{ duration: 0.1, ease: 'linear' }}
          />
        </div>
      )}

      {/* Stop button */}
      {active && (
        <button
          onClick={stop}
          className="btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <X size={16} /> Stop
        </button>
      )}
    </div>
  );
}
