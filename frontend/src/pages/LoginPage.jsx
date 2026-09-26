import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { authAPI } from '../api';

export default function LoginPage() {
    const [patientId, setPatientId] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await authAPI.login(patientId, password);
            login(res.data.access_token, res.data.patient_id);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.detail || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative transition-colors duration-300" style={{ background: 'var(--bg-primary)' }}>
            {/* Animated background */}
            <div className="bg-mesh"></div>

            {/* Background orbs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl animate-pulse-slow" style={{ background: 'rgba(99, 102, 241, 0.08)' }}></div>
                <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-3xl animate-pulse-slow" style={{ background: 'rgba(139, 92, 246, 0.06)', animationDelay: '1s' }}></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-3xl" style={{ background: 'rgba(99, 102, 241, 0.04)' }}></div>
            </div>

            {/* Heartbeat line */}
            <div className="heartbeat-bg"></div>

            <div className="relative w-full max-w-md animate-scale-in z-10">
                {/* Logo / Brand */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-400 logo-glow mb-4">
                        <svg className="w-8 h-8 text-white heart-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">
                        VITAL-GUARD <span className="gradient-text">AI</span>
                    </h1>
                    <p className="text-slate-500 mt-2 text-sm">Predictive Clinical Deterioration Monitoring</p>
                </div>

                {/* Card */}
                <div className="glass-card p-8 glow-border">
                    <h2 className="text-xl font-semibold text-white mb-6">Sign In</h2>

                    {error && (
                        <div className="mb-4 p-3 rounded-xl text-red-400 text-sm animate-fade-in"
                            style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Patient ID</label>
                            <input
                                id="patient-id-input"
                                type="text"
                                value={patientId}
                                onChange={(e) => setPatientId(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-600 transition-all duration-300"
                                style={{ background: 'rgba(99, 102, 241, 0.04)', border: '1px solid rgba(99, 102, 241, 0.1)' }}
                                placeholder="Enter your Patient ID"
                                required
                                onFocus={(e) => { e.target.style.borderColor = 'rgba(99, 102, 241, 0.4)'; e.target.style.background = 'rgba(99, 102, 241, 0.08)'; }}
                                onBlur={(e) => { e.target.style.borderColor = 'rgba(99, 102, 241, 0.1)'; e.target.style.background = 'rgba(99, 102, 241, 0.04)'; }}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Password</label>
                            <input
                                id="password-input"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-600 transition-all duration-300"
                                style={{ background: 'rgba(99, 102, 241, 0.04)', border: '1px solid rgba(99, 102, 241, 0.1)' }}
                                placeholder="Enter your password"
                                required
                                onFocus={(e) => { e.target.style.borderColor = 'rgba(99, 102, 241, 0.4)'; e.target.style.background = 'rgba(99, 102, 241, 0.08)'; }}
                                onBlur={(e) => { e.target.style.borderColor = 'rgba(99, 102, 241, 0.1)'; e.target.style.background = 'rgba(99, 102, 241, 0.04)'; }}
                            />
                        </div>

                        <button
                            id="login-button"
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 text-white font-semibold rounded-xl transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed btn-glow btn-ripple"
                            style={{
                                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #6366f1 100%)',
                                backgroundSize: '200% auto',
                                boxShadow: '0 0 20px rgba(99, 102, 241, 0.3), 0 4px 15px rgba(0, 0, 0, 0.3)',
                            }}
                            onMouseEnter={(e) => { e.target.style.backgroundPosition = 'right center'; e.target.style.transform = 'scale(1.02)'; }}
                            onMouseLeave={(e) => { e.target.style.backgroundPosition = 'left center'; e.target.style.transform = 'scale(1)'; }}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Signing in...
                                </span>
                            ) : 'Sign In'}
                        </button>
                    </form>

                    <p className="mt-6 text-center text-slate-500 text-sm">
                        Don't have an account?{' '}
                        <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                            Register here
                        </Link>
                    </p>
                </div>

                <p className="text-center text-slate-700 text-xs mt-6">
                    © 2026 VITAL-GUARD AI • Clinical Grade Monitoring
                </p>
            </div>
        </div>
    );
}
