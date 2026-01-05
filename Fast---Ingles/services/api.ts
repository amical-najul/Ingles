import axios from 'axios';

// In Docker/production: Use empty string - nginx proxies /api/* to backend
// In development (npm run dev): Use localhost:8000 directly
const API_URL = import.meta.env.VITE_API_URL || "";

export const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor: Add JWT Token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 (Unauthorized)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('token');
            // Optional: Redirect to login or dispatch event
            // window.location.href = '/login'; 
        }
        return Promise.reject(error);
    }
);
