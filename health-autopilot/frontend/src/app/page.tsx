'use client';
import { useEffect } from 'react';

export default function HomePage() {
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    window.location.href = token ? '/dashboard' : '/login';
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-base)',
    }}>
      <div style={{
        width: 40,
        height: 40,
        border: '3px solid var(--accent-primary)',
        borderTopColor: 'transparent',
        borderRadius: '50%',
        animation: 'spin 700ms linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
