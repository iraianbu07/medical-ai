import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { vitalsAPI, predictionAPI, patientsAPI, devicesAPI, eventsAPI } from '../api';
import Sidebar from '../components/Sidebar';
import ReportModal from '../components/ReportModal';
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
    Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

function getRiskColor(c) {
    return { 'Stable':'#10b981','Mild Abnormality':'#60a5fa','Sepsis / SIRS':'#f59e0b','Cardiac Risk':'#f97316','Respiratory Failure':'#ef4444','Hypertensive Crisis':'#a855f7','Hemodynamic Shock':'#e11d48','Multi-Organ Risk':'#dc2626','Critical Deterioration':'#991b1b' }[c] || '#6366f1';
}

function getVitalStatus(key, val) {
    const ranges = { heart_rate:[60,100], spo2:[95,100], temperature:[36.1,37.2], respiratory_rate:[12,20], systolic_bp:[90,140], diastolic_bp:[60,90] };
    const [lo,hi] = ranges[key] || [0,999];
    if (val >= lo && val <= hi) return 'Normal';
    if (key === 'spo2' && val < 90) return 'Critical';
    if (key === 'heart_rate' && (val > 130 || val < 45)) return 'Critical';
    return 'Abnormal';
}
function getStatusColor(s) {
    return s === 'Normal' ? '#10b981' : s === 'Critical' ? '#ef4444' : '#f59e0b';
}

function AnimatedNumber({ value, duration = 1000 }) {
    const [display, setDisplay] = useState(0);
    const ref = useRef(null);
    useEffect(() => {
        const start = display; const end = typeof value === 'number' ? value : parseFloat(value) || 0;
        const startTime = performance.now();
        const animate = (t) => { const p = Math.min((t-startTime)/duration,1); const e = 1-Math.pow(1-p,3); setDisplay(Math.round((start+(end-start)*e)*10)/10); if(p<1) ref.current = requestAnimationFrame(animate); };
        ref.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(ref.current);
    }, [value]);
    return <span>{Number.isInteger(display) ? display : display.toFixed(1)}</span>;
}

// 3D Anatomical Twin Preview Widget
function HumanBodyTwinWidget({ category, onOpenTwin }) {
    const color = getRiskColor(category);
    return (
        <div
            onClick={onOpenTwin}
            className="relative w-36 flex flex-col items-center justify-center cursor-pointer group select-none"
            title="Click to Launch Full 3D Holographic Twin Command Center"
        >
            <div className="relative w-32 h-60 rounded-2xl overflow-hidden border border-cyan-500/30 bg-[#070d1a] shadow-[0_0_20px_rgba(6,182,212,0.25)] group-hover:border-cyan-400 group-hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all duration-300">
                <img
                    src="/anatomy_twin.jpg"
                    alt="3D Holographic Twin"
                    className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                />
                {/* Holographic overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#070d1a] via-transparent to-cyan-500/10 pointer-events-none"></div>

                {/* Pulsing organ markers */}
                <div className="absolute top-[12%] left-[48%] w-2 h-2 rounded-full bg-red-500 animate-ping"></div>
                <div className="absolute top-[28%] left-[50%] w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse border border-white"></div>
                <div className="absolute top-[42%] left-[48%] w-2 h-2 rounded-full bg-red-400 animate-ping"></div>

                {/* Bottom badge */}
                <div className="absolute bottom-2 inset-x-2 py-1 px-1.5 rounded-lg bg-[#0b1324]/90 backdrop-blur-md border border-cyan-400/40 text-[9px] font-bold text-center text-cyan-300 tracking-wider shadow-lg flex items-center justify-center gap-1 group-hover:bg-cyan-500 group-hover:text-slate-950 transition-colors">
                    <span>3D TWIN</span>
                    <span>↗</span>
                </div>
            </div>
            <span className="text-[10px] font-semibold text-cyan-400/80 mt-1.5 group-hover:text-cyan-300 transition-colors">
                Interactive Twin Active
            </span>
        </div>
    );
}
import { useState, useEffect, useCallback, useRef } from 'react';

