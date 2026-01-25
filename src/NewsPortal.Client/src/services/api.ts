const API_BASE_URL = '/api';

export interface NewsArticle {
    id: number;
    title: string;
    slug: string;
    summary: string | null;
    thumbnailUrl: string | null;
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
    }
};


