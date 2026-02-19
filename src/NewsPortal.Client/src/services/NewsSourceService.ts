import axios from 'axios';
import type {
    NewsSource,
    CreateNewsSourceDto,
    FetchJobResponse,
    FetchJobStatusResponse,
    NewsSourceTestResult,
    BulkNewsSourceActionRequest,
    BulkNewsSourceActionResult
} from '../types/NewsSource';
import { authStorage } from './AuthService';

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

const getAuthToken = (): string | null => {
    return authStorage.getToken();
};

const getAuthHeaders = () => {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
};

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
        const response = await axios.post<NewsSource>(`${API_URL}/newssources`, dto, { headers: getAuthHeaders() });
        return response.data;
    },

    update: async (id: number, dto: CreateNewsSourceDto): Promise<void> => {
        await axios.put(`${API_URL}/newssources/${id}`, dto, { headers: getAuthHeaders() });
    },

    delete: async (id: number): Promise<void> => {
        await axios.delete(`${API_URL}/newssources/${id}`, { headers: getAuthHeaders() });
    },

    fetchNow: async (id: number): Promise<FetchJobResponse> => {
        const response = await axios.post<FetchJobResponse>(
            `${API_URL}/newssources/${id}/fetch`,
            null,
            { headers: getAuthHeaders() });
        return response.data;
    },

    resume: async (id: number): Promise<void> => {
        await axios.post(`${API_URL}/newssources/${id}/resume`, null, { headers: getAuthHeaders() });
    },

    pause: async (id: number): Promise<void> => {
        await axios.post(`${API_URL}/newssources/${id}/pause`, null, { headers: getAuthHeaders() });
    },

    disable: async (id: number): Promise<void> => {
        await axios.post(`${API_URL}/newssources/${id}/disable`, null, { headers: getAuthHeaders() });
    },

    testSource: async (dto: CreateNewsSourceDto): Promise<NewsSourceTestResult> => {
        const response = await axios.post<NewsSourceTestResult>(
            `${API_URL}/newssources/test`,
            dto,
            { headers: getAuthHeaders() });
        return response.data;
    },

    bulkAction: async (request: BulkNewsSourceActionRequest): Promise<BulkNewsSourceActionResult> => {
        const response = await axios.post<BulkNewsSourceActionResult>(
            `${API_URL}/newssources/bulk-action`,
            request,
            { headers: getAuthHeaders() });
        return response.data;
    },

    getFetchJobStatus: async (jobId: string): Promise<FetchJobStatusResponse> => {
        const response = await axios.get<FetchJobStatusResponse>(
            `${API_URL}/fetchjobs/${jobId}`,
            { headers: getAuthHeaders() });
        return response.data;
    }
};
