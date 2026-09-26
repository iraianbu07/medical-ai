import { useState, useEffect, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement,
    LineElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import Sidebar from '../components/Sidebar';
import { reportAPI } from '../api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const SCENARIO_META = {
    sepsis_alert:        { color: '#f59e0b', icon: '🦠', badge: 'High Risk' },
    hemodynamic_shock:   { color: '#ef4444', icon: '💔', badge: 'Critical' },
    respiratory_failure: { color: '#f97316', icon: '🫁', badge: 'Critical' },
    cardiac_risk:        { color: '#ec4899', icon: '❤️', badge: 'High Risk' },
    hypertensive_crisis: { color: '#a855f7', icon: '🔺', badge: 'Urgent' },
    stable_monitoring:   { color: '#10b981', icon: '✅', badge: 'Stable' },
};

function getRiskColor(vgi) {
    if (vgi >= 80) return '#ef4444';
    if (vgi >= 60) return '#f97316';
    if (vgi >= 40) return '#f59e0b';
    return '#10b981';
}

export default function ReportSimulationPage() {
    const [scenarios, setScenarios] = useState([]);
    const [selected, setSelected] = useState(null);
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingScenarios, setLoadingScenarios] = useState(true);
    const [error, setError] = useState(null);
    const reportRef = useRef(null);

    useEffect(() => {
        reportAPI.scenarios()
            .then(r => setScenarios(r.data))
            .catch(() => setError('Could not load scenarios. Is the backend running?'))
            .finally(() => setLoadingScenarios(false));
    }, []);

    const runSimulation = async (scenarioId) => {
        setSelected(scenarioId);
        setLoading(true);
        setReport(null);
        setError(null);
        try {
            const r = await reportAPI.simulate(scenarioId);
            setReport(r.data);
        } catch (e) {
            setError('Simulation failed. Please check backend connection.');
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => window.print();

    const vgi = report?.prediction?.vgi ?? 0;
    const riskColor = getRiskColor(vgi);
    const meta = selected ? (SCENARIO_META[selected] || {}) : {};

    const timelineData = report?.prediction?.timeline ? {
        labels: report.prediction.timeline.map(t => t.hours === 0 ? 'Now' : `+${t.hours}h`),
        datasets: [{
            label: 'Risk Trajectory',
            data: report.prediction.timeline.map(t => t.risk),
            borderColor: riskColor,
            backgroundColor: `${riskColor}18`,
            fill: true, tension: 0.4, pointRadius: 4, borderWidth: 2,
            pointBackgroundColor: riskColor,
        }],
    } : null;

    const chartOpts = {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(15,22,41,0.95)', titleColor: '#e2e8f0', bodyColor: '#94a3b8', cornerRadius: 10, padding: 10 } },
        scales: {
            x: { grid: { color: 'rgba(99,102,241,0.06)' }, ticks: { color: '#4b5563', font: { size: 10 } }, border: { display: false } },
            y: { min: 0, max: 100, grid: { color: 'rgba(99,102,241,0.06)' }, ticks: { color: '#4b5563', font: { size: 10 }, callback: v => `${v}%`, stepSize: 25 }, border: { display: false } },
        },
    };

    const vitalLabels = {
        heart_rate: { label: 'Heart Rate', unit: 'bpm', icon: '❤️' },
        spo2: { label: 'SpO₂', unit: '%', icon: '🫁' },
        temperature: { label: 'Temperature', unit: '°C', icon: '🌡️' },
        respiratory_rate: { label: 'Resp Rate', unit: '/min', icon: '💨' },
        systolic_bp: { label: 'Systolic BP', unit: 'mmHg', icon: '🔴' },
        diastolic_bp: { label: 'Diastolic BP', unit: 'mmHg', icon: '🔵' },
    };

    return (
        <div className="flex min-h-screen transition-colors duration-300" style={{ background: 'var(--bg-primary)' }}>
            <div className="bg-mesh"></div>
            <Sidebar />

            <main className="ml-64 flex-1 p-6 relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-6 animate-fade-in">
                    <div>
                        <h1 className="text-xl font-black text-white flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)' }}>
                                <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            </div>
                            Report Simulation
                        </h1>
                        <p className="text-xs text-slate-500 mt-1">Select a clinical scenario to generate a full AI-powered patient report</p>
                    </div>
                    {report && (
                        <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white no-print" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 0 20px rgba(99,102,241,0.3)' }}>
                            🖨️ Print / Save PDF
                        </button>
                    )}
                </div>

                {/* Scenario Picker */}
                {loadingScenarios ? (
                    <div className="flex items-center justify-center h-32"><div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin"></div></div>
                ) : error && !report ? (
                    <div className="glass-card p-6 text-center"><p className="text-red-400 font-medium">{error}</p></div>
                ) : (
                    <div className="grid grid-cols-3 gap-4 mb-6 no-print">
                        {scenarios.map(s => {
                            const m = SCENARIO_META[s.id] || { color: '#6366f1', icon: '📋', badge: '' };
                            const isActive = selected === s.id;
                            return (
                                <button key={s.id} id={`scenario-${s.id}`} onClick={() => runSimulation(s.id)}
                                    className="glass-card p-4 text-left transition-all duration-300 hover:scale-[1.02]"
                                    style={{ borderColor: isActive ? m.color : 'rgba(99,102,241,0.1)', boxShadow: isActive ? `0 0 20px ${m.color}25` : 'none' }}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-2xl">{m.icon}</span>
                                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${m.color}20`, color: m.color, border: `1px solid ${m.color}40` }}>{m.badge}</span>
                                    </div>
                                    <p className="text-sm font-bold text-white mb-1">{s.label}</p>
                                    <p className="text-[10px] text-slate-500 leading-relaxed">{s.description}</p>
                                    <div className="mt-3 flex items-center gap-2">
                                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(99,102,241,0.08)' }}>
                                            <div className="h-full rounded-full" style={{ width: `${s.vgi}%`, background: m.color }}></div>
                                        </div>
                                        <span className="text-[10px] font-bold" style={{ color: m.color }}>VGI {s.vgi}</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Loading spinner */}
                {loading && (
                    <div className="flex flex-col items-center justify-center h-48 gap-3">
                        <div className="w-10 h-10 border-2 border-violet-500/20 border-t-violet-500 rounded-full animate-spin"></div>
                        <p className="text-xs text-slate-500">Generating simulation report…</p>
                    </div>
                )}

                {/* Simulation Report */}
                {report && !loading && (
                    <div ref={reportRef} className="space-y-5 animate-fade-in printable-report">
                        {/* Report Header */}
                        <div className="glass-card p-5" style={{ borderColor: `${riskColor}30`, boxShadow: `0 0 25px ${riskColor}12` }}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className="text-3xl">{meta.icon}</span>
                                        <div>
                                            <h2 className="text-lg font-black text-white">{report.label}</h2>
                                            <p className="text-xs text-slate-400">{report.description}</p>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-slate-600 mt-2">Generated: {new Date(report.generated_at).toLocaleString('en-IN')}</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-5xl font-black mb-1" style={{ color: riskColor, textShadow: `0 0 30px ${riskColor}40` }}>{vgi.toFixed(1)}</div>
                                    <div className="text-xs text-slate-500">/ 100 VGI</div>
                                    <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold text-white" style={{ backgroundColor: riskColor }}>{report.prediction.risk_category}</span>
                                    {report.prediction.alert && <div className="mt-2 text-[10px] font-bold text-red-400 animate-pulse">⚠️ ALERT ACTIVE</div>}
                                </div>
                            </div>
                        </div>

                        {/* Two-column: Patient + Vitals */}
                        <div className="grid grid-cols-2 gap-5">
                            {/* Patient Info */}
                            <div className="glass-card p-5">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Simulated Patient Profile</h3>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold">
                                        {(report.patient.name || 'P')[0]}
                                    </div>
                                    <div>
                                        <p className="text-base font-bold text-white">{report.patient.name}</p>
                                        <p className="text-[10px] text-slate-500">ID: {report.patient.patient_id}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-[11px]">
                                    {[
                                        ['Age', report.patient.age],
                                        ['Gender', report.patient.gender],
                                        ['Risk Level', report.patient.risk_level],
                                        ['Conditions', report.patient.conditions],
                                    ].map(([k, v]) => (
                                        <div key={k}>
                                            <p className="text-slate-600 font-bold uppercase text-[9px]">{k}</p>
                                            <p className="text-slate-200 font-semibold">{v || 'N/A'}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 p-3 rounded-xl" style={{ background: `${riskColor}10`, border: `1px solid ${riskColor}25` }}>
                                    <p className="text-[10px] font-bold text-slate-400 mb-1">AI Clinical Reasoning</p>
                                    <p className="text-xs text-slate-300 leading-relaxed italic">"{report.prediction.clinical_reasoning}"</p>
                                </div>
                            </div>

                            {/* Vitals Grid */}
                            <div className="glass-card p-5">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Simulated Vital Signs</h3>
                                <div className="grid grid-cols-3 gap-3">
                                    {Object.entries(report.prediction.current_vitals || {}).map(([k, v]) => {
                                        const meta = vitalLabels[k] || { label: k, unit: '', icon: '📊' };
                                        return (
                                            <div key={k} className="p-3 rounded-xl text-center" style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.08)' }}>
                                                <p className="text-base mb-1">{meta.icon}</p>
                                                <p className="text-lg font-black text-white">{v}</p>
                                                <p className="text-[9px] text-slate-600">{meta.unit}</p>
                                                <p className="text-[9px] text-slate-500 mt-0.5">{meta.label}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                                {report.prediction.estimated_hours_to_deterioration && (
                                    <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: `${riskColor}10`, border: `1px solid ${riskColor}25` }}>
                                        <span className="text-lg">⏱️</span>
                                        <div>
                                            <p className="text-[10px] text-slate-500">Estimated time to deterioration</p>
                                            <p className="text-sm font-bold" style={{ color: riskColor }}>{report.prediction.estimated_hours_to_deterioration} hours</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Chart + Recommendations */}
                        <div className="grid grid-cols-2 gap-5">
                            {/* Timeline Chart */}
                            <div className="glass-card p-5">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">12-Hour Risk Trajectory</h3>
                                <div className="h-48">
                                    {timelineData ? <Line data={timelineData} options={chartOpts} /> : <p className="text-center text-slate-500 mt-16 text-xs">No timeline data</p>}
                                </div>
                            </div>

                            {/* Recommendations */}
                            <div className="glass-card p-5">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">AI Clinical Recommendations</h3>
                                <div className="space-y-3">
                                    {(report.recommendations || []).map((r, i) => (
                                        <div key={i} className="flex items-start gap-3 p-2 rounded-lg" style={{ background: `${r.color}08` }}>
                                            <span className="px-2 py-0.5 rounded text-[9px] font-black flex-shrink-0 mt-0.5" style={{ backgroundColor: `${r.color}20`, color: r.color, border: `1px solid ${r.color}35` }}>{r.priority}</span>
                                            <div>
                                                <p className="text-xs font-bold text-slate-200">{r.text}</p>
                                                <p className="text-[10px] text-slate-500">{r.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* AI Explanation Factors */}
                        <div className="glass-card p-5">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">AI Prediction Factors</h3>
                            <div className="grid grid-cols-2 gap-4">
                                {(report.prediction.explanation || []).map((f, i) => {
                                    const bColor = f.impact === 'high' ? '#ef4444' : f.impact === 'medium' ? '#f59e0b' : '#10b981';
                                    const pct = f.impact === 'high' ? 85 : f.impact === 'medium' ? 55 : 30;
                                    return (
                                        <div key={i}>
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1 h-4 rounded-full" style={{ backgroundColor: bColor }}></div>
                                                    <span className="text-xs text-slate-300">{f.factor}</span>
                                                </div>
                                                <span className="text-xs font-bold text-white">{f.value}</span>
                                            </div>
                                            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(99,102,241,0.08)' }}>
                                                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: bColor, boxShadow: `0 0 6px ${bColor}40` }}></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Footer disclaimer */}
                        <div className="glass-card p-4 text-center">
                            <p className="text-[10px] text-slate-600">⚠️ This is a <strong className="text-slate-500">simulated report</strong> generated by VITAL-GUARD AI for training and demonstration purposes only. Not for clinical use.</p>
                        </div>
                    </div>
                )}
            </main>

            {/* Print CSS */}
            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    .printable-report, .printable-report * { visibility: visible; }
                    .printable-report { position: absolute; left: 0; top: 0; width: 100%; background: white; color: black; }
                    .no-print { display: none !important; }
                    .glass-card { border: 1px solid #e2e8f0 !important; background: white !important; box-shadow: none !important; }
                    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                }
            `}</style>
        </div>
    );
}