// 12 diverse clinical physiological baselines for non-repeating vital simulation
const CLINICAL_PROFILES = [
    { name: "ICU Stable Baseline", desc: "Balanced hemodynamics & clear lungs", hr: 72, spo2: 98.4, temp: 36.8, rr: 15, sbp: 118, dbp: 78, type: 'stable' },
    { name: "Post-Operative Recovery", desc: "Mild metabolic reaction post-procedure", hr: 83, spo2: 97.5, temp: 37.1, rr: 17, sbp: 125, dbp: 82, type: 'stable' },
    { name: "Mild Tachycardia Warning", desc: "Elevated pulse, intact oxygenation", hr: 107, spo2: 96.8, temp: 37.3, rr: 19, sbp: 134, dbp: 86, type: 'stable' },
    { name: "Early Sepsis / Febrile SIRS", desc: "Fever, tachycardia and elevated respirations", hr: 115, spo2: 93.6, temp: 38.7, rr: 25, sbp: 104, dbp: 62, type: 'sepsis' },
    { name: "Septic Shock Cascade", desc: "Severe systemic infection with blood pressure drop", hr: 130, spo2: 91.2, temp: 39.3, rr: 28, sbp: 82, dbp: 50, type: 'sepsis' },
    { name: "Hypoxic Respiratory Distress", desc: "Severe desaturation & tachypnea", hr: 118, spo2: 87.5, temp: 37.2, rr: 32, sbp: 138, dbp: 88, type: 'hypoxia' },
    { name: "Acute Hypoxia Collapse", desc: "Critical SpO2 drop below 85%", hr: 126, spo2: 83.5, temp: 37.0, rr: 34, sbp: 142, dbp: 92, type: 'hypoxia' },
    { name: "Hemodynamic Shock Crash", desc: "Profound hypotension with compensatory tachycardia", hr: 136, spo2: 89.0, temp: 35.8, rr: 30, sbp: 72, dbp: 44, type: 'shock' },
    { name: "Cardiogenic Hypoperfusion", desc: "Failing circulatory pressure", hr: 124, spo2: 90.4, temp: 36.2, rr: 28, sbp: 76, dbp: 48, type: 'shock' },
    { name: "Hypertensive Urgency", desc: "Severe blood pressure elevation", hr: 88, spo2: 97.8, temp: 36.9, rr: 16, sbp: 194, dbp: 118, type: 'other' },
    { name: "Sinus Bradycardia", desc: "Low resting pulse rate", hr: 46, spo2: 99.2, temp: 36.4, rr: 12, sbp: 112, dbp: 72, type: 'other' },
    { name: "Critical Multi-System Deterioration", desc: "Multi-organ failure physiological pattern", hr: 144, spo2: 81.0, temp: 35.4, rr: 38, sbp: 66, dbp: 38, type: 'shock' }
];

