import axios from 'axios';
import Cookies from 'js-cookie';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach access token
api.interceptors.request.use((config) => {
  const token = Cookies.get('access_token') || localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const res = await api.post('/auth/refresh');
        const { access_token } = res.data;
        localStorage.setItem('access_token', access_token);
        original.headers.Authorization = `Bearer ${access_token}`;
        return api(original);
      } catch {
        localStorage.removeItem('access_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth ───────────────────────────────────────────────────────────────────
export const authApi = {
  register: (email: string, password: string, name?: string) =>
    api.post('/auth/register', { email, password, name }),
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  refresh: () => api.post('/auth/refresh'),
};

// ── Users ──────────────────────────────────────────────────────────────────
export const usersApi = {
  getMe: () => api.get('/users/me'),
  updateMe: (data: object) => api.patch('/users/me', data),
  getDashboard: () => api.get('/users/dashboard'),
  updatePreferences: (data: object) => api.patch('/users/preferences', data),
  completeOnboarding: (data: object) => api.patch('/users/onboarding-complete', data),
};

// ── Metrics ────────────────────────────────────────────────────────────────
export const metricsApi = {
  getToday: () => api.get('/metrics/today'),
  submitMood: (mood_score: number, energy_level?: number, stress_level?: number) =>
    api.post('/metrics/mood', { mood_score, energy_level, stress_level }),
  addHydrationCup: () => api.post('/metrics/hydration/add'),
  setHydration: (cups: number) => api.post('/metrics/hydration', { cups }),
  updateToday: (data: object) => api.patch('/metrics/today', data),
  getHistory: (days?: number) => api.get('/metrics/history', { params: { days } }),
};

// ── Recommendations ────────────────────────────────────────────────────────
export const recsApi = {
  getToday: () => api.get('/recommendations/today'),
  getHistory: (days?: number) => api.get('/recommendations/history', { params: { days } }),
  takeAction: (recId: string, action: string) =>
    api.patch(`/recommendations/${recId}/action`, { action }),
  getAdherence: () => api.get('/recommendations/adherence'),
};

// ── Events ─────────────────────────────────────────────────────────────────
export const eventsApi = {
  logVoice: (transcript: string) =>
    api.post('/events/voice', { transcript }),
  getRecent: () => api.get('/events/'),
};

// ── Reports ────────────────────────────────────────────────────────────────
export const reportsApi = {
  getScores: (days?: number) => api.get('/reports/scores', { params: { days } }),
  getTimeMachine: () => api.get('/reports/time-machine'),
  getWeeklyInsight: () => api.get('/reports/weekly-insight'),
  downloadPDF: () => api.get('/reports/pdf', { responseType: 'blob' }),
};

// ── Achievements ───────────────────────────────────────────────────────────
export const achievementsApi = {
  getAll: () => api.get('/achievements/'),
  markSeen: () => api.patch('/achievements/mark-seen'),
};

// ── Privacy/Export ─────────────────────────────────────────────────────────
export const privacyApi = {
  exportData: () => api.get('/my-data/export', { responseType: 'blob' }),
  togglePrivacyMode: () => api.post('/my-data/privacy-mode'),
  getCollectionInfo: () => api.get('/my-data/collection-info'),
  deleteAccount: () => api.delete('/my-data/account'),
};

// ── Billing ────────────────────────────────────────────────────────────────
export const billingApi = {
  createCheckout: () => api.post('/billing/checkout'),
};

export default api;
