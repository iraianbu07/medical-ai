import React from 'react';
import { Line } from 'react-chartjs-2';

export default function ReportModal({ isOpen, onClose, profile, prediction, devices, patientId }) {
    if (!isOpen) return null;

    const vgi = prediction?.vgi ?? 0;
    const category = prediction?.risk_category ?? 'Stable';
    const hours = prediction?.estimated_hours_to_deterioration;

    const handlePrint = () => {
        window.print();
    };

    const vitalCards = [
        { key: 'heart_rate', label: 'Heart Rate', unit: 'bpm', icon: '❤️' },
        { key: 'spo2', label: 'SpO₂', unit: '%', icon: '🫁' },
        { key: 'temperature', label: 'Temp', unit: '°C', icon: '🌡️' },
        { key: 'respiratory_rate', label: 'Resp Rate', unit: '/min', icon: '💨' },
        { key: 'systolic_bp', label: 'Sys BP', unit: 'mmHg', icon: '🔴' },
        { key: 'diastolic_bp', label: 'Dia BP', unit: 'mmHg', icon: '🔵' },
    ];

    const timelineData = prediction?.timeline ? {
        labels: prediction.timeline.map(t => t.hours === 0 ? 'Now' : `+${t.hours}h`),
        datasets: [{
            label: 'Predicted Risk', data: prediction.timeline.map(t => t.risk),
            borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.1)', fill: true,
            tension: 0.4, pointRadius: 2, borderWidth: 2
        }],
    } : null;

    const chartOpts = {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { grid: { color: '#e2e8f0' } }, y: { min: 0, max: 100, grid: { color: '#e2e8f0' } } }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-8 print-modal-wrapper">
            <div className="bg-white text-slate-900 w-full max-w-4xl max-h-full overflow-y-auto rounded-2xl shadow-2xl printable-area">
                
                {/* Print Header Actions (Hidden when printing) */}
                <div className="sticky top-0 bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-center z-10 no-print rounded-t-2xl">
                    <h2 className="font-bold text-lg text-slate-800">Clinical Deterioration Report</h2>
                    <div className="flex gap-3">
                        <button onClick={handlePrint} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors flex items-center gap-2">
                            <span>🖨️</span> Print / Save PDF
                        </button>
                        <button onClick={onClose} className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-lg transition-colors">
                            Close
                        </button>
                    </div>
                </div>

                {/* Printable Content */}
                <div className="p-8 pb-12 bg-white">
                    {/* Header */}
                    <div className="border-b-2 border-indigo-600 pb-6 mb-6 flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">VITAL-GUARD AI</h1>
                            <p className="text-sm font-bold text-indigo-600 uppercase tracking-widest mt-1">Official Medical Report</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-bold text-slate-500">Date Issued:</p>
                            <p className="text-lg font-mono text-slate-800">{new Date().toLocaleString('en-IN')}</p>
                            <p className="text-sm text-slate-500 mt-2">Facility: General Hospital ICU</p>
                        </div>
                    </div>

                    {/* Patient Info */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-8 flex gap-8">
                        <div className="flex items-center gap-4 border-r border-slate-200 pr-8">
                            <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-2xl font-bold border-2 border-indigo-200">
                                {(profile?.name || 'P')[0].toUpperCase()}
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Patient Name</p>
                                <p className="text-2xl font-black text-slate-800">{profile?.name || patientId}</p>
                            </div>
                        </div>
                        <div className="flex-1 grid grid-cols-3 gap-4">
                            <div><p className="text-[10px] uppercase text-slate-500 font-bold">Patient ID</p><p className="font-mono font-bold text-slate-800">{patientId}</p></div>
                            <div><p className="text-[10px] uppercase text-slate-500 font-bold">Age / Gender</p><p className="font-bold text-slate-800">{profile?.age || 'N/A'} / {profile?.gender || 'N/A'}</p></div>
                            <div><p className="text-[10px] uppercase text-slate-500 font-bold">Base Risk Level</p><p className="font-bold text-slate-800">{profile?.risk_level || 'Low'}</p></div>
                            <div className="col-span-3"><p className="text-[10px] uppercase text-slate-500 font-bold">Known Conditions</p><p className="font-bold text-slate-800">{profile?.conditions || 'None recorded'}</p></div>
                        </div>
                    </div>

                    {/* Risk Index & Recommendations */}
                    <div className="grid grid-cols-2 gap-8 mb-8">
                        {/* VGI Score */}
                        <div className="border border-slate-200 rounded-xl p-6 relative overflow-hidden bg-white">
                            <div className="absolute top-0 left-0 w-2 h-full" style={{ backgroundColor: vgi > 75 ? '#ef4444' : vgi > 40 ? '#f59e0b' : '#10b981' }}></div>
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">VitalGuard Index (VGI)</h3>
                            <div className="flex items-end gap-2 mb-2">
                                <span className="text-6xl font-black" style={{ color: vgi > 75 ? '#dc2626' : vgi > 40 ? '#d97706' : '#059669' }}>
                                    {vgi.toFixed(1)}
                                </span>
                                <span className="text-xl font-bold text-slate-400 mb-1">/100</span>
                            </div>
                            <p className="inline-block px-3 py-1 rounded-full text-sm font-bold text-white mb-2"
                                style={{ backgroundColor: vgi > 75 ? '#ef4444' : vgi > 40 ? '#f59e0b' : '#10b981' }}>
                                {category}
                            </p>
                            {hours && <p className="text-sm font-bold text-slate-600 mt-2">Est. Deterioration: <span className="text-red-600">{hours} hours</span></p>}
                        </div>

                        {/* Reasoning */}
                        <div className="border border-slate-200 rounded-xl p-6 bg-slate-50">
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">AI Clinical Reasoning</h3>
                            <p className="text-slate-800 font-medium leading-relaxed italic mb-4">
                                "{prediction?.clinical_reasoning || 'No immediate clinical concerns detected based on current vitals.'}"
                            </p>
                            <h3 className="text-xs font-bold text-slate-500 uppercase mb-2 mt-4 border-t pt-4">Primary Factors</h3>
                            <ul className="text-sm text-slate-700 space-y-1">
                                {prediction?.explanation?.slice(0, 3).map((f, i) => (
                                    <li key={i} className="flex justify-between border-b border-slate-200 py-1">
                                        <span className="font-semibold">{f.factor}</span> <span>{f.value}</span>
                                    </li>
                                )) || <li>No current factors to flag.</li>}
                            </ul>
                        </div>
                    </div>

                    {/* Vitals Summary */}
                    <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Current Vital Signs Snapshot</h3>
                    <div className="grid grid-cols-6 gap-3 mb-8">
                        {vitalCards.map(v => {
                            const val = prediction?.current_vitals?.[v.key];
                            return (
                                <div key={v.key} className="border border-slate-200 rounded-lg p-3 text-center bg-white shadow-sm">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">{v.label}</p>
                                    <p className="text-xl font-black text-slate-800">{val || '—'}</p>
                                    <p className="text-[10px] text-slate-500">{v.unit}</p>
                                </div>
                            );
                        })}
                    </div>

                    {/* Timeline projection */}
                    <div className="page-break-inside-avoid">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">12-Hour Risk Projection Model</h3>
                        <div className="border border-slate-200 rounded-xl p-4 bg-white h-64 mb-8">
                            {timelineData ? <Line data={timelineData} options={chartOpts} /> : <p className="text-center text-slate-500 mt-20">Insufficient data for timeline projection.</p>}
                        </div>
                    </div>

                    {/* Signature block */}
                    <div className="mt-16 pt-8 border-t-2 border-slate-200 grid grid-cols-2 gap-12 page-break-inside-avoid">
                        <div>
                            <p className="text-sm font-bold text-slate-400 mb-8">Generated by VITAL-GUARD AI</p>
                            <div className="border-b border-slate-400 w-full mb-2"></div>
                            <p className="text-xs font-bold text-slate-600">System Administrator / Attending Provider</p>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-400 mb-8">Reviewed & Verified By</p>
                            <div className="border-b border-slate-400 w-full mb-2"></div>
                            <p className="text-xs font-bold text-slate-600">Physician Signature & Date</p>
                        </div>
                    </div>

                </div>
            </div>
            
            {/* Print CSS hidden globally but injected here for simplicity */}
            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    body * { visibility: hidden; }
                    .print-modal-wrapper, .printable-area, .printable-area * {
                        visibility: visible;
                    }
                    .print-modal-wrapper {
                        position: absolute;
                        left: 0;
                        top: 0;
                        padding: 0;
                        margin: 0;
                        background: white !important;
                        min-width: 100vw;
                    }
                    .printable-area {
                        box-shadow: none !important;
                        border: none !important;
                        width: 100% !important;
                        max-width: 100% !important;
                    }
                    .no-print { display: none !important; }
                    /* Force background colors for WebKit during print */
                    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                }
            `}} />
        </div>
    );
}