export default function Dashboard() {
    const { patientId } = useAuth();
    const navigate = useNavigate();
    const [prediction, setPrediction] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showAlert, setShowAlert] = useState(false);
    const [profile, setProfile] = useState(null);
    const [devices, setDevices] = useState([]);
    const [events, setEvents] = useState([]);
    const [isReportOpen, setIsReportOpen] = useState(false);
    const [vitals, setVitals] = useState({ heart_rate:'', spo2:'', temperature:'', respiratory_rate:'', systolic_bp:'', diastolic_bp:'' });

    // Non-repeating vital simulation state
    const [autoFillIndex, setAutoFillIndex] = useState(0);
    const [autoFillInfo, setAutoFillInfo] = useState(null);
    const usedSignaturesRef = useRef(new Set());

    const generateUniqueVitals = (targetType = null) => {
        let pool = CLINICAL_PROFILES;
        if (targetType) {
            const filtered = CLINICAL_PROFILES.filter(p => p.type === targetType);
            if (filtered.length > 0) pool = filtered;
        }

        const base = pool[autoFillIndex % pool.length];
        setAutoFillIndex(prev => prev + 1);

        // Inject randomized clinically sound micro-jitters to guarantee zero repetition
        let candidate = null;
        for (let attempt = 0; attempt < 20; attempt++) {
            const hrOffset = (Math.random() * 4.6 - 2.3);
            const spo2Offset = (Math.random() * 1.6 - 0.8);
            const tempOffset = (Math.random() * 0.4 - 0.2);
            const rrOffset = Math.floor(Math.random() * 3 - 1);
            const sbpOffset = Math.floor(Math.random() * 6 - 3);
            const dbpOffset = Math.floor(Math.random() * 4 - 2);

            const hr = (base.hr + hrOffset).toFixed(1);
            const spo2 = Math.min(100, Math.max(70, base.spo2 + spo2Offset)).toFixed(1);
            const temp = (base.temp + tempOffset).toFixed(1);
            const rr = Math.max(8, base.rr + rrOffset).toString();
            const sbp = Math.max(50, base.sbp + sbpOffset).toString();
            const dbp = Math.max(30, base.dbp + dbpOffset).toString();

            const sig = `${hr}-${spo2}-${temp}-${rr}-${sbp}-${dbp}`;
            if (!usedSignaturesRef.current.has(sig)) {
                usedSignaturesRef.current.add(sig);
                candidate = {
                    vitals: { heart_rate: hr, spo2, temperature: temp, respiratory_rate: rr, systolic_bp: sbp, diastolic_bp: dbp },
                    info: { name: base.name, desc: base.desc, count: usedSignaturesRef.current.size }
                };
                break;
            }
        }
        return candidate;
    };

    const handleAutoFill = (targetType = null) => {
        const result = generateUniqueVitals(targetType);
        if (result) {
            setVitals(result.vitals);
            setAutoFillInfo(result.info);
        }
    };

    const handleAutoFillAndSubmit = async (targetType = null) => {
        const result = generateUniqueVitals(targetType);
        if (!result) return;
        setVitals(result.vitals);
        setAutoFillInfo(result.info);
        setSubmitting(true);
        try {
            const payload = Object.fromEntries(Object.entries(result.vitals).map(([k,v]) => [k, parseFloat(v)]));
            const res = await vitalsAPI.add(payload);
            setPrediction(res.data.prediction);
            setShowAlert(res.data.prediction.alert);
            const evtRes = await eventsAPI.recent();
            setEvents(evtRes.data);
        } catch(e) {
            console.error(e);
        } finally {
            setSubmitting(false);
        }
    };

    const fetchAll = useCallback(async () => {
        try {
            const [predRes, profRes, devRes, evtRes] = await Promise.allSettled([
                predictionAPI.current(),
                patientsAPI.profile(),
                devicesAPI.list(),
                eventsAPI.recent(),
            ]);
            if (predRes.status === 'fulfilled') { setPrediction(predRes.value.data); setShowAlert(predRes.value.data.alert); }
            if (profRes.status === 'fulfilled') setProfile(profRes.value.data);
            if (devRes.status === 'fulfilled') setDevices(devRes.value.data);
            if (evtRes.status === 'fulfilled') setEvents(evtRes.value.data);
        } catch(e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // Auto-refresh every 10 seconds
    useEffect(() => {
        const interval = setInterval(() => { fetchAll(); }, 10000);
        return () => clearInterval(interval);
    }, [fetchAll]);

    const handleSubmit = async (e) => {
        e.preventDefault(); setSubmitting(true);
        try {
            const payload = Object.fromEntries(Object.entries(vitals).map(([k,v]) => [k, parseFloat(v)]));
            const res = await vitalsAPI.add(payload);
            setPrediction(res.data.prediction);
            setShowAlert(res.data.prediction.alert);
            setVitals({ heart_rate:'', spo2:'', temperature:'', respiratory_rate:'', systolic_bp:'', diastolic_bp:'' });
            // Refresh events
            const evtRes = await eventsAPI.recent();
            setEvents(evtRes.data);
        } catch(e) { console.error(e); }
        finally { setSubmitting(false); }
    };

    const vgi = prediction?.vgi ?? 0;
    const category = prediction?.risk_category ?? 'Stable';
    const hours = prediction?.estimated_hours_to_deterioration;
    const riskColor = getRiskColor(category);
    const currentVitals = prediction?.current_vitals || {};

    // Timeline chart
    const timelineData = prediction?.timeline ? {
        labels: prediction.timeline.map(t => t.hours === 0 ? 'Now' : `+${t.hours}h`),
        datasets: [{
            label: 'Actual', data: prediction.timeline.slice(0,3).map(t => t.risk),
            borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.1)', fill: false,
            tension: 0.4, pointRadius: 3, borderWidth: 2, pointBackgroundColor: '#6366f1',
        },{
            label: 'Predicted', data: prediction.timeline.map(t => t.risk),
            borderColor: '#ec4899', backgroundColor: 'rgba(236,72,153,0.05)', fill: true,
            tension: 0.4, pointRadius: 3, borderWidth: 2, borderDash: [5,5], pointBackgroundColor: '#ec4899',
        }],
    } : null;

    const chartOpts = {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'top', labels: { color: '#64748b', font: { size: 11 }, usePointStyle: true, pointStyle: 'line', padding: 15 } },
            tooltip: { backgroundColor: 'rgba(15,22,41,0.95)', titleColor: '#e2e8f0', bodyColor: '#94a3b8', borderColor: 'rgba(99,102,241,0.2)', borderWidth: 1, cornerRadius: 10, padding: 12, callbacks: { label: (c) => `${c.dataset.label}: ${c.parsed.y.toFixed(1)}%` } } },
        scales: { x: { grid: { color: 'rgba(99,102,241,0.06)' }, ticks: { color: '#4b5563', font: { size: 10 } }, border: { display: false } },
            y: { min: 0, max: 100, grid: { color: 'rgba(99,102,241,0.06)' }, ticks: { color: '#4b5563', font: { size: 10 }, callback: v=>`${v}%`, stepSize: 20 }, border: { display: false } } },
    };

    // AI Recommendations based on category
    const getRecommendations = () => {
        const recs = [];
        if (category.includes('Sepsis') || category.includes('SIRS'))
            recs.push({ priority: 'HIGH', text: 'Start IV fluids (30ml/kg)', desc: 'For possible sepsis management', color: '#ef4444' });
        else if (category.includes('Cardiac'))
            recs.push({ priority: 'HIGH', text: 'Cardiology consult', desc: 'Hemodynamic instability detected', color: '#ef4444' });
        else if (category.includes('Respiratory'))
            recs.push({ priority: 'HIGH', text: 'Supplemental O₂ therapy', desc: 'SpO₂ below safe threshold', color: '#ef4444' });
        else if (category.includes('Shock'))
            recs.push({ priority: 'HIGH', text: 'Emergency resuscitation', desc: 'Circulatory collapse detected', color: '#ef4444' });
        else if (category.includes('Critical'))
            recs.push({ priority: 'HIGH', text: 'ICU transfer recommended', desc: 'Critical deterioration pattern', color: '#ef4444' });
        else
            recs.push({ priority: 'LOW', text: 'Continue monitoring', desc: 'Patient vitals stable', color: '#10b981' });
        recs.push({ priority: 'MEDIUM', text: 'Monitor SpO₂ & Respiratory Rate', desc: 'Every 10-15 minutes', color: '#f59e0b' });
        recs.push({ priority: 'LOW', text: 'Repeat Vitals in 15 min', desc: 'Track for further deterioration', color: '#10b981' });
        return recs;
    };

    const vitalCards = [
        { key: 'heart_rate', label: 'Heart Rate', unit: 'bpm', icon: '❤️', color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' },
        { key: 'spo2', label: 'SpO₂', unit: '%', icon: '🫁', color: '#6366f1', borderColor: 'rgba(99,102,241,0.2)' },
        { key: 'temperature', label: 'Temperature', unit: '°C', icon: '🌡️', color: '#f59e0b', borderColor: 'rgba(245,158,11,0.2)' },
        { key: 'respiratory_rate', label: 'Respiratory Rate', unit: '/min', icon: '💨', color: '#22d3ee', borderColor: 'rgba(34,211,238,0.2)' },
    ];

    return (
        <div className="flex min-h-screen transition-colors duration-300" style={{ background: 'var(--bg-primary)' }}>
            <div className="bg-mesh"></div>
            <Sidebar />

            <main className="ml-64 flex-1 p-6 relative z-10">
                {/* Top Bar */}
                <div className="flex items-center justify-between mb-6 animate-fade-in">
                    <div className="flex items-center gap-4">
                        <div className="glass-card-static px-4 py-2 flex items-center gap-2">
                            <span className="text-xs text-slate-500">Patient</span>
                            <span className="text-sm font-bold text-white">{profile?.name || patientId} - ID: {patientId}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                            <span className="text-xs font-medium text-emerald-400">Live Monitoring</span>
                        </div>
                        <div className="glass-card-static px-3 py-2 flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                                {(profile?.name || 'P')[0].toUpperCase()}
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-white">{profile?.name || patientId}</p>
                                <p className="text-[10px] text-slate-500">Patient</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Critical Alert */}
                {showAlert && prediction?.alert_message && (
                    <div className="mb-5 animate-slide-down">
                        <div className="rounded-2xl p-4 flex items-center gap-4 alert-glow"
                            style={{ background: 'linear-gradient(135deg, rgba(220,38,38,0.15), rgba(239,68,68,0.08))', border: '1px solid rgba(220,38,38,0.3)' }}>
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(220,38,38,0.15)' }}>
                                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                            </div>
                            <div className="flex-1">
                                <p className="text-red-500 font-black text-sm">⚠️ CRITICAL ALERT</p>
                                <p className="text-red-500/90 font-medium text-xs mt-0.5">{prediction.alert_message}</p>
                                {vgi >= 80 && <p className="text-red-500/70 text-[10px] mt-1 font-semibold">📧 Alert email sent to monitoring team</p>}
                            </div>
                            <button onClick={() => setShowAlert(false)} className="px-4 py-2 rounded-lg text-sm font-bold text-red-500 hover:bg-red-500/10 transition-colors border border-red-500/30">
                                Acknowledge
                            </button>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="relative">
                            <div className="w-12 h-12 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Row 1: Vital Cards */}
                        <div className="grid grid-cols-4 gap-4 mb-5 animate-fade-in">
                            {vitalCards.map((v, i) => {
                                const val = currentVitals[v.key] || (prediction?.baseline?.[v.key]) || 0;
                                const status = getVitalStatus(v.key, val);
                                const sColor = getStatusColor(status);
                                return (
                                    <div key={v.key} className={`glass-card p-4 stagger-${i+1}`} style={{ borderColor: v.borderColor }}>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">{v.label}</span>
                                            <span className="text-lg">{v.icon}</span>
                                        </div>
                                        <div className="flex items-end gap-1.5">
                                            <span className="text-3xl font-black text-white">{val || '—'}</span>
                                            <span className="text-xs text-slate-500 mb-1">{v.unit}</span>
                                        </div>
                                        <div className="mt-2">
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                                                style={{ backgroundColor: `${sColor}15`, color: sColor, border: `1px solid ${sColor}30` }}>
                                                {status}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Row 2: VGI Card + AI Recommendations */}
                        <div className="grid grid-cols-3 gap-5 mb-5">
                            {/* VGI Card with Human Body */}
                            <div className="col-span-2 glass-card p-5 animate-scale-in" style={{ borderColor: `${riskColor}20`, boxShadow: `0 0 25px ${riskColor}15` }}>
                                <div className="flex">
                                    {/* Human body visualization */}
                                    <div className="w-36 flex-shrink-0 hidden lg:block mr-3">
                                        <HumanBodyTwinWidget category={category} onOpenTwin={() => navigate('/anatomy-twin')} />
                                    </div>
                                    {/* VGI Info */}
                                    <div className="flex-1 flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">VitalGuard Index</p>
                                                <svg className="w-3.5 h-3.5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            </div>
                                            <div className="flex items-end gap-2">
                                                <span className="text-5xl font-black" style={{ color: riskColor, textShadow: `0 0 30px ${riskColor}40` }}>
                                                    <AnimatedNumber value={vgi} />
                                                </span>
                                                <span className="text-lg text-slate-600 mb-2">/100</span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                <span className="px-3 py-1 rounded-full text-xs font-bold text-white"
                                                    style={{ backgroundColor: riskColor, boxShadow: `0 0 12px ${riskColor}40` }}>{category}</span>
                                                {hours && <span className="text-xs text-slate-500">Est. deterioration in <span className="font-bold text-slate-300">{hours}h</span></span>}
                                            </div>
                                            {/* Progress bar */}
                                            <div className="mt-3 h-1.5 w-72 rounded-full overflow-hidden" style={{ background: 'rgba(99,102,241,0.08)' }}>
                                                <div className="h-full rounded-full progress-glow transition-all duration-1000"
                                                    style={{ width: `${vgi}%`, background: `linear-gradient(90deg, ${riskColor}, ${riskColor}cc)` }}></div>
                                            </div>
                                            {/* 3D Twin Command Center Launch Button */}
                                            <div className="mt-3">
                                                <button
                                                    onClick={() => navigate('/anatomy-twin')}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 hover:text-white hover:bg-cyan-900/60 text-xs font-bold shadow-[0_0_12px_rgba(6,182,212,0.2)] transition-all group"
                                                >
                                                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 group-hover:animate-ping"></span>
                                                    <span>Open 3D Digital Twin Command Center</span>
                                                    <span className="text-cyan-400 group-hover:translate-x-0.5 transition-transform">→</span>
                                                </button>
                                            </div>
                                        </div>
                                        {/* Gauge */}
                                        <div className="relative w-28 h-28 flex-shrink-0 vgi-ring">
                                            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                                                <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(99,102,241,0.08)" strokeWidth="8" />
                                                <circle cx="60" cy="60" r="50" fill="none" stroke={riskColor} strokeWidth="8"
                                                    strokeDasharray={`${(vgi/100)*314} 314`} strokeLinecap="round" className="ring-animate"
                                                    style={{ filter: `drop-shadow(0 0 8px ${riskColor}60)`, transition: 'stroke-dasharray 1.5s cubic-bezier(0.4,0,0.2,1)' }} />
                                            </svg>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                <span className="text-xl font-black text-white"><AnimatedNumber value={vgi} />%</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* AI Recommendations */}
                            <div className="glass-card p-5 animate-slide-up">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-bold text-white">AI Recommend Actions</h3>
                                    <button className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                        Update
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {getRecommendations().map((r, i) => (
                                        <div key={i} className="flex items-start gap-3">
                                            <span className="px-2 py-0.5 rounded text-[9px] font-black flex-shrink-0 mt-0.5"
                                                style={{ backgroundColor: `${r.color}15`, color: r.color, border: `1px solid ${r.color}30` }}>
                                                {r.priority}
                                            </span>
                                            <div>
                                                <p className="text-xs font-semibold text-slate-200">{r.text}</p>
                                                <p className="text-[10px] text-slate-500">{r.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Row 3: Timeline + AI Explanation */}
                        <div className="grid grid-cols-3 gap-5 mb-5">
                            {timelineData && (
                                <div className="col-span-2 glass-card p-5 animate-slide-up">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.1)' }}>
                                                <svg className="w-3 h-3 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                                            </div>
                                            Risk Timeline Forecast
                                        </h3>
                                        <span className="text-[10px] text-slate-500 px-2 py-1 rounded-lg" style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.1)' }}>Last 12 Hours</span>
                                    </div>
                                    <div className="h-48"><Line data={timelineData} options={chartOpts} /></div>
                                </div>
                            )}
                            {/* AI Prediction Explanation */}
                            <div className="glass-card p-5 animate-slide-up">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-bold text-white">AI Prediction Explanation</h3>
                                    <button className="text-[10px] text-indigo-400 px-2 py-1 rounded-lg" style={{ border: '1px solid rgba(99,102,241,0.2)' }}>View Details</button>
                                </div>
                                <div className="space-y-3">
                                    {(prediction?.explanation || []).slice(0,4).map((f, i) => {
                                        const barColor = f.impact === 'high' ? '#ef4444' : f.impact === 'medium' ? '#f59e0b' : '#6366f1';
                                        const pct = f.impact === 'high' ? 85 : f.impact === 'medium' ? 60 : 40;
                                        return (
                                            <div key={i}>
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-1 h-4 rounded-full" style={{ backgroundColor: barColor }}></div>
                                                        <span className="text-xs text-slate-300">{f.factor}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold text-white">{f.value}</span>
                                                        <span className="text-[10px] font-bold" style={{ color: barColor }}>{f.severity === 'critical' ? 'Critical' : f.impact === 'medium' ? '+' + (Math.random()*15|0) + '%' : 'Normal'}</span>
                                                    </div>
                                                </div>
                                                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(99,102,241,0.08)' }}>
                                                    <div className="h-full rounded-full bar-animate" style={{ width: `${pct}%`, background: barColor, boxShadow: `0 0 8px ${barColor}40` }}></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {(!prediction?.explanation || prediction.explanation.length === 0) && (
                                        <p className="text-xs text-slate-500 text-center py-4">Submit vitals to see AI analysis</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Row 4: Bottom Cards */}
                        <div className="grid grid-cols-4 gap-4 mb-5">
                            {/* Patient Profile Card */}
                            <div className="glass-card p-4 animate-slide-up">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-xs font-bold text-white">Patient Profile</h3>
                                    <button onClick={() => window.location.href='/patients'} className="text-[10px] text-indigo-400 flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                        Edit
                                    </button>
                                </div>
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                                        {(profile?.name || 'P')[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white">{profile?.name || 'Patient'}</p>
                                        <p className="text-[10px] text-slate-500">ID: {patientId}</p>
                                    </div>
                                </div>
                                <div className="space-y-1.5 text-[11px]">
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <span>🎂</span> <span>Age: <span className="text-white font-medium">{profile?.age || 'N/A'}</span></span>
                                        <span className="text-slate-600">·</span>
                                        <span className="text-white font-medium">{profile?.gender || 'N/A'}</span>
                                    </div>
                                    {profile?.conditions && (
                                        <p className="text-slate-400 flex items-center gap-1">
                                            <span>💊</span> Condition: {profile.conditions}
                                        </p>
                                    )}
                                    <span className="inline-block px-2 py-0.5 rounded text-[9px] font-bold mt-1"
                                        style={{ backgroundColor: profile?.risk_level === 'High' ? 'rgba(239,68,68,0.15)' : profile?.risk_level === 'Medium' ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)', color: profile?.risk_level === 'High' ? '#ef4444' : profile?.risk_level === 'Medium' ? '#f59e0b' : '#10b981' }}>
                                        {profile?.risk_level || 'Low'} Risk
                                    </span>
                                </div>
                            </div>

                            {/* Device Status */}
                            <div className="glass-card p-4 animate-slide-up" style={{ animationDelay: '0.05s' }}>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-xs font-bold text-white">Device Status</h3>
                                    <button onClick={() => window.location.href='/devices'} className="text-[10px] text-indigo-400">View Details</button>
                                </div>
                                <div className="space-y-2.5">
                                    {devices.slice(0,3).map((d, i) => (
                                        <div key={d.id || i} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs">📡</span>
                                                <span className="text-xs text-slate-300 font-medium">{d.name}</span>
                                            </div>
                                            <span className="px-2 py-0.5 rounded text-[9px] font-bold"
                                                style={{ backgroundColor: d.status === 'Connected' || d.status === 'Active' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: d.status === 'Connected' || d.status === 'Active' ? '#10b981' : '#ef4444' }}>
                                                {d.status}
                                            </span>
                                        </div>
                                    ))}
                                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px]">
                                        <span className="text-slate-500 flex items-center gap-1">⚡ Battery: <span className="text-emerald-400 font-medium">Strong</span></span>
                                        <span className="text-slate-500 flex items-center gap-1">⏱ <span className="text-white font-medium">23 ms</span></span>
                                    </div>
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="glass-card p-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                                <h3 className="text-xs font-bold text-white mb-3">Quick Actions</h3>
                                <div className="space-y-2">
                                    <button onClick={() => window.location.href='/ai-insights'} className="w-full py-2 rounded-lg text-xs font-bold text-white flex items-center justify-center gap-2 btn-glow"
                                        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 0 15px rgba(99,102,241,0.3)' }}>
                                        🧪 Run Emergency Simulation
                                    </button>
                                    <button onClick={() => setIsReportOpen(true)} className="w-full py-2 rounded-lg text-xs font-bold text-white flex items-center justify-center gap-2"
                                        style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)' }}>
                                        📋 Generate Report
                                    </button>
                                    <button className="w-full py-2 rounded-lg text-xs font-medium text-slate-300 flex items-center justify-center gap-2"
                                        style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)' }}>
                                        📤 Export Data
                                    </button>
                                </div>
                            </div>

                            {/* Recent Events */}
                            <div className="glass-card p-4 animate-slide-up" style={{ animationDelay: '0.15s' }}>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-xs font-bold text-white">Recent Events</h3>
                                    <button onClick={() => window.location.href='/events'} className="text-[10px] text-indigo-400">View All</button>
                                </div>
                                <div className="space-y-2.5">
                                    {events.length > 0 ? events.slice(0,4).map((evt, i) => (
                                        <div key={evt.id || i} className="flex items-start gap-2">
                                            <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${evt.severity === 'critical' ? 'bg-red-500' : evt.severity === 'warning' ? 'bg-amber-500' : 'bg-indigo-500'}`}></div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[10px] text-slate-400 truncate">{evt.message}</p>
                                                <p className="text-[9px] text-slate-600">
                                                    {evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : ''}
                                                </p>
                                            </div>
                                        </div>
                                    )) : (
                                        <p className="text-[10px] text-slate-500 text-center py-3">No events yet</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Submit Vitals Form */}
                        <div className="glass-card p-5 animate-slide-up">
                            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.1)' }}>
                                        <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                    </div>
                                    Submit New Vital Signs
                                </h3>

                                {/* Auto-Fill Options (Zero Hardware / Software Demo Mode) */}
                                <div className="flex items-center gap-2 flex-wrap">
                                    <button
                                        type="button"
                                        onClick={() => handleAutoFill()}
                                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition-all duration-300 hover:scale-105 active:scale-95 shadow-md shadow-emerald-500/20"
                                        style={{
                                            background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
                                            border: '1px solid rgba(16, 185, 129, 0.4)'
                                        }}
                                    >
                                        ⚡ Auto-Fill Simulated Vitals (Non-Repeating)
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleAutoFillAndSubmit()}
                                        disabled={submitting}
                                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition-all duration-300 hover:scale-105 active:scale-95 shadow-md shadow-indigo-500/20 disabled:opacity-50"
                                        style={{
                                            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                            border: '1px solid rgba(99, 102, 241, 0.4)'
                                        }}
                                    >
                                        🚀 Auto-Fill & Analyze (1-Click)
                                    </button>

                                    {/* Preset clinical category pills */}
                                    <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 text-[11px]">
                                        <button type="button" onClick={() => handleAutoFill('stable')} className="px-2 py-0.5 rounded-lg text-emerald-400 hover:bg-emerald-500/20 font-medium">Stable</button>
                                        <button type="button" onClick={() => handleAutoFill('sepsis')} className="px-2 py-0.5 rounded-lg text-amber-400 hover:bg-amber-500/20 font-medium">SIRS</button>
                                        <button type="button" onClick={() => handleAutoFill('shock')} className="px-2 py-0.5 rounded-lg text-rose-400 hover:bg-rose-500/20 font-medium">Shock</button>
                                        <button type="button" onClick={() => handleAutoFill('hypoxia')} className="px-2 py-0.5 rounded-lg text-cyan-400 hover:bg-cyan-500/20 font-medium">Hypoxia</button>
                                    </div>
                                </div>
                            </div>

                            {/* Info Banner when Auto-Filled */}
                            {autoFillInfo && (
                                <div className="mb-4 px-3.5 py-2 rounded-xl text-xs bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 flex items-center justify-between animate-fade-in shadow-inner">
                                    <div className="flex items-center gap-2">
                                        <span className="text-emerald-400 font-bold">✓ Profile Generated:</span>
                                        <span className="font-semibold text-white">{autoFillInfo.name}</span>
                                        <span className="text-slate-400 text-[11px]">— {autoFillInfo.desc}</span>
                                    </div>
                                    <span className="text-[10px] text-cyan-400 font-mono bg-cyan-900/60 px-2 py-0.5 rounded border border-cyan-700">
                                        Reading #{autoFillInfo.count} • 100% Unique
                                    </span>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="grid grid-cols-6 gap-4">
                                {[
                                    { key: 'heart_rate', label: 'Heart Rate', unit: 'bpm', ph: '72' },
                                    { key: 'spo2', label: 'SpO₂', unit: '%', ph: '98' },
                                    { key: 'temperature', label: 'Temperature', unit: '°C', ph: '37.0' },
                                    { key: 'respiratory_rate', label: 'Resp Rate', unit: '/min', ph: '16' },
                                    { key: 'systolic_bp', label: 'Systolic BP', unit: 'mmHg', ph: '120' },
                                    { key: 'diastolic_bp', label: 'Diastolic BP', unit: 'mmHg', ph: '80' },
                                ].map(f => (
                                    <div key={f.key}>
                                        <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase tracking-wider">{f.label} <span className="text-slate-700">({f.unit})</span></label>
                                        <input type="number" step="0.1" value={vitals[f.key]} onChange={e => setVitals(p => ({...p, [f.key]: e.target.value}))}
                                            className="w-full px-3 py-2 rounded-xl text-sm text-white font-mono" placeholder={f.ph} required
                                            style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.1)' }} />
                                    </div>
                                ))}
                                <div className="col-span-6 flex items-center gap-3">
                                    <button type="submit" disabled={submitting}
                                        className="px-8 py-2.5 font-bold rounded-xl text-white btn-glow disabled:opacity-40 transition-all hover:scale-105 active:scale-95"
                                        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 0 20px rgba(99,102,241,0.3)' }}>
                                        {submitting ? '⏳ Analyzing...' : '🔬 Submit & Analyze'}
                                    </button>
                                    <span className="text-xs text-slate-500">
                                        Or click <strong>"Auto-Fill Vitals"</strong> above to test physiological patterns instantly without hardware!
                                    </span>
                                </div>
                            </form>
                        </div>

                        {/* Camera Vision Prediction Card */}
                        <div className="mt-6 animate-slide-up">
                            <div className="bg-purple-900/20 border-2 border-purple-500/50 rounded-2xl p-6 relative overflow-hidden flex flex-col items-center justify-center text-center group hover:border-purple-400 transition-colors cursor-pointer"
                                 onClick={() => window.location.href='/camera-vision'}
                                 style={{ boxShadow: '0 0 30px rgba(168, 85, 247, 0.15)' }}>
                                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-transparent to-purple-500/10 group-hover:opacity-100 opacity-50 transition-opacity"></div>
                                <h3 className="text-xl font-bold text-white mb-2 relative z-10 flex items-center gap-2">
                                    <span className="text-2xl">📷</span> Camera Vision Prediction
                                </h3>
                                <p className="text-purple-300 text-sm mb-4 relative z-10">Zero-Waste Vital Sign Monitoring — Click to launch</p>
                                <button className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-lg shadow-purple-500/30 transition-all relative z-10 flex items-center gap-2 animate-pulse">
                                    ▶️ Start Camera Mode
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </main>

            <ReportModal
                isOpen={isReportOpen}
                onClose={() => setIsReportOpen(false)}
                profile={profile}
                prediction={prediction}
                devices={devices}
                patientId={patientId}
            />
        </div>
    );
}
