import axios from 'axios';
import { authStorage } from './AuthService';

const getApiUrl = () => {
    const envUrl = import.meta.env.VITE_API_URL as string | undefined;
    if (envUrl) {
        const normalized = envUrl.replace(/\/$/, '');
        return normalized.endsWith('/v1') ? normalized : `${normalized}/v1`;
    }
    if (import.meta.env.DEV) return 'http://localhost:5000/api/v1';
    return '/api/v1';
};

const API_URL = getApiUrl();

export interface User {
    id: number;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isActive: boolean;
    lastLoginAt: string | null;
    createdAt: string;
}

export interface CreateUserDto {
    username: string;
    email: string;
    password: string;
    role: string;
    isActive: boolean;
}

export interface UpdateUserDto {
    username: string;
    email: string;
    role: string;
    isActive: boolean;
}

const getAuthHeaders = () => {
    const session = authStorage.get();
    const token = session?.token;
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export const UserManagementService = {
    getAll: async (): Promise<User[]> => {
        const response = await axios.get<User[]>(`${API_URL}/usermanagement`, { headers: getAuthHeaders() });
        return response.data;
    },

    getById: async (id: number): Promise<User> => {
        const response = await axios.get<User>(`${API_URL}/usermanagement/${id}`, { headers: getAuthHeaders() });
        return response.data;
    },

    create: async (dto: CreateUserDto): Promise<User> => {
        const response = await axios.post<User>(`${API_URL}/usermanagement`, dto, { headers: getAuthHeaders() });
        return response.data;
    },

    update: async (id: number, dto: UpdateUserDto): Promise<User> => {
        const response = await axios.put<User>(`${API_URL}/usermanagement/${id}`, dto, { headers: getAuthHeaders() });
        return response.data;
    },

    delete: async (id: number): Promise<void> => {
        await axios.delete(`${API_URL}/usermanagement/${id}`, { headers: getAuthHeaders() });
    },

    resetPassword: async (id: number, newPassword: string): Promise<void> => {
        await axios.post(`${API_URL}/usermanagement/${id}/reset-password`, { newPassword }, { headers: getAuthHeaders() });
    }
};
