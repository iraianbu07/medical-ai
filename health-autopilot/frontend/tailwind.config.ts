import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        cabinet: ['Cabinet Grotesk', 'sans-serif'],
        satoshi: ['Satoshi', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        accent: 'var(--accent-primary)',
        surface: 'var(--bg-surface)',
        elevated: 'var(--bg-elevated)',
        overlay: 'var(--bg-overlay)',
      },
      animation: {
        shimmer: 'shimmer 1.5s infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'flame-pulse': 'flame-pulse 1.8s ease-in-out infinite',
        'cursor-blink': 'cursor-blink 530ms infinite',
        'theme-wipe': 'theme-wipe 500ms cubic-bezier(0.76, 0, 0.24, 1) forwards',
        breathing: 'breathing 8s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        'flame-pulse': {
          '0%, 100%': { transform: 'scale(0.95)' },
          '50%': { transform: 'scale(1.05)' },
        },
        'cursor-blink': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        'theme-wipe': {
          '0%': { clipPath: 'circle(0% at calc(100% - 40px) 40px)' },
          '100%': { clipPath: 'circle(150% at calc(100% - 40px) 40px)' },
        },
        breathing: {
          '0%': { background: 'radial-gradient(ellipse at 50% 50%, rgba(0, 229, 255, 0.08) 0%, transparent 70%)' },
          '25%': { background: 'radial-gradient(ellipse at 50% 50%, rgba(0, 229, 255, 0.15) 0%, transparent 80%)' },
          '50%': { background: 'radial-gradient(ellipse at 50% 50%, rgba(0, 229, 255, 0.20) 0%, transparent 90%)' },
          '75%': { background: 'radial-gradient(ellipse at 50% 50%, rgba(0, 229, 255, 0.10) 0%, transparent 75%)' },
          '100%': { background: 'radial-gradient(ellipse at 50% 50%, rgba(0, 229, 255, 0.08) 0%, transparent 70%)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
