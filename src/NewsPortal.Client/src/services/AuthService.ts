import axios from 'axios';

const getApiUrl = () => {
    const envUrl = import.meta.env.VITE_API_URL as string | undefined;
    if (envUrl) {
        const normalized = envUrl.replace(/\/$/, '');
        return normalized.endsWith('/v1') ? normalized : `${normalized}/v1`;
    }

    if (import.meta.env.DEV) return 'http://localhost:5000/api/v1';
    return `${window.location.protocol}//${window.location.hostname}:5000/api/v1`;
};

const API_URL = getApiUrl();

export const AUTH_STORAGE_KEY = 'newsportal_auth';

export interface AuthSession {
    token: string;
    username: string;
    email: string;
    role: string;
    expiresAt: string;
}

interface LoginRequest {
    username: string;
    password: string;
}

export const AuthService = {
    login: async (request: LoginRequest): Promise<AuthSession> => {
        const response = await axios.post<AuthSession>(`${API_URL}/auth/login`, request);
        return response.data;
    },

    validateToken: async (token: string): Promise<boolean> => {
        try {
            await axios.get(`${API_URL}/auth/validate`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return true;
        } catch {
            return false;
        }
    }
};

export const authStorage = {
    get(): AuthSession | null {
        const raw = localStorage.getItem(AUTH_STORAGE_KEY);
        if (!raw) return null;

        try {
            return JSON.parse(raw) as AuthSession;
        } catch {
            localStorage.removeItem(AUTH_STORAGE_KEY);
            return null;
        }
    },

    set(session: AuthSession): void {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    },

    clear(): void {
        localStorage.removeItem(AUTH_STORAGE_KEY);
    },

    getToken(): string | null {
        const session = this.get();
        if (session?.token) return session.token;

        const tokenKeys = ['authToken', 'token', 'jwtToken', 'accessToken'];
        for (const key of tokenKeys) {
            const value = localStorage.getItem(key);
            if (value) return value;
        }

        return null;
    }
};

