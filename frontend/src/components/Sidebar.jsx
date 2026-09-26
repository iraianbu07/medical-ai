import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useTheme } from '../ThemeContext';

export default function Sidebar() {
    const { patientId, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        {
            id: 'dashboard', label: 'Dashboard', path: '/dashboard',
            icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
        },
        {
            id: 'live-monitor', label: 'Live Monitor', path: '/live-monitor',
            icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
        },
        {
            id: 'patients', label: 'Patients', path: '/patients',
            icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>,
        },
        {
            id: 'events', label: 'Events Timeline', path: '/events',
            icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
        },
        {
            id: 'ai-insights', label: 'AI Insights', path: '/ai-insights',
            icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>,
        },
        {
            id: 'devices', label: 'Device Status', path: '/devices',
            icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>,
        },
        {
            id: 'history', label: 'History', path: '/history',
            icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
        },

        {
            id: 'camera-vision', label: 'Camera Vision Prediction', path: '/camera-vision',
            icon: <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
            isNew: true,
        },
        {
            id: 'anatomy-twin', label: '3D Anatomical Twin', path: '/anatomy-twin',
            icon: <svg className="w-5 h-5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /><circle cx="12" cy="7" r="1" fill="currentColor" /><circle cx="12" cy="14" r="1" fill="currentColor" /></svg>,
            isNew: true,
        },
    ];

    return (
        <aside className="fixed left-0 top-0 w-64 h-screen flex flex-col z-50 transition-colors duration-300"
            style={{
                backgroundColor: 'var(--bg-secondary)',
                borderRight: '1px solid var(--border-glass)',
            }}
        >
            {/* Brand */}
            <div className="p-5 border-b" style={{ borderColor: 'var(--border-glass)' }}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-400 flex items-center justify-center logo-glow">
                            <svg className="w-5 h-5 text-white heart-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-base font-bold tracking-tight text-white mb-0">VITALGUARD</h1>
                            <p className="text-[10px] font-medium gradient-text leading-none">AI Monitoring</p>
                        </div>
                    </div>
                    <button onClick={toggleTheme} className="p-2 rounded-lg text-slate-400 hover:text-white transition-colors"
                        style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-glass)' }}>
                        {theme === 'dark' ? '☀️' : '🌙'}
                    </button>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 overflow-y-auto">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <button
                            key={item.id}
                            id={`nav-${item.id}`}
                            onClick={() => navigate(item.path)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 text-sm font-medium transition-all duration-300 relative group ${isActive ? 'text-white' : 'text-slate-500 hover:text-slate-200'} ${item.isNew ? 'border border-indigo-500/30 shadow-[0_0_10px_rgba(99,102,241,0.1)] mt-2' : ''}`}
                            style={isActive ? {
                                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.08) 100%)',
                                boxShadow: '0 0 20px rgba(99, 102, 241, 0.1)',
                            } : {}}
                        >
                            {isActive && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-full bg-gradient-to-b from-indigo-400 to-purple-500 shadow-glow-blue"></div>
                            )}
                            <span className={isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300 transition-colors'}>{item.icon}</span>
                            {item.label}
                            {item.isNew && !isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-glow-blue animate-pulse"></div>}
                            {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-glow-blue animate-pulse"></div>}
                        </button>
                    );
                })}
            </nav>

            {/* System Status */}
            <div className="px-4 py-2">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(16, 185, 129, 0.05)' }}>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                    <span className="text-[10px] text-emerald-400/70 font-medium">System Operational</span>
                </div>
            </div>

            {/* Logout */}
            <div className="p-3 border-t border-white/5">
                <button
                    id="logout-button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-red-400 transition-all duration-300 group"
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                    <svg className="w-5 h-5 group-hover:text-red-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Logout
                </button>
            </div>
        </aside>
    );
}
