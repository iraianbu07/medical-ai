'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { THEME_ACCENTS, THEME_LABELS, ThemeName, applyTheme, getStoredTheme } from '@/lib/themes';
import { usersApi } from '@/lib/api';

export default function ThemeSwitcher() {
  const [current, setCurrent] = useState<ThemeName>('midnight');
  const [open, setOpen] = useState(false);
  const wipeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrent(getStoredTheme());
  }, []);

  const handleThemeChange = async (theme: ThemeName) => {
    if (theme === current) { setOpen(false); return; }

    // Trigger clip-path wipe animation
    if (wipeRef.current) {
      wipeRef.current.style.backgroundColor = 'var(--bg-base)';
      wipeRef.current.style.animation = 'none';
      wipeRef.current.offsetHeight; // force reflow
      wipeRef.current.style.animation = 'theme-wipe 500ms cubic-bezier(0.76, 0, 0.24, 1) forwards';
    }

    setTimeout(() => {
      applyTheme(theme);
      setCurrent(theme);
      if (wipeRef.current) {
        wipeRef.current.style.animation = 'none';
      }
    }, 250);

    setOpen(false);

    // Persist to backend
    try {
      await usersApi.updatePreferences({ theme_preference: theme });
    } catch {}
  };

  return (
    <>
      {/* Wipe overlay */}
      <div
        ref={wipeRef}
        className="theme-wipe-overlay"
        style={{ clipPath: 'circle(0% at calc(100% - 40px) 40px)', backgroundColor: 'transparent' }}
      />

      {/* Floating pill */}
      <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 100 }}>
        <motion.button
          onClick={() => setOpen(!open)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            borderRadius: 50,
            cursor: 'pointer',
            backdropFilter: 'blur(20px)',
          }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
        >
          {Object.entries(THEME_ACCENTS).map(([name, color]) => (
            <motion.div
              key={name}
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: color,
                border: name === current ? `2px solid ${color}` : '2px solid transparent',
                boxShadow: name === current ? `0 0 6px ${color}60` : 'none',
              }}
              whileHover={{ scale: 1.3 }}
              onClick={(e) => { e.stopPropagation(); handleThemeChange(name as ThemeName); }}
              title={THEME_LABELS[name as ThemeName]}
            />
          ))}
        </motion.button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'absolute',
                right: 0,
                top: 48,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-strong)',
                borderRadius: 12,
                padding: 8,
                minWidth: 140,
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              }}
            >
              {(Object.entries(THEME_LABELS) as [ThemeName, string][]).map(([name, label]) => (
                <motion.button
                  key={name}
                  onClick={() => handleThemeChange(name)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    padding: '8px 12px',
                    background: name === current ? 'var(--accent-subtle)' : 'transparent',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer',
                    color: name === current ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    fontFamily: 'Satoshi, sans-serif',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 500,
                    textAlign: 'left',
                  }}
                  whileHover={{ x: 2 }}
                >
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    backgroundColor: THEME_ACCENTS[name],
                    flexShrink: 0,
                  }} />
                  {label}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
