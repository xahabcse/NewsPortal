import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';

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
        // Get token from auth storage
        const authRaw = localStorage.getItem('newsportal_auth');
        let token: string | null = null;
        if (authRaw) {
            try {
                const auth = JSON.parse(authRaw);
                token = auth.token || null;
            } catch {
                token = null;
            }
        }
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
        // Don't show toast for 401 (handled by redirect)
        if (error.response?.status === 401) {
            localStorage.removeItem('authToken');
            window.location.reload();
            return Promise.reject(error);
        }

        // Show error toast for other errors
        const message = (error.response?.data as { message?: string })?.message ||
                       error.message ||
                       'An unexpected error occurred';

        toast.error(message);

        return Promise.reject(error);
    }
);

export default axiosInstance;
