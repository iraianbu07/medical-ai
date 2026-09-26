import { useState, useEffect } from 'react';
import { eventsAPI } from '../api';
import Sidebar from '../components/Sidebar';

export default function EventsTimelinePage() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        const fetch = async () => {
            try {
                const res = await eventsAPI.list(200);
                setEvents(res.data);
            } catch(e) {}
            finally { setLoading(false); }
        };
        fetch();
    }, []);

    // Auto-refresh
    useEffect(() => {
        const i = setInterval(async () => {
            try { const res = await eventsAPI.list(200); setEvents(res.data); } catch(e) {}
        }, 10000);
        return () => clearInterval(i);
    }, []);

    const filtered = filter === 'all' ? events : events.filter(e => e.event_type === filter);
    const severityColors = { critical: '#ef4444', warning: '#f59e0b', info: '#6366f1' };
    const typeIcons = { vital_submitted: '💉', alert: '🚨', risk_change: '📊', email_sent: '📧' };

    return (
        <div className="flex min-h-screen transition-colors duration-300" style={{ background: 'var(--bg-primary)' }}>
            <div className="bg-mesh"></div>
            <Sidebar />
            <main className="ml-64 flex-1 p-6 relative z-10">
                <div className="flex items-center justify-between mb-6 animate-fade-in">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Events Timeline</h1>
                        <p className="text-slate-500 text-sm mt-1">Complete activity log with severity tracking</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {['all','vital_submitted','alert','email_sent'].map(f => (
                            <button key={f} onClick={() => setFilter(f)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === f ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
                                style={filter === f ? { background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' } : { border: '1px solid rgba(99,102,241,0.08)' }}>
                                {f === 'all' ? 'All' : f === 'vital_submitted' ? '💉 Vitals' : f === 'alert' ? '🚨 Alerts' : '📧 Emails'}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="w-12 h-12 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <div className="relative animate-slide-up">
                        {/* Timeline line */}
                        <div className="absolute left-6 top-0 bottom-0 w-px" style={{ background: 'rgba(99,102,241,0.1)' }}></div>

                        <div className="space-y-3">
                            {filtered.length > 0 ? filtered.map((evt, i) => {
                                const color = severityColors[evt.severity] || '#6366f1';
                                const icon = typeIcons[evt.event_type] || '📋';
                                const time = evt.timestamp ? new Date(evt.timestamp) : null;
                                return (
                                    <div key={evt.id || i} className={`relative pl-14 stagger-${Math.min(i+1, 6)}`}>
                                        {/* Dot on timeline */}
                                        <div className="absolute left-[18px] top-4 w-3 h-3 rounded-full border-2"
                                            style={{ backgroundColor: `${color}30`, borderColor: color, boxShadow: `0 0 8px ${color}40` }}>
                                            {evt.severity === 'critical' && <div className="absolute inset-0 rounded-full animate-ping" style={{ backgroundColor: `${color}30` }}></div>}
                                        </div>
                                        <div className="glass-card p-4 hover:scale-[1.01] transition-transform"
                                            style={{ borderColor: `${color}15` }}>
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-start gap-3">
                                                    <span className="text-lg">{icon}</span>
                                                    <div>
                                                        <p className="text-sm text-slate-200">{evt.message}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase"
                                                                style={{ backgroundColor: `${color}15`, color, border: `1px solid ${color}30` }}>
                                                                {evt.severity}
                                                            </span>
                                                            <span className="text-[10px] text-slate-600">{evt.event_type?.replace(/_/g, ' ')}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    {time && <>
                                                        <p className="text-xs text-slate-400">{time.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', timeZone:'Asia/Kolkata' })}</p>
                                                        <p className="text-[10px] text-slate-600">{time.toLocaleDateString('en-IN', { month:'short', day:'numeric', timeZone:'Asia/Kolkata' })}</p>
                                                    </>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }) : (
                                <div className="text-center py-16">
                                    <p className="text-4xl mb-3">📭</p>
                                    <p className="text-slate-500 text-sm">No events recorded yet. Submit vitals from the Dashboard to start tracking.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
