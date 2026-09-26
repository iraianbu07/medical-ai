'use client';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Brain, CheckSquare, BarChart2, Settings } from 'lucide-react';

const TAB_ITEMS = [
  { href: '/dashboard',  label: 'Home',     icon: LayoutDashboard },
  { href: '/insights',   label: 'Insights', icon: Brain },
  { href: '/check-in',   label: 'Check-in', icon: CheckSquare },
  { href: '/reports',    label: 'Reports',  icon: BarChart2 },
  { href: '/settings',   label: 'Settings', icon: Settings },
];

export default function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav className="bottom-tab-bar" style={{
      alignItems: 'center',
      justifyContent: 'space-around',
    }}>
      {TAB_ITEMS.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;

        return (
          <Link key={item.href} href={item.href} style={{ textDecoration: 'none', flex: 1 }}>
            <motion.div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                padding: '8px 0',
                cursor: 'pointer',
              }}
              whileTap={{ scale: 0.9 }}
            >
              <motion.div
                animate={{ scale: isActive ? 1.1 : 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              >
                <Icon
                  size={22}
                  color={isActive ? 'var(--accent-primary)' : 'var(--text-tertiary)'}
                />
              </motion.div>
              <span style={{
                fontFamily: 'Satoshi, sans-serif',
                fontSize: 'var(--text-xs)',
                fontWeight: 500,
                color: isActive ? 'var(--accent-primary)' : 'var(--text-tertiary)',
              }}>
                {item.label}
              </span>
            </motion.div>
          </Link>
        );
      })}
    </nav>
  );
}
