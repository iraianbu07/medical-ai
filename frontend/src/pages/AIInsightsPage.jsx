import { useState, useEffect } from 'react';
import { predictionAPI } from '../api';
import Sidebar from '../components/Sidebar';
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
    Title, Tooltip, Legend, Filler, BarElement, RadialLinearScale, ArcElement,
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler, BarElement, RadialLinearScale, ArcElement);

function getRiskColor(c) {
    return { 'Stable':'#10b981','Mild Abnormality':'#60a5fa','Sepsis / SIRS':'#f59e0b','Cardiac Risk':'#f97316','Respiratory Failure':'#ef4444','Hypertensive Crisis':'#a855f7','Hemodynamic Shock':'#e11d48','Multi-Organ Risk':'#dc2626','Critical Deterioration':'#991b1b' }[c] || '#6366f1';
}

export default function AIInsightsPage() {
    const [prediction, setPrediction] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            try { 
                const res = await predictionAPI.current(); 
                setPrediction(res.data); 
            }
            catch(e) {
                console.error(e);
            } finally { 
                setLoading(false); 
            }
        };
        fetch();
    }, []);

    const vgi = prediction?.vgi ?? 0;
    const category = prediction?.risk_category ?? 'Stable';
    const color = getRiskColor(category);

    const riskData = {
        labels: ['Risk Score', 'Safe Margin'],
        datasets: [{
            data: [vgi, 100 - vgi],
            backgroundColor: [color, 'rgba(99,102,241,0.06)'],
            borderWidth: 0, cutout: '78%',
        }],
    };

    const timelineData = prediction?.timeline ? {
        labels: prediction.timeline.map(t => t.hours === 0 ? 'Now' : `+${t.hours}h`),
        datasets: [{
            label: 'Predicted VGI Risk',
            data: prediction.timeline.map(t => t.risk),
            borderColor: color,
            backgroundColor: `${color}15`,
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: color,
            borderWidth: 2,
        }],
    } : null;

    const chartOpts = {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            x: { grid: { color: 'rgba(99,102,241,0.06)' }, ticks: { color: '#64748b', font: { size: 10 } } },
            y: { min: 0, max: 100, grid: { color: 'rgba(99,102,241,0.06)' }, ticks: { color: '#64748b', font: { size: 10 }, callback: v=>`${v}%` } },
        },
    };

    return (
        <div className="flex min-h-screen transition-colors duration-300" style={{ background: 'var(--bg-primary)' }}>
            <Sidebar />

            <main className="ml-64 flex-1 p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center logo-glow"
                                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                            </div>
                            Predictive Clinical AI Insights
                        </h1>
                        <p className="text-slate-400 text-xs mt-1">Multi-factor physiological pattern matching & clinical risk explanation</p>
                    </div>
                    <span className="px-3 py-1.5 rounded-full text-xs font-bold text-white flex items-center gap-2"
                        style={{ backgroundColor: color, boxShadow: `0 0 15px ${color}40` }}>
                        <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                        {category}
                    </span>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20 text-slate-500">
                        <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mr-3"></div>
                        Generating AI diagnostic insights...
                    </div>
                ) : (
                    <>
                        {/* Top Grid */}
                        <div className="grid grid-cols-3 gap-6 mb-6">
                            {/* Score Card */}
                            <div className="glass-card p-6 flex flex-col items-center justify-center text-center animate-slide-up">
                                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2">VitalGuard Index</p>
                                <div className="relative w-40 h-40 my-2">
                                    <Doughnut data={riskData} options={{ cutout: '78%', plugins: { tooltip: { enabled: false }, legend: { display: false } } }} />
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-3xl font-black text-white">{vgi}%</span>
                                        <span className="text-[10px] text-slate-400 font-medium">Risk Score</span>
                                    </div>
                                </div>
                                <span className="px-3 py-1 rounded-full text-xs font-bold text-white mt-1" style={{ backgroundColor: color }}>
                                    {category}
                                </span>
                            </div>

                            {/* Deterioration Forecast */}
                            <div className="glass-card p-6 flex flex-col justify-between animate-slide-up" style={{ animationDelay: '0.05s' }}>
                                <div>
                                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2">Deterioration Window</p>
                                    <div className="mt-4">
                                        <span className="text-4xl font-black" style={{ color }}>
                                            {prediction?.estimated_hours_to_deterioration ? `${prediction.estimated_hours_to_deterioration}h` : 'N/A'}
                                        </span>
                                        <p className="text-xs text-slate-400 mt-2">
                                            {prediction?.estimated_hours_to_deterioration 
                                                ? 'Estimated clinical lead time before acute collapse without intervention.'
                                                : 'Patient currently stable. No deterioration window triggered.'}
                                        </p>
                                    </div>
                                </div>
                                <div className="p-3 rounded-xl mt-4" style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.1)' }}>
                                    <p className="text-[11px] text-slate-300 font-medium flex items-center gap-2">
                                        <span>🩺</span> Evidence-Based Physiological Classification
                                    </p>
                                </div>
                            </div>

                            {/* Clinical Factors */}
                            <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-3">Key Contributing Factors</p>
                                <div className="space-y-3">
                                    {(prediction?.explanation || []).slice(0, 4).map((f, i) => {
                                        const bColor = f.impact === 'high' ? '#ef4444' : f.impact === 'medium' ? '#f59e0b' : '#10b981';
                                        return (
                                            <div key={i} className="flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: bColor }}></div>
                                                    <span className="text-slate-300">{f.factor}</span>
                                                </div>
                                                <span className="font-bold text-white">{f.value}</span>
                                            </div>
                                        );
                                    })}
                                    {(!prediction?.explanation || prediction.explanation.length === 0) && (
                                        <p className="text-xs text-slate-500 py-4 text-center">No abnormal factors logged</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Risk Projection Timeline */}
                        {timelineData && (
                            <div className="glass-card p-6 mb-6 animate-slide-up">
                                <h3 className="text-sm font-bold text-white mb-4">12-Hour Risk Projection Timeline</h3>
                                <div className="h-64"><Line data={timelineData} options={chartOpts} /></div>
                            </div>
                        )}

                        {/* Baseline Averages */}
                        {prediction?.baseline && Object.keys(prediction.baseline).length > 0 && (
                            <div className="glass-card p-6 animate-slide-up">
                                <h3 className="text-sm font-bold text-white mb-4">Patient Baseline Averages</h3>
                                <div className="grid grid-cols-6 gap-3">
                                    {Object.entries(prediction.baseline).map(([k, v]) => {
                                        const labels = { heart_rate:'Heart Rate', spo2:'SpO₂', temperature:'Temp', respiratory_rate:'Resp Rate', systolic_bp:'Systolic BP', diastolic_bp:'Diastolic BP' };
                                        const units = { heart_rate:'bpm', spo2:'%', temperature:'°C', respiratory_rate:'/min', systolic_bp:'mmHg', diastolic_bp:'mmHg' };
                                        return (
                                            <div key={k} className="rounded-xl p-3 text-center" style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.08)' }}>
                                                <p className="text-[10px] text-slate-500 uppercase">{labels[k]}</p>
                                                <p className="text-xl font-bold text-white mt-1">{typeof v === 'number' ? v.toFixed(1) : v}</p>
                                                <p className="text-[10px] text-slate-600">{units[k]}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
