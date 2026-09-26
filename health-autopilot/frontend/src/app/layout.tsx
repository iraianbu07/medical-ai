import type { Metadata, Viewport } from 'next';
import '../styles/globals.css';
import Sidebar from '@/components/layout/Sidebar';
import BottomTabBar from '@/components/layout/BottomTabBar';
import ThemeSwitcher from '@/components/ui/ThemeSwitcher';

export const metadata: Metadata = {
  title: 'Health Autopilot OS — Your Autonomous Health Decision Engine',
  description: 'An AI system that decides what you should do today for optimal health — automatically, without discipline or manual tracking.',
  keywords: ['health', 'AI', 'autopilot', 'wellness', 'sleep', 'fitness', 'mental health'],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#080810',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="midnight" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.cdnfonts.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                var theme = localStorage.getItem('autopilot-theme') || 'midnight';
                document.documentElement.setAttribute('data-theme', theme);
              } catch(e) {}
            })();
          `
        }} />
      </head>
      <body>
        <ThemeInitializer />
        <ThemeSwitcher />
        <div className="app-layout">
          <Sidebar />
          <main className="main-content" style={{
            padding: 'var(--space-8)',
            minHeight: '100vh',
            maxWidth: '100%',
          }}>
            {children}
          </main>
        </div>
        <BottomTabBar />
      </body>
    </html>
  );
}

function ThemeInitializer() {
  return null; // Theme set via inline script above
}
