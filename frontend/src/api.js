import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '';

const api = axios.create({
    baseURL: API_BASE,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('vg_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Auth API
export const authAPI = {
    login: (patient_id, password) =>
        api.post('/auth/login', { patient_id, password }),
    register: (patient_id, password) =>
        api.post('/auth/register', { patient_id, password }),
};

// Vitals API
export const vitalsAPI = {
    add: (vitals) => api.post('/vitals/add', vitals),
    history: () => api.get('/vitals/history'),
};

// Prediction API
export const predictionAPI = {
    current: () => api.get('/prediction/current'),
};

// Patients API
export const patientsAPI = {
    profile: () => api.get('/patients/profile'),
    updateProfile: (data) => api.put('/patients/profile', data),
    list: () => api.get('/patients/list'),
};

// Devices API
export const devicesAPI = {
    list: () => api.get('/devices/list'),
    add: (data) => api.post('/devices/add', data),
    updateStatus: (id, data) => api.put(`/devices/${id}/status`, data),
    remove: (id) => api.delete(`/devices/${id}`),
};

// Events API
export const eventsAPI = {
    list: (limit = 50) => api.get(`/events/list?limit=${limit}`),
    recent: () => api.get('/events/recent'),
};

export default api;
