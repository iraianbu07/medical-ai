'use client';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { Droplets, Plus } from 'lucide-react';
import { metricsApi } from '@/lib/api';

interface Props {
  initial?: number;
  max?: number;
}

export default function HydrationTracker({ initial = 0, max = 10 }: Props) {
  const [cups, setCups] = useState(initial);
  const [animating, setAnimating] = useState<number | null>(null);

  const handleTap = async (index: number) => {
    const newCups = index + 1 === cups ? index : index + 1; // toggle off if same
    setCups(newCups);
    setAnimating(index);
    setTimeout(() => setAnimating(null), 300);

    if (navigator.vibrate) navigator.vibrate(8);

    try {
      await metricsApi.setHydration(newCups);
    } catch {}
  };

  const addCup = async () => {
    if (cups >= max) return;
    const newCups = cups + 1;
    setCups(newCups);
    try {
      await metricsApi.addHydrationCup();
    } catch {}
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 'var(--text-2xl)',
            fontWeight: 600,
            color: 'var(--accent-primary)',
          }}>
            {cups}
          </span>
          <span style={{
            fontFamily: 'Satoshi, sans-serif',
            fontSize: 'var(--text-sm)',
            color: 'var(--text-tertiary)',
            marginLeft: 6,
          }}>
            / {max} cups
          </span>
        </div>
        <button
          onClick={addCup}
          className="btn-secondary"
          style={{ padding: '8px 12px', minHeight: 36, gap: 4, fontSize: 'var(--text-xs)' }}
          disabled={cups >= max}
        >
          <Plus size={14} /> Add cup
        </button>
      </div>

      {/* Water drop grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(10, 1fr)',
        gap: 6,
      }}>
        {Array.from({ length: max }, (_, i) => (
          <motion.button
            key={i}
            onClick={() => handleTap(i)}
            animate={{
              scale: animating === i ? [1, 1.4, 1] : 1,
            }}
            transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
            style={{
              width: '100%',
              aspectRatio: '1',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              padding: 2,
              minHeight: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label={`Cup ${i + 1}`}
          >
            <Droplets
              size={20}
              color={i < cups ? 'var(--accent-primary)' : 'var(--border-default)'}
              style={{ transition: 'color 200ms ease', fill: i < cups ? 'var(--accent-subtle)' : 'none' }}
            />
          </motion.button>
        ))}
      </div>

      {cups >= 6 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--success)',
            fontFamily: 'Satoshi, sans-serif',
            fontWeight: 500,
            margin: 0,
          }}
        >
          ✓ Well hydrated today!
        </motion.p>
      )}
    </div>
  );
}
