'use client';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { metricsApi } from '@/lib/api';

const EMOJIS = ['😞', '😕', '😐', '🙂', '😄'];
const LABELS = ['Rough', 'Meh', 'Okay', 'Good', 'Great'];

interface Props {
  current?: number;
  onSelect?: (score: number) => void;
}

export default function MoodSelector({ current, onSelect }: Props) {
  const [selected, setSelected] = useState<number | null>(current ?? null);
  const [saving, setSaving] = useState(false);

  const handleSelect = async (score: number) => {
    setSelected(score);
    setSaving(true);

    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(10);

    try {
      await metricsApi.submitMood(score);
      onSelect?.(score);
    } catch {}
    setSaving(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
        {EMOJIS.map((emoji, i) => {
          const score = i + 1;
          const isSelected = selected === score;
          const hasSelection = selected !== null;
          const isOther = hasSelection && !isSelected;

          return (
            <motion.button
              key={score}
              onClick={() => handleSelect(score)}
              animate={{
                scale: isSelected ? 1.15 : isOther ? 0.75 : 0.85,
                opacity: isOther ? 0.4 : 1,
                filter: isOther ? 'grayscale(60%)' : 'grayscale(0%)',
              }}
              whileHover={{
                scale: isSelected ? 1.2 : 1.0,
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: isSelected ? 'var(--accent-subtle)' : 'transparent',
                border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                boxShadow: isSelected ? `0 0 0 3px var(--accent-glow)` : 'none',
                cursor: 'pointer',
                fontSize: 26,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 150ms ease, border 150ms ease, box-shadow 150ms ease',
              }}
              aria-label={`Mood: ${LABELS[i]}`}
            >
              {emoji}
            </motion.button>
          );
        })}
      </div>
      {selected && (
        <motion.p
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            fontFamily: 'Satoshi, sans-serif',
            fontWeight: 600,
            fontSize: 'var(--text-sm)',
            color: 'var(--accent-primary)',
            margin: 0,
          }}
        >
          {LABELS[selected - 1]} {saving ? '...' : '✓'}
        </motion.p>
      )}
    </div>
  );
}
