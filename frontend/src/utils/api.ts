import axios from 'axios';

// Fallback to local development API URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Automatically inject JWT token into all request headers
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('wqsolar_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Gracefully handle token expiration / auth errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('wqsolar_token');
        localStorage.removeItem('wqsolar_user');
        // Do not redirect inside the interceptor to prevent loop during login validation, but trigger a clean refresh or let UI handle it.
      }
    }
    return Promise.reject(error);
  }
);

export default api;
