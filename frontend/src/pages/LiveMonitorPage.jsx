import { useState, useEffect, useRef } from 'react';
import { predictionAPI, vitalsAPI } from '../api';
import Sidebar from '../components/Sidebar';

function getRiskColor(c) {
    return { 'Stable':'#10b981','Mild Abnormality':'#60a5fa','Sepsis / SIRS':'#f59e0b','Cardiac Risk':'#f97316','Respiratory Failure':'#ef4444','Hypertensive Crisis':'#a855f7','Hemodynamic Shock':'#e11d48','Multi-Organ Risk':'#dc2626','Critical Deterioration':'#991b1b' }[c] || '#6366f1';
}

function ECGLine({ color = '#10b981' }) {
    const canvasRef = useRef(null);
    const offsetRef = useRef(0);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width = canvas.offsetWidth * 2;
        const h = canvas.height = canvas.offsetHeight * 2;
        ctx.scale(2, 2);
        const draw = () => {
            ctx.clearRect(0, 0, w, h);
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.shadowColor = color;
            ctx.shadowBlur = 8;
            const mid = h / 4;
            for (let x = 0; x < w / 2; x++) {
                const px = (x + offsetRef.current) % (w / 2);
                let y = mid;
                const cycle = px % 120;
                if (cycle > 40 && cycle < 48) y = mid - 25;
                else if (cycle > 48 && cycle < 52) y = mid + 35;
                else if (cycle > 52 && cycle < 58) y = mid - 15;
                else if (cycle > 58 && cycle < 65) y = mid + 5;
                if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();
            offsetRef.current += 1.5;
            requestAnimationFrame(draw);
        };
        const af = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(af);
    }, [color]);
    return <canvas ref={canvasRef} className="w-full h-full" style={{ opacity: 0.8 }} />;
}

export default function LiveMonitorPage() {
    const [prediction, setPrediction] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(null);

    const fetchData = async () => {
        try {
            const [pred, hist] = await Promise.allSettled([predictionAPI.current(), vitalsAPI.history()]);
            if (pred.status === 'fulfilled') setPrediction(pred.value.data);
            if (hist.status === 'fulfilled') setHistory(hist.value.data.slice(0, 5));
            setLastUpdate(new Date());
        } catch(e) {}
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);
    useEffect(() => { const i = setInterval(fetchData, 5000); return () => clearInterval(i); }, []);

    const vgi = prediction?.vgi ?? 0;
    const category = prediction?.risk_category ?? 'Stable';
    const color = getRiskColor(category);

    const vitals = [
        { key: 'heart_rate', label: 'Heart Rate', unit: 'bpm', icon: '❤️', color: '#ef4444' },
        { key: 'spo2', label: 'SpO₂', unit: '%', icon: '🫁', color: '#6366f1' },
        { key: 'temperature', label: 'Temperature', unit: '°C', icon: '🌡️', color: '#f59e0b' },
        { key: 'respiratory_rate', label: 'Resp Rate', unit: '/min', icon: '💨', color: '#22d3ee' },
        { key: 'systolic_bp', label: 'Systolic BP', unit: 'mmHg', icon: '🔴', color: '#ec4899' },
        { key: 'diastolic_bp', label: 'Diastolic BP', unit: 'mmHg', icon: '🔵', color: '#8b5cf6' },
    ];

    return (
        <div className="flex min-h-screen transition-colors duration-300" style={{ background: 'var(--bg-primary)' }}>
            <div className="bg-mesh"></div>
            <Sidebar />
            <main className="ml-64 flex-1 p-6 relative z-10">
                <div className="flex items-center justify-between mb-6 animate-fade-in">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Live Monitor</h1>
                        <p className="text-slate-500 text-sm mt-1">Real-time vital signs • Auto-refreshes every 5 seconds</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                            <span className="text-xs font-medium text-emerald-400">LIVE</span>
                        </div>
                        {lastUpdate && <span className="text-[10px] text-slate-600">Updated: {lastUpdate.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}</span>}
                    </div>
                </div>

                {/* ECG Waveform */}
                <div className="glass-card p-4 mb-5 animate-scale-in">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                            ECG Waveform
                        </h3>
                        <span className="text-xs text-slate-500">VGI: <span className="font-bold" style={{ color }}>{vgi}%</span></span>
                    </div>
                    <div className="h-24"><ECGLine color={color} /></div>
                </div>

                {/* Vital Gauges */}
                <div className="grid grid-cols-3 gap-4 mb-5">
                    {vitals.map((v, i) => {
                        const val = prediction?.current_vitals?.[v.key] || prediction?.baseline?.[v.key] || 0;
                        return (
                            <div key={v.key} className={`glass-card p-5 text-center stagger-${i+1} animate-slide-up`}>
                                <span className="text-2xl">{v.icon}</span>
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-2 mb-1">{v.label}</p>
                                <p className="text-4xl font-black text-white mb-1">{val || '—'}</p>
                                <p className="text-xs text-slate-500">{v.unit}</p>
                                <div className="mt-3 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(99,102,241,0.08)' }}>
                                    <div className="h-full rounded-full" style={{ width: '70%', background: v.color, boxShadow: `0 0 8px ${v.color}60` }}></div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Recent Readings */}
                <div className="glass-card-static p-5 animate-slide-up">
                    <h3 className="text-sm font-bold text-white mb-3">Recent Readings</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr style={{ background: 'rgba(99,102,241,0.04)' }}>
                                    {['Time','HR','SpO₂','Temp','RR','SBP','DBP','VGI','Category'].map(h => (
                                        <th key={h} className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {history.map((v, i) => (
                                    <tr key={v.id || i} className="table-row-glass" style={{ borderBottom: '1px solid rgba(99,102,241,0.04)' }}>
                                        <td className="px-3 py-2 text-xs text-slate-400 font-mono">{new Date(v.timestamp).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', timeZone:'Asia/Kolkata' })}</td>
                                        <td className="px-3 py-2 text-xs text-slate-300">{v.heart_rate}</td>
                                        <td className="px-3 py-2 text-xs text-slate-300">{v.spo2}</td>
                                        <td className="px-3 py-2 text-xs text-slate-300">{v.temperature}</td>
                                        <td className="px-3 py-2 text-xs text-slate-300">{v.respiratory_rate}</td>
                                        <td className="px-3 py-2 text-xs text-slate-300">{v.systolic_bp}</td>
                                        <td className="px-3 py-2 text-xs text-slate-300">{v.diastolic_bp}</td>
                                        <td className="px-3 py-2 text-xs font-bold" style={{ color: getRiskColor(v.risk_category) }}>{v.vgi?.toFixed(1) || '-'}</td>
                                        <td className="px-3 py-2"><span className="px-2 py-0.5 text-[9px] font-bold rounded-full text-white true-white" style={{ backgroundColor: getRiskColor(v.risk_category) }}>{v.risk_category || '-'}</span></td>
                                    </tr>
                                ))}
                                {history.length === 0 && <tr><td colSpan="9" className="px-3 py-8 text-center text-slate-500 text-xs">No readings yet</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}
