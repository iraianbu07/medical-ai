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

    // Reverse for chronological chart order (API returns desc)
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
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6,
                borderWidth: 2,
            },
            {
                label: 'Heart Rate',
                data: chronological.map(v => v.heart_rate),
                borderColor: '#ef4444',
                borderWidth: 1.5,
                tension: 0.4,
                pointRadius: 2,
                hidden: true,
            },
            {
                label: 'SpO₂',
                data: chronological.map(v => v.spo2),
                borderColor: '#3b82f6',
                borderWidth: 1.5,
                tension: 0.4,
                pointRadius: 2,
                hidden: true,
            },
        ],
    } : null;

    const trendOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: { color: '#64748b', font: { size: 12 }, usePointStyle: true, pointStyle: 'circle' },
            },
            tooltip: {
                backgroundColor: '#1e293b',
                titleColor: '#e2e8f0',
                bodyColor: '#e2e8f0',
                borderColor: '#334155',
                borderWidth: 1,
                cornerRadius: 8,
                padding: 12,
            },
        },
        scales: {
            x: {
                grid: { color: '#e2e8f010' },
                ticks: { color: '#94a3b8', font: { size: 10 }, maxTicksLimit: 10 },
            },
            y: {
                grid: { color: '#e2e8f010' },
                ticks: { color: '#94a3b8', font: { size: 11 } },
            },
        },
    };

    return (
        <div className="flex min-h-screen bg-bgMain">
            <Sidebar />

            <main className="ml-64 flex-1 p-8">
                <div className="mb-8 animate-fade-in">
                    <h1 className="text-2xl font-bold text-slate-800">Vitals History</h1>
                    <p className="text-slate-500 mt-1">Complete record of all submitted vital signs and risk assessments</p>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full"></div>
                    </div>
                ) : (
                    <>
                        {/* Trend Chart */}
                        {trendData && (
                            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-card mb-6 animate-scale-in">
                                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                                    </svg>
                                    Risk Trend Over Time
                                </h3>
                                <div className="h-72">
                                    <Line data={trendData} options={trendOptions} />
                                </div>
                            </div>
                        )}

                        {/* History Table */}
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden animate-slide-up">
                            <div className="p-6 border-b border-slate-100">
                                <h3 className="text-lg font-bold text-slate-800">Vitals Records</h3>
                                <p className="text-sm text-slate-400 mt-1">{history.length} records found</p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-slate-50">
                                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Time</th>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">HR</th>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">SpO₂</th>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Temp</th>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">RR</th>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">SBP</th>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">DBP</th>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">VGI</th>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Risk</th>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Est. Hours</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {history.length === 0 ? (
                                            <tr>
                                                <td colSpan="10" className="px-4 py-12 text-center text-slate-400">
                                                    <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                    No vitals recorded yet. Submit vitals from the Dashboard.
                                                </td>
                                            </tr>
                                        ) : (
                                            history.map((v, i) => (
                                                <tr key={v.id || i} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-4 py-3 text-sm text-slate-600 font-mono">
                                                        {new Date(v.timestamp).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm font-medium text-slate-700">{v.heart_rate}</td>
                                                    <td className="px-4 py-3 text-sm font-medium text-slate-700">{v.spo2}</td>
                                                    <td className="px-4 py-3 text-sm font-medium text-slate-700">{v.temperature}</td>
                                                    <td className="px-4 py-3 text-sm font-medium text-slate-700">{v.respiratory_rate}</td>
                                                    <td className="px-4 py-3 text-sm font-medium text-slate-700">{v.systolic_bp}</td>
                                                    <td className="px-4 py-3 text-sm font-medium text-slate-700">{v.diastolic_bp}</td>
                                                    <td className="px-4 py-3">
                                                        <span className="text-sm font-bold" style={{ color: getRiskColor(v.risk_category) }}>
                                                            {v.vgi?.toFixed(1) ?? '-'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="px-2 py-1 text-xs font-bold rounded-full text-white" style={{ backgroundColor: getRiskColor(v.risk_category) }}>
                                                            {v.risk_category || '-'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-slate-600">
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
