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

export interface NewsArticle {
    id: number;
    title: string;
    slug: string;
    summary: string | null;
    thumbnailUrl: string | null;
    sourceUrl: string | null;
    publishedAt: string;
    sourceName: string;
    categoryName: string | null;
}

export interface PagedResult<T> {
    items: T[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
}

export interface Category {
    id: number;
    name: string;
    nameBn?: string;
    slug: string;
    description?: string;
    icon?: string;
    color?: string;
    articleCount?: number;
}

export const newsApi = {
    getLatestNews: async (page = 1, pageSize = 10): Promise<PagedResult<NewsArticle>> => {
        const response = await fetch(`${API_BASE_URL}/news/latest?page=${page}&pageSize=${pageSize}`);
        if (!response.ok) {
            const body = await response.text().catch(() => 'No body');
            throw new Error(`Failed to fetch latest news. Status: ${response.status} ${response.statusText}. Body: ${body}`);
        }
        return response.json();
    },

    getFeaturedNews: async (count = 5): Promise<NewsArticle[]> => {
        const response = await fetch(`${API_BASE_URL}/news/featured?count=${count}`);
        if (!response.ok) {
            const body = await response.text().catch(() => 'No body');
            throw new Error(`Failed to fetch featured news. Status: ${response.status} ${response.statusText}. Body: ${body}`);
        }
        return response.json();
    },

    getNewsByCategory: async (slug: string, page = 1, pageSize = 10): Promise<PagedResult<NewsArticle>> => {
        const response = await fetch(`${API_BASE_URL}/news/category/${slug}?page=${page}&pageSize=${pageSize}`);
        if (!response.ok) {
            const body = await response.text().catch(() => 'No body');
            throw new Error(`Failed to fetch category news. Status: ${response.status} ${response.statusText}. Body: ${body}`);
        }
        return response.json();
    },

    getNewsBySource: async (slug: string, page = 1, pageSize = 10): Promise<PagedResult<NewsArticle>> => {
        const response = await fetch(`${API_BASE_URL}/news/source/${slug}?page=${page}&pageSize=${pageSize}`);
        if (!response.ok) {
            const body = await response.text().catch(() => 'No body');
            throw new Error(`Failed to fetch source news. Status: ${response.status} ${response.statusText}. Body: ${body}`);
        }
        return response.json();
    },

    getCategories: async (): Promise<Category[]> => {
        const response = await fetch(`${API_BASE_URL}/news/categories`);
        if (!response.ok) {
            const body = await response.text().catch(() => 'No body');
            throw new Error(`Failed to fetch categories. Status: ${response.status} ${response.statusText}. Body: ${body}`);
        }
        return response.json();
    }
};


