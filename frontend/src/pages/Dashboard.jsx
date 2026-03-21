import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../AuthContext';
import { vitalsAPI, predictionAPI } from '../api';
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

// ── Helpers ─────────────────────────────────────────────
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

function getRiskBg(category) {
    const map = {
        'Stable': 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/20',
        'Mild Abnormality': 'from-blue-400/10 to-blue-400/5 border-blue-400/20',
        'Sepsis / SIRS': 'from-amber-500/10 to-amber-500/5 border-amber-500/20',
        'Cardiac Risk': 'from-orange-500/10 to-orange-500/5 border-orange-500/20',
        'Respiratory Failure': 'from-red-500/10 to-red-500/5 border-red-500/20',
        'Hypertensive Crisis': 'from-purple-500/10 to-purple-500/5 border-purple-500/20',
        'Hemodynamic Shock': 'from-rose-600/10 to-rose-600/5 border-rose-600/20',
        'Multi-Organ Risk': 'from-red-600/10 to-red-600/5 border-red-600/20',
        'Critical Deterioration': 'from-red-900/10 to-red-900/5 border-red-900/20',
    };
    return map[category] || 'from-indigo-500/10 to-indigo-500/5 border-indigo-500/20';
}

function getImpactColor(impact) {
    if (impact === 'high') return 'bg-red-500/10 text-red-400 border-red-500/20';
    if (impact === 'medium') return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
}

