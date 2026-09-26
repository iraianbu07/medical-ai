/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Dark backgrounds
                bgPrimary: '#0a0e1a',
                bgSecondary: '#0f1629',
                bgCard: 'rgba(15, 22, 41, 0.6)',
                bgCardSolid: '#111827',

                // Sidebar
                sidebar: '#080c16',

                // Glass
                glassBg: 'rgba(15, 22, 41, 0.5)',
                glassBorder: 'rgba(99, 102, 241, 0.12)',

                // Legacy
                bgMain: '#0a0e1a',
                cardWhite: 'rgba(15, 22, 41, 0.6)',

                // Neon accents
                neonBlue: '#6366f1',
                neonViolet: '#8b5cf6',
                neonCyan: '#22d3ee',
                neonPink: '#ec4899',

                // Risk colors
                vgGreen: '#10b981',
                vgYellow: '#f59e0b',
                vgOrange: '#f97316',
                vgRed: '#ef4444',
                vgCritical: '#dc2626',

                // Accent
                accent: '#6366f1',
                accentLight: '#818cf8',
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            boxShadow: {
                'card': '0 4px 24px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2)',
                'card-hover': '0 12px 40px rgba(0, 0, 0, 0.4), 0 0 20px rgba(99, 102, 241, 0.1)',
                'glow': '0 0 20px rgba(99, 102, 241, 0.3)',
                'glow-blue': '0 0 20px rgba(99, 102, 241, 0.3), 0 0 60px rgba(99, 102, 241, 0.1)',
                'glow-violet': '0 0 20px rgba(139, 92, 246, 0.3), 0 0 60px rgba(139, 92, 246, 0.1)',
                'glow-red': '0 0 20px rgba(239, 68, 68, 0.4), 0 0 60px rgba(239, 68, 68, 0.15)',
                'glow-amber': '0 0 20px rgba(245, 158, 11, 0.3), 0 0 60px rgba(245, 158, 11, 0.1)',
                'glow-green': '0 0 20px rgba(16, 185, 129, 0.3), 0 0 60px rgba(16, 185, 129, 0.1)',
                'glow-cyan': '0 0 20px rgba(34, 211, 238, 0.3), 0 0 60px rgba(34, 211, 238, 0.1)',
                'inner-glow': 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
                'depth': '0 20px 60px rgba(0, 0, 0, 0.5)',
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'slide-up': 'slideUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) both',
                'slide-down': 'slideDown 0.5s cubic-bezier(0.4, 0, 0.2, 1) both',
                'fade-in': 'fadeIn 0.5s ease-out both',
                'scale-in': 'scaleIn 0.5s cubic-bezier(0.4, 0, 0.2, 1) both',
                'float': 'cardFloat 6s ease-in-out infinite',
                'glow-pulse': 'glowPulse 3s ease-in-out infinite',
                'gradient-shift': 'gradientShift 8s ease-in-out infinite',
                'spin-slow': 'spin 8s linear infinite',
            },
            keyframes: {
                slideUp: {
                    '0%': { transform: 'translateY(20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                slideDown: {
                    '0%': { transform: 'translateY(-10px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                scaleIn: {
                    '0%': { transform: 'scale(0.95)', opacity: '0' },
                    '100%': { transform: 'scale(1)', opacity: '1' },
                },
                cardFloat: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-4px)' },
                },
                glowPulse: {
                    '0%, 100%': { boxShadow: '0 0 15px rgba(99, 102, 241, 0.2)' },
                    '50%': { boxShadow: '0 0 30px rgba(99, 102, 241, 0.4)' },
                },
                gradientShift: {
                    '0%': { backgroundPosition: '0% 50%' },
                    '50%': { backgroundPosition: '100% 50%' },
                    '100%': { backgroundPosition: '0% 50%' },
                },
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(ellipse at center, var(--tw-gradient-stops))',
                'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
            },
        },
    },
    plugins: [],
}
