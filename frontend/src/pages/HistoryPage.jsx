import { useState, useEffect } from 'react';
import { vitalsAPI } from '../api';
import Sidebar from '../components/Sidebar';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

function getRiskColor(category) {
    const map = {
        'Stable': '#10b981',
        'Mild Abnormality': '#60a5fa',
        'Sepsis / SIRS': '#f59e0b',
        'Cardiac Risk': '#f97316',
        'Respiratory Failure': '#ef4444',
        'Hypertensive Crisis': '#a855f7',
        'Hemodynamic Shock': '#e11d48',
        'Multi-Organ Risk': '#dc2626',
        'Critical Deterioration': '#991b1b',
    };
    return map[category] || '#6366f1';
}

export default function HistoryPage() {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await vitalsAPI.history();
                setHistory(res.data);
            } catch (err) {
                console.error('Failed to fetch history:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, []);

    const chronological = [...history].reverse();

    const trendData = chronological.length > 0 ? {
        labels: chronological.map((v) => {
            const d = new Date(v.timestamp);
            return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
        }),
        datasets: [
            {
                label: 'VitalGuard Index',
                data: chronological.map(v => v.vgi),
                borderColor: '#6366f1',
                backgroundColor: (context) => {
                    const ctx = context.chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
                    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.2)');
                    gradient.addColorStop(1, 'rgba(99, 102, 241, 0.01)');
                    return gradient;
                },
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 8,
                pointBackgroundColor: '#6366f1',
                pointBorderColor: '#0a0e1a',
                pointBorderWidth: 2,
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: '#6366f1',
                pointHoverBorderWidth: 3,
                borderWidth: 2.5,
            },
            {
                label: 'Heart Rate',
                data: chronological.map(v => v.heart_rate),
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.05)',
                borderWidth: 1.5,
                tension: 0.4,
                pointRadius: 2,
                pointBackgroundColor: '#ef4444',
                hidden: true,
            },
            {
                label: 'SpO₂',
                data: chronological.map(v => v.spo2),
                borderColor: '#22d3ee',
                backgroundColor: 'rgba(34, 211, 238, 0.05)',
                borderWidth: 1.5,
                tension: 0.4,
                pointRadius: 2,
                pointBackgroundColor: '#22d3ee',
                hidden: true,
            },
        ],
    } : null;

    const trendOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    color: '#64748b',
                    font: { size: 12, weight: '500' },
                    usePointStyle: true,
                    pointStyle: 'circle',
                    padding: 20,
                },
            },
            tooltip: {
                backgroundColor: 'rgba(15, 22, 41, 0.95)',
                titleColor: '#e2e8f0',
                bodyColor: '#94a3b8',
                borderColor: 'rgba(99, 102, 241, 0.2)',
                borderWidth: 1,
                cornerRadius: 12,
                padding: 14,
                titleFont: { size: 13, weight: '600' },
                bodyFont: { size: 12 },
            },
        },
        scales: {
            x: {
                grid: { color: 'rgba(99, 102, 241, 0.06)', drawBorder: false },
                ticks: { color: '#4b5563', font: { size: 10, weight: '500' }, maxTicksLimit: 10 },
                border: { display: false },
            },
            y: {
                grid: { color: 'rgba(99, 102, 241, 0.06)', drawBorder: false },
                ticks: { color: '#4b5563', font: { size: 11 } },
                border: { display: false },
            },
        },
        animation: {
            duration: 1500,
            easing: 'easeInOutQuart',
        },
    };

    return (
        <div className="flex min-h-screen transition-colors duration-300" style={{ background: 'var(--bg-primary)' }}>
            <div className="bg-mesh"></div>
            <Sidebar />

            <main className="ml-64 flex-1 p-8 relative z-10">
                <div className="mb-8 animate-fade-in">
                    <h1 className="text-2xl font-bold text-white">Vitals History</h1>
                    <p className="text-slate-500 mt-1 text-sm">Complete record of all submitted vital signs and risk assessments</p>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="relative">
                            <div className="w-12 h-12 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                            <div className="absolute inset-0 w-12 h-12 border-2 border-transparent border-b-purple-500/40 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Trend Chart */}
                        {trendData && (
                            <div className="glass-card p-6 mb-6 animate-scale-in">
                                <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(99, 102, 241, 0.1)' }}>
                                        <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                                        </svg>
                                    </div>
                                    Risk Trend Over Time
                                </h3>
                                <div className="h-72">
                                    <Line data={trendData} options={trendOptions} />
                                </div>
                            </div>
                        )}

                        {/* History Table */}
                        <div className="glass-card-static overflow-hidden animate-slide-up">
                            <div className="p-6"
                                style={{ borderBottom: '1px solid rgba(99, 102, 241, 0.08)' }}>
                                <h3 className="text-base font-bold text-white">Vitals Records</h3>
                                <p className="text-xs text-slate-500 mt-1">{history.length} records found</p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr style={{ background: 'rgba(99, 102, 241, 0.04)' }}>
                                            {['Time', 'HR', 'SpO₂', 'Temp', 'RR', 'SBP', 'DBP', 'VGI', 'Risk', 'Est. Hours'].map(h => (
                                                <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {history.length === 0 ? (
                                            <tr>
                                                <td colSpan="10" className="px-4 py-16 text-center">
                                                    <div className="w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center" style={{ background: 'rgba(99, 102, 241, 0.05)' }}>
                                                        <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                        </svg>
                                                    </div>
                                                    <p className="text-slate-500 text-sm">No vitals recorded yet. Submit vitals from the Dashboard.</p>
                                                </td>
                                            </tr>
                                        ) : (
                                            history.map((v, i) => (
                                                <tr key={v.id || i} className="table-row-glass"
                                                    style={{ borderBottom: '1px solid rgba(99, 102, 241, 0.04)' }}>
                                                    <td className="px-4 py-3 text-xs text-slate-400 font-mono">
                                                        {new Date(v.timestamp).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm font-medium text-slate-300">{v.heart_rate}</td>
                                                    <td className="px-4 py-3 text-sm font-medium text-slate-300">{v.spo2}</td>
                                                    <td className="px-4 py-3 text-sm font-medium text-slate-300">{v.temperature}</td>
                                                    <td className="px-4 py-3 text-sm font-medium text-slate-300">{v.respiratory_rate}</td>
                                                    <td className="px-4 py-3 text-sm font-medium text-slate-300">{v.systolic_bp}</td>
                                                    <td className="px-4 py-3 text-sm font-medium text-slate-300">{v.diastolic_bp}</td>
                                                    <td className="px-4 py-3">
                                                        <span className="text-sm font-bold"
                                                            style={{ color: getRiskColor(v.risk_category), textShadow: `0 0 8px ${getRiskColor(v.risk_category)}40` }}>
                                                            {v.vgi?.toFixed(1) ?? '-'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="px-2.5 py-1 text-[10px] font-bold rounded-full text-white true-white"
                                                            style={{
                                                                backgroundColor: getRiskColor(v.risk_category),
                                                                boxShadow: `0 0 10px ${getRiskColor(v.risk_category)}30`,
                                                            }}>
                                                            {v.risk_category || '-'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-slate-500">
                                                        {v.estimated_hours_to_deterioration ? `${v.estimated_hours_to_deterioration}h` : '-'}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