// ── Dashboard ───────────────────────────────────────────
export default function Dashboard() {
    const { patientId } = useAuth();
    const [prediction, setPrediction] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showAlert, setShowAlert] = useState(false);
    const [vitals, setVitals] = useState({
        heart_rate: '',
        spo2: '',
        temperature: '',
        respiratory_rate: '',
        systolic_bp: '',
        diastolic_bp: '',
    });

    const fetchPrediction = useCallback(async () => {
        try {
            const res = await predictionAPI.current();
            setPrediction(res.data);
            setShowAlert(res.data.alert);
        } catch (err) {
            console.error('Failed to fetch prediction:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPrediction();
    }, [fetchPrediction]);

    const handleInputChange = (field, value) => {
        setVitals(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmitVitals = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const payload = {
                heart_rate: parseFloat(vitals.heart_rate),
                spo2: parseFloat(vitals.spo2),
                temperature: parseFloat(vitals.temperature),
                respiratory_rate: parseFloat(vitals.respiratory_rate),
                systolic_bp: parseFloat(vitals.systolic_bp),
                diastolic_bp: parseFloat(vitals.diastolic_bp),
            };
            const res = await vitalsAPI.add(payload);
            setPrediction(res.data.prediction);
            setShowAlert(res.data.prediction.alert);
            setVitals({ heart_rate: '', spo2: '', temperature: '', respiratory_rate: '', systolic_bp: '', diastolic_bp: '' });
        } catch (err) {
            console.error('Failed to submit vitals:', err);
        } finally {
            setSubmitting(false);
        }
    };

    // Timeline chart data
    const timelineData = prediction?.timeline ? {
        labels: prediction.timeline.map(t => t.hours === 0 ? 'Now' : `+${t.hours}h`),
        datasets: [{
            label: 'Projected Risk',
            data: prediction.timeline.map(t => t.risk),
            borderColor: getRiskColor(prediction.risk_category),
            backgroundColor: `${getRiskColor(prediction.risk_category)}20`,
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 6,
            borderWidth: 2,
        }],
    } : null;

    const timelineOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#1e293b',
                titleColor: '#e2e8f0',
                bodyColor: '#e2e8f0',
                borderColor: '#334155',
                borderWidth: 1,
                cornerRadius: 8,
                padding: 12,
                displayColors: false,
                callbacks: {
                    label: (ctx) => `Risk: ${ctx.parsed.y.toFixed(1)}%`,
                },
            },
        },
        scales: {
            x: {
                grid: { color: '#e2e8f010' },
                ticks: { color: '#94a3b8', font: { size: 11 } },
            },
            y: {
                min: 0,
                max: 100,
                grid: { color: '#e2e8f010' },
                ticks: { color: '#94a3b8', font: { size: 11 }, callback: (v) => `${v}%` },
            },
        },
    };

    const vgi = prediction?.vgi ?? 0;
    const category = prediction?.risk_category ?? 'Stable';
    const hours = prediction?.estimated_hours_to_deterioration;

    return (
        <div className="flex min-h-screen bg-bgMain">
            <Sidebar />

            <main className="ml-64 flex-1 p-8">
                {/* Alert Banner */}
                {showAlert && prediction?.alert_message && (
                    <div className="mb-6 animate-slide-up">
                        <div className="bg-gradient-to-r from-red-600 to-red-500 rounded-2xl p-4 flex items-center gap-4 shadow-lg shadow-red-500/20 critical-pulse">
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <p className="text-white font-bold text-sm">⚠️ CRITICAL ALERT</p>
                                <p className="text-red-100 text-sm mt-0.5">{prediction.alert_message}</p>
                            </div>
                            <button onClick={() => setShowAlert(false)} className="text-white/70 hover:text-white transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className="mb-8 animate-fade-in">
                    <h1 className="text-2xl font-bold text-slate-800">Patient Dashboard</h1>
                    <p className="text-slate-500 mt-1">Real-time clinical deterioration monitoring for <span className="font-semibold text-indigo-600">{patientId}</span></p>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* ── Left Column: VGI + Risk Info ── */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* VGI Card */}
                            <div className={`bg-gradient-to-br ${getRiskBg(category)} border rounded-2xl p-6 animate-scale-in`}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-slate-500 mb-1">VitalGuard Index</p>
                                        <div className="flex items-end gap-3">
                                            <span className="text-5xl font-black" style={{ color: getRiskColor(category) }}>{vgi}</span>
                                            <span className="text-lg text-slate-400 mb-2">/100</span>
                                        </div>
                                        <div className="mt-3 flex items-center gap-3">
                                            <span className="px-3 py-1 rounded-full text-xs font-bold text-white" style={{ backgroundColor: getRiskColor(category) }}>
                                                {category}
                                            </span>
                                            {hours && (
                                                <span className="text-sm text-slate-500">
                                                    Est. deterioration in <span className="font-bold text-slate-700">{hours}h</span>
                                                </span>
                                            )}
                                        </div>
                                        {prediction?.clinical_reasoning && (
                                            <p className="mt-2 text-xs text-slate-500 italic leading-relaxed">
                                                🩺 {prediction.clinical_reasoning}
                                            </p>
                                        )}
                                    </div>
                                    {/* VGI Gauge */}
                                    <div className="relative w-28 h-28">
                                        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                                            <circle cx="60" cy="60" r="50" fill="none" stroke="#e2e8f0" strokeWidth="10" />
                                            <circle
                                                cx="60" cy="60" r="50" fill="none"
                                                stroke={getRiskColor(category)}
                                                strokeWidth="10"
                                                strokeDasharray={`${(vgi / 100) * 314} 314`}
                                                strokeLinecap="round"
                                                className="transition-all duration-1000"
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-xl font-bold text-slate-700">{vgi}%</span>
                                        </div>
                                    </div>
                                </div>
                                {/* Progress bar */}
                                <div className="mt-4 h-2 bg-slate-200 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${vgi}%`, backgroundColor: getRiskColor(category) }}></div>
                                </div>
                            </div>

                            {/* Risk Timeline Forecast */}
                            {timelineData && (
                                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-card animate-slide-up">
                                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                        <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                        </svg>
                                        Risk Timeline Forecast
                                    </h3>
                                    <div className="h-56">
                                        <Line data={timelineData} options={timelineOptions} />
                                    </div>
                                </div>
                            )}

                            {/* AI Explanation Panel */}
                            {prediction?.explanation && prediction.explanation.length > 0 && (
                                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-card animate-slide-up">
                                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                        <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                        </svg>
                                        AI Prediction Explanation
                                    </h3>
                                    <div className="space-y-3">
                                        {prediction.explanation.map((factor, i) => (
                                            <div key={i} className="flex items-center justify-between bg-slate-50 rounded-xl p-3 hover:bg-slate-100 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2 h-8 rounded-full ${factor.impact === 'high' ? 'bg-red-500' : factor.impact === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-slate-700">{factor.factor}</p>
                                                        {factor.baseline && (
                                                            <p className="text-xs text-slate-400">Baseline: {factor.baseline} | Deviation: {factor.deviation > 0 ? '+' : ''}{factor.deviation}</p>
                                                        )}
                                                        {factor.clinical_note && (
                                                            <p className="text-xs text-slate-400 mt-0.5 italic">{factor.clinical_note}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-bold text-slate-700">{factor.value}</p>
                                                    <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-semibold rounded-full border ${getImpactColor(factor.impact)}`}>
                                                        {factor.impact}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Baseline Comparison */}
                            {prediction?.baseline && Object.keys(prediction.baseline).length > 0 && (
                                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-card animate-slide-up">
                                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                        Patient Baseline Analysis
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {Object.entries(prediction.baseline).map(([key, val]) => {
                                            const labels = { heart_rate: 'Heart Rate', spo2: 'SpO₂', temperature: 'Temp', respiratory_rate: 'Resp Rate', systolic_bp: 'Systolic BP', diastolic_bp: 'Diastolic BP' };
                                            const units = { heart_rate: 'bpm', spo2: '%', temperature: '°C', respiratory_rate: '/min', systolic_bp: 'mmHg', diastolic_bp: 'mmHg' };
                                            return (
                                                <div key={key} className="bg-slate-50 rounded-xl p-3 text-center">
                                                    <p className="text-xs text-slate-400 mb-1">{labels[key] || key}</p>
                                                    <p className="text-lg font-bold text-slate-700">{val}</p>
                                                    <p className="text-xs text-slate-400">{units[key] || ''}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ── Right Column: Vital Input Form ── */}
                        <div className="space-y-6">
                            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-card animate-scale-in">
                                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Submit Vitals
                                </h3>

                                <form onSubmit={handleSubmitVitals} className="space-y-4">
                                    {[
                                        { key: 'heart_rate', label: 'Heart Rate', unit: 'bpm', icon: '❤️', placeholder: '72' },
                                        { key: 'spo2', label: 'SpO₂', unit: '%', icon: '🫁', placeholder: '98' },
                                        { key: 'temperature', label: 'Temperature', unit: '°C', icon: '🌡️', placeholder: '37.0' },
                                        { key: 'respiratory_rate', label: 'Respiratory Rate', unit: '/min', icon: '💨', placeholder: '16' },
                                        { key: 'systolic_bp', label: 'Systolic BP', unit: 'mmHg', icon: '🔴', placeholder: '120' },
                                        { key: 'diastolic_bp', label: 'Diastolic BP', unit: 'mmHg', icon: '🔵', placeholder: '80' },
                                    ].map((field) => (
                                        <div key={field.key}>
                                            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                                                {field.icon} {field.label} <span className="text-slate-300">({field.unit})</span>
                                            </label>
                                            <input
                                                id={`input-${field.key}`}
                                                type="number"
                                                step="0.1"
                                                value={vitals[field.key]}
                                                onChange={(e) => handleInputChange(field.key, e.target.value)}
                                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 transition-all hover:border-indigo-300 focus:border-indigo-500"
                                                placeholder={field.placeholder}
                                                required
                                            />
                                        </div>
                                    ))}

                                    <button
                                        id="submit-vitals-button"
                                        type="submit"
                                        disabled={submitting}
                                        className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl transition-all duration-200 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 disabled:opacity-50 transform hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                        {submitting ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                </svg>
                                                Analyzing...
                                            </span>
                                        ) : '🔬 Submit & Analyze'}
                                    </button>
                                </form>
                            </div>

                            {/* Quick Stats */}
                            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-card">
                                <h3 className="text-sm font-bold text-slate-800 mb-3">Clinical Categories</h3>
                                <p className="text-xs text-slate-400 mb-3">Classified by vital sign patterns, not score ranges</p>
                                <div className="space-y-2">
                                    {[
                                        { label: 'Stable', desc: 'All normals', color: '#10b981' },
                                        { label: 'Mild Abnormality', desc: 'Minor deviation', color: '#60a5fa' },
                                        { label: 'Sepsis / SIRS', desc: 'Fever + HR/RR', color: '#f59e0b' },
                                        { label: 'Cardiac Risk', desc: 'HR + BP instability', color: '#f97316' },
                                        { label: 'Respiratory', desc: 'Low SpO₂ / high RR', color: '#ef4444' },
                                        { label: 'Hypertensive', desc: 'BP >180/120', color: '#a855f7' },
                                        { label: 'Shock', desc: 'Circulatory collapse', color: '#e11d48' },
                                        { label: 'Multi-Organ', desc: '3+ systems affected', color: '#dc2626' },
                                        { label: 'Critical', desc: 'Imminent collapse', color: '#991b1b' },
                                    ].map((item) => (
                                        <div key={item.label} className="flex items-center gap-2 text-xs">
                                            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }}></div>
                                            <span className="text-slate-600 flex-1">{item.label}</span>
                                            <span className="text-slate-400 text-[10px]">{item.desc}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
