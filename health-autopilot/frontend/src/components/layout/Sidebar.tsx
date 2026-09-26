'use client';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Brain, CheckSquare, ListChecks, BarChart2,
  Trophy, Focus, Settings, Shield, Zap
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard',       label: 'Dashboard',       icon: LayoutDashboard },
  { href: '/insights',        label: 'Insights',         icon: Brain },
  { href: '/check-in',        label: 'Check-in',         icon: CheckSquare },
  { href: '/recommendations', label: 'Recommendations',  icon: ListChecks },
  { href: '/reports',         label: 'Reports',          icon: BarChart2 },
  { href: '/achievements',    label: 'Achievements',     icon: Trophy },
  { href: '/focus',           label: 'Focus Mode',       icon: Focus },
  { href: '/settings',        label: 'Settings',         icon: Settings },
  { href: '/my-data',         label: 'Privacy',          icon: Shield },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar" style={{
      width: 240,
      height: '100vh',
      position: 'sticky',
      top: 0,
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Logo */}
      <div style={{
        height: 64,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '0 var(--space-5)',
        borderBottom: '1px solid var(--border-subtle)',
        flexShrink: 0,
      }}>
        <div style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: 'var(--accent-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Zap size={16} color="#000" fill="#000" />
        </div>
        <span style={{
          fontFamily: 'Satoshi, sans-serif',
          fontWeight: 700,
          fontSize: 'var(--text-sm)',
          color: 'var(--text-primary)',
          letterSpacing: '-0.01em',
        }}>
          Autopilot OS
        </span>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: 'var(--space-3) var(--space-3)', overflowY: 'auto' }}>
        <div style={{ position: 'relative' }}>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            const Icon = item.icon;

            return (
              <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                <motion.div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    padding: '10px var(--space-4)',
                    borderRadius: 10,
                    marginBottom: 2,
                    position: 'relative',
                    borderLeft: isActive ? '2px solid var(--accent-primary)' : '2px solid transparent',
                    background: isActive ? 'var(--accent-subtle)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background 150ms ease, border-color 150ms ease',
                  }}
                  whileHover={{
                    background: isActive ? 'var(--accent-subtle)' : 'var(--bg-overlay)',
                  }}
                >
                  <Icon
                    size={20}
                    color={isActive ? 'var(--accent-primary)' : 'var(--text-secondary)'}
                    style={{ flexShrink: 0, transition: 'color 150ms ease' }}
                  />
                  <span style={{
                    fontFamily: 'Satoshi, sans-serif',
                    fontWeight: 500,
                    fontSize: 'var(--text-sm)',
                    color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    transition: 'color 150ms ease',
                  }}>
                    {item.label}
                  </span>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Bottom: version */}
      <div style={{
        padding: 'var(--space-4)',
        borderTop: '1px solid var(--border-subtle)',
        flexShrink: 0,
      }}>
        <p style={{
          fontSize: 'var(--text-xs)',
          color: 'var(--text-tertiary)',
          fontFamily: 'JetBrains Mono, monospace',
          margin: 0,
          textAlign: 'center',
        }}>
          v1.0.0
        </p>
      </div>
    </aside>
  );
}
