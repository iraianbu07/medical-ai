import { useState, useEffect } from 'react';
import { patientsAPI } from '../api';
import Sidebar from '../components/Sidebar';

function getRiskColor(c) {
    return { 'Stable':'#10b981','Mild Abnormality':'#60a5fa','Sepsis / SIRS':'#f59e0b','Cardiac Risk':'#f97316','Respiratory Failure':'#ef4444','Hypertensive Crisis':'#a855f7','Hemodynamic Shock':'#e11d48','Multi-Organ Risk':'#dc2626','Critical Deterioration':'#991b1b' }[c] || '#6366f1';
}

export default function PatientsPage() {
    const [patients, setPatients] = useState([]);
    const [profile, setProfile] = useState(null);
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({ name: '', age: '', gender: '', conditions: '' });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            try {
                const [listRes, profRes] = await Promise.allSettled([patientsAPI.list(), patientsAPI.profile()]);
                if (listRes.status === 'fulfilled') setPatients(listRes.value.data);
                if (profRes.status === 'fulfilled') {
                    setProfile(profRes.value.data);
                    setForm({ name: profRes.value.data.name || '', age: profRes.value.data.age || '', gender: profRes.value.data.gender || '', conditions: profRes.value.data.conditions || '' });
                }
            } catch(e) {}
            finally { setLoading(false); }
        };
        fetch();
    }, []);

    const handleSave = async () => {
        try {
            const res = await patientsAPI.updateProfile({
                name: form.name, age: parseInt(form.age) || null,
                gender: form.gender, conditions: form.conditions,
            });
            setProfile(res.data);
            setEditing(false);
            // Refresh list
            const listRes = await patientsAPI.list();
            setPatients(listRes.data);
        } catch(e) { console.error(e); }
    };

    return (
        <div className="flex min-h-screen transition-colors duration-300" style={{ background: 'var(--bg-primary)' }}>
            <div className="bg-mesh"></div>
            <Sidebar />
            <main className="ml-64 flex-1 p-6 relative z-10">
                <div className="mb-6 animate-fade-in">
                    <h1 className="text-2xl font-bold text-white">Patients</h1>
                    <p className="text-slate-500 text-sm mt-1">All registered patients and their current status</p>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="w-12 h-12 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <>
                        {/* My Profile */}
                        <div className="glass-card p-6 mb-6 animate-scale-in">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.1)' }}>👤</div>
                                    My Profile
                                </h3>
                                <button onClick={() => setEditing(!editing)} className="text-xs text-indigo-400 hover:text-indigo-300 px-3 py-1 rounded-lg" style={{ border: '1px solid rgba(99,102,241,0.2)' }}>
                                    {editing ? 'Cancel' : '✏️ Edit'}
                                </button>
                            </div>
                            {editing ? (
                                <div className="grid grid-cols-4 gap-4">
                                    {[['name','Full Name','text','John Doe'],['age','Age','number','45'],['gender','Gender','text','Male'],['conditions','Conditions','text','Diabetic, Hypertension']].map(([k,l,t,p]) => (
                                        <div key={k}>
                                            <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wider">{l}</label>
                                            <input type={t} value={form[k]} onChange={e => setForm(f => ({...f, [k]: e.target.value}))}
                                                className="w-full px-3 py-2 rounded-xl text-sm text-white" placeholder={p}
                                                style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.1)' }} />
                                        </div>
                                    ))}
                                    <div className="col-span-4">
                                        <button onClick={handleSave} className="px-6 py-2 rounded-xl text-sm font-bold text-white btn-glow"
                                            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>Save Profile</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                                        {(profile?.name || 'P')[0].toUpperCase()}
                                    </div>
                                    <div className="flex-1 grid grid-cols-4 gap-4">
                                        <div><p className="text-[10px] text-slate-500 uppercase">Name</p><p className="text-sm font-bold text-white">{profile?.name || 'N/A'}</p></div>
                                        <div><p className="text-[10px] text-slate-500 uppercase">Age / Gender</p><p className="text-sm font-bold text-white">{profile?.age || 'N/A'} / {profile?.gender || 'N/A'}</p></div>
                                        <div><p className="text-[10px] text-slate-500 uppercase">Conditions</p><p className="text-sm font-bold text-white">{profile?.conditions || 'None'}</p></div>
                                        <div><p className="text-[10px] text-slate-500 uppercase">Risk Level</p>
                                            <span className="px-2 py-0.5 rounded text-xs font-bold"
                                                style={{ backgroundColor: profile?.risk_level === 'High' ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)', color: profile?.risk_level === 'High' ? '#ef4444' : '#10b981' }}>
                                                {profile?.risk_level || 'Low'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* All Patients */}
                        <div className="glass-card-static overflow-hidden animate-slide-up">
                            <div className="p-5" style={{ borderBottom: '1px solid rgba(99,102,241,0.08)' }}>
                                <h3 className="text-sm font-bold text-white">All Patients ({patients.length})</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr style={{ background: 'rgba(99,102,241,0.04)' }}>
                                            {['Patient ID','Name','Age','Gender','Conditions','Risk Level','Latest VGI','Status','Last Reading'].map(h => (
                                                <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {patients.map((p, i) => (
                                            <tr key={p.patient_id} className="table-row-glass" style={{ borderBottom: '1px solid rgba(99,102,241,0.04)' }}>
                                                <td className="px-4 py-3 text-xs font-mono text-indigo-400">{p.patient_id}</td>
                                                <td className="px-4 py-3 text-xs text-white font-medium">{p.name || 'Patient'}</td>
                                                <td className="px-4 py-3 text-xs text-slate-300">{p.age || '-'}</td>
                                                <td className="px-4 py-3 text-xs text-slate-300">{p.gender || '-'}</td>
                                                <td className="px-4 py-3 text-xs text-slate-400">{p.conditions || 'None'}</td>
                                                <td className="px-4 py-3">
                                                    <span className="px-2 py-0.5 rounded text-[9px] font-bold"
                                                        style={{ backgroundColor: p.risk_level === 'High' ? 'rgba(239,68,68,0.15)' : p.risk_level === 'Medium' ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)', color: p.risk_level === 'High' ? '#ef4444' : p.risk_level === 'Medium' ? '#f59e0b' : '#10b981' }}>
                                                        {p.risk_level || 'Low'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-xs font-bold" style={{ color: getRiskColor(p.latest_category), textShadow: `0 0 8px ${getRiskColor(p.latest_category)}40` }}>
                                                    {p.latest_vgi != null ? p.latest_vgi.toFixed(1) + '%' : '-'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {p.latest_category ? (
                                                        <span className="px-2 py-0.5 text-[9px] font-bold rounded-full text-white" style={{ backgroundColor: getRiskColor(p.latest_category) }}>{p.latest_category}</span>
                                                    ) : <span className="text-xs text-slate-500">No data</span>}
                                                </td>
                                                <td className="px-4 py-3 text-[10px] text-slate-500">
                                                    {p.last_reading ? new Date(p.last_reading).toLocaleString('en-IN', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit', timeZone:'Asia/Kolkata' }) : 'Never'}
                                                </td>
                                            </tr>
                                        ))}
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
