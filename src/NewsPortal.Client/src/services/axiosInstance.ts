import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

const getApiBaseUrl = () => {
    const envUrl = import.meta.env.VITE_API_URL as string | undefined;
    if (envUrl) {
        const normalized = envUrl.replace(/\/$/, '');
        return normalized.endsWith('/v1') ? normalized : `${normalized}/v1`;
    }

    if (import.meta.env.DEV) {
        return 'http://localhost:5000/api/v1';
    }

    return '/api/v1';
};

const API_BASE_URL = getApiBaseUrl();

export const axiosInstance: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth header
axiosInstance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem('authToken');
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for global error handling
axiosInstance.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        if (error.response?.status === 401) {
            // Unauthorized - clear auth and redirect to login
            localStorage.removeItem('authToken');
            window.location.reload();
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;
