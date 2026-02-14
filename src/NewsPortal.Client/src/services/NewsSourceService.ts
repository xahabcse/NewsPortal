import axios from 'axios';
import type { NewsSource, CreateNewsSourceDto } from '../types/NewsSource';

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
export const NEWS_SOURCE_API_URL = API_URL;

export const NewsSourceService = {
    getAll: async (): Promise<NewsSource[]> => {
        const response = await axios.get<NewsSource[]>(`${API_URL}/newssources`);
        return response.data;
    },

    getBySlug: async (slug: string): Promise<NewsSource> => {
        const response = await axios.get<NewsSource>(`${API_URL}/newssources/${slug}`);
        return response.data;
    },

    create: async (dto: CreateNewsSourceDto): Promise<NewsSource> => {
        const response = await axios.post<NewsSource>(`${API_URL}/newssources`, dto);
        return response.data;
    },

    update: async (id: number, dto: CreateNewsSourceDto): Promise<void> => {
        await axios.put(`${API_URL}/newssources/${id}`, dto);
    },

    delete: async (id: number): Promise<void> => {
        await axios.delete(`${API_URL}/newssources/${id}`);
    }
};
