import axios from 'axios';
import { getToken, clearToken } from './auth';

const api = axios.create({
    baseURL: '/api',
    headers: { 'Content-Type': 'application/json' },
});

// Attach token to every outgoing request
api.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Global error handler — force logout on 401
api.interceptors.response.use(
  res => res,
  err => {
    const isAuthEndpoint = err.config?.url?.includes('/auth/');
    if (err.response?.status === 401 && !isAuthEndpoint) {
      clearToken();
      sessionStorage.removeItem('chess_token');
      window.location.href = '/login';
    }
    return Promise.reject(err); // ← always reject so catch block fires
  }
);

export default api;


