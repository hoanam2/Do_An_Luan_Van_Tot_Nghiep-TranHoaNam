import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('smartstay_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && localStorage.getItem('smartstay_token')) {
      const path = window.location.pathname;
      if (path !== '/login' && path !== '/register') {
        localStorage.removeItem('smartstay_token');
        localStorage.removeItem('smartstay_user');
      }
    }
    return Promise.reject(error);
  }
);

export const getErrorMessage = (err, fallback = 'Đã xảy ra lỗi, vui lòng thử lại.') =>
  err?.response?.data?.message || err?.message || fallback;

export default apiClient;
