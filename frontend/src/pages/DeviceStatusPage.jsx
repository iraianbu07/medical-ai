import { useState, useEffect } from 'react';
import { devicesAPI } from '../api';
import Sidebar from '../components/Sidebar';

export default function DeviceStatusPage() {
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [newDevice, setNewDevice] = useState({ name: '', device_type: 'sensor' });

    useEffect(() => {
        const fetch = async () => {
            try { const res = await devicesAPI.list(); setDevices(res.data); }
            catch(e) {} finally { setLoading(false); }
        };
        fetch();
    }, []);

    const handleAdd = async () => {
        if (!newDevice.name.trim()) return;
        try {
            await devicesAPI.add(newDevice);
            const res = await devicesAPI.list();
            setDevices(res.data);
            setNewDevice({ name: '', device_type: 'sensor' });
            setAdding(false);
        } catch(e) { console.error(e); }
    };

    const toggleStatus = async (id, currentStatus) => {
        const newStatus = currentStatus === 'Connected' || currentStatus === 'Active' ? 'Disconnected' : 'Connected';
        try {
            await devicesAPI.updateStatus(id, { status: newStatus });
            const res = await devicesAPI.list();
            setDevices(res.data);
        } catch(e) { console.error(e); }
    };

    const handleRemove = async (id) => {
        try {
            await devicesAPI.remove(id);
            const res = await devicesAPI.list();
            setDevices(res.data);
        } catch(e) { console.error(e); }
    };

    const deviceIcons = { 'Pulse Oximeter': '❤️', 'Temperature Sensor': '🌡️', 'Respiratory Monitor': '💨', 'sensor': '📡', 'monitor': '🖥️' };

    return (
        <div className="flex min-h-screen transition-colors duration-300" style={{ background: 'var(--bg-primary)' }}>
            <div className="bg-mesh"></div>
            <Sidebar />
            <main className="ml-64 flex-1 p-6 relative z-10">
                <div className="flex items-center justify-between mb-6 animate-fade-in">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Device Status</h1>
                        <p className="text-slate-500 text-sm mt-1">Manage connected monitoring devices</p>
                    </div>
                    <button onClick={() => setAdding(!adding)} className="px-4 py-2 rounded-xl text-sm font-bold text-white btn-glow"
                        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                        {adding ? 'Cancel' : '+ Add Device'}
                    </button>
                </div>

                {adding && (
                    <div className="glass-card p-5 mb-5 animate-slide-down">
                        <h3 className="text-sm font-bold text-white mb-3">Add New Device</h3>
                        <div className="flex items-end gap-4">
                            <div className="flex-1">
                                <label className="block text-[10px] text-slate-500 mb-1 uppercase">Device Name</label>
                                <input type="text" value={newDevice.name} onChange={e => setNewDevice(d => ({...d, name: e.target.value}))}
                                    className="w-full px-3 py-2 rounded-xl text-sm text-white" placeholder="e.g. MAX30102"
                                    style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.1)' }} />
                            </div>
                            <div className="flex-1">
                                <label className="block text-[10px] text-slate-500 mb-1 uppercase">Type</label>
                                <select value={newDevice.device_type} onChange={e => setNewDevice(d => ({...d, device_type: e.target.value}))}
                                    className="w-full px-3 py-2 rounded-xl text-sm text-white"
                                    style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.1)' }}>
                                    <option value="sensor">Sensor</option>
                                    <option value="Pulse Oximeter">Pulse Oximeter</option>
                                    <option value="Temperature Sensor">Temperature Sensor</option>
                                    <option value="Respiratory Monitor">Respiratory Monitor</option>
                                    <option value="monitor">Monitor</option>
                                </select>
                            </div>
                            <button onClick={handleAdd} className="px-6 py-2 rounded-xl text-sm font-bold text-white"
                                style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>Add</button>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="w-12 h-12 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <>
                        {/* Summary */}
                        <div className="grid grid-cols-4 gap-4 mb-5 animate-fade-in">
                            <div className="glass-card p-4 text-center">
                                <p className="text-3xl font-black text-white">{devices.length}</p>
                                <p className="text-[10px] text-slate-500 uppercase mt-1">Total Devices</p>
                            </div>
                            <div className="glass-card p-4 text-center">
                                <p className="text-3xl font-black text-emerald-400">{devices.filter(d => d.status === 'Connected' || d.status === 'Active').length}</p>
                                <p className="text-[10px] text-slate-500 uppercase mt-1">Connected</p>
                            </div>
                            <div className="glass-card p-4 text-center">
                                <p className="text-3xl font-black text-red-400">{devices.filter(d => d.status === 'Disconnected').length}</p>
                                <p className="text-[10px] text-slate-500 uppercase mt-1">Disconnected</p>
                            </div>
                            <div className="glass-card p-4 text-center">
                                <p className="text-3xl font-black text-indigo-400">{Math.round(devices.reduce((s,d) => s + (d.latency_ms || 0), 0) / Math.max(devices.length,1))}</p>
                                <p className="text-[10px] text-slate-500 uppercase mt-1">Avg Latency (ms)</p>
                            </div>
                        </div>

                        {/* Device Cards */}
                        <div className="grid grid-cols-3 gap-4 animate-slide-up">
                            {devices.map((d, i) => {
                                const isOnline = d.status === 'Connected' || d.status === 'Active';
                                const icon = deviceIcons[d.device_type] || '📡';
                                return (
                                    <div key={d.id} className={`glass-card p-5 stagger-${Math.min(i+1,6)}`}
                                        style={{ borderColor: isOnline ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)' }}>
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                                                    style={{ background: isOnline ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)' }}>{icon}</div>
                                                <div>
                                                    <p className="text-sm font-bold text-white">{d.name}</p>
                                                    <p className="text-[10px] text-slate-500">{d.device_type}</p>
                                                </div>
                                            </div>
                                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold"
                                                style={{ backgroundColor: isOnline ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: isOnline ? '#10b981' : '#ef4444' }}>
                                                {d.status}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 mb-3">
                                            <div className="rounded-lg p-2" style={{ background: 'rgba(99,102,241,0.04)' }}>
                                                <p className="text-[9px] text-slate-500 uppercase">Battery</p>
                                                <p className="text-xs font-bold text-emerald-400">⚡ {d.battery_level || 'N/A'}</p>
                                            </div>
                                            <div className="rounded-lg p-2" style={{ background: 'rgba(99,102,241,0.04)' }}>
                                                <p className="text-[9px] text-slate-500 uppercase">Latency</p>
                                                <p className="text-xs font-bold text-indigo-400">⏱ {d.latency_ms || 0} ms</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => toggleStatus(d.id, d.status)}
                                                className="flex-1 py-1.5 rounded-lg text-[10px] font-bold"
                                                style={{ background: isOnline ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)', color: isOnline ? '#ef4444' : '#10b981', border: `1px solid ${isOnline ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}` }}>
                                                {isOnline ? 'Disconnect' : 'Connect'}
                                            </button>
                                            <button onClick={() => handleRemove(d.id)}
                                                className="py-1.5 px-3 rounded-lg text-[10px] text-slate-500 hover:text-red-400 transition-colors"
                                                style={{ border: '1px solid rgba(99,102,241,0.08)' }}>🗑️</button>
                                        </div>
                                        {d.last_seen && (
                                            <p className="text-[9px] text-slate-600 mt-2">
                                                Last seen: {new Date(d.last_seen).toLocaleString('en-IN', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit', timeZone:'Asia/Kolkata' })}
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
