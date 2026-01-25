const API_BASE_URL = '/api';

export interface NewsArticle {
    id: number;
    title: string;
    slug: string;
    summary: string;
    thumbnailUrl: string;
    publishedAt: string;
    sourceName: string;
    categoryName: string;
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

export interface LogEntry {
    timestamp: string;
    level: string;
    message: string;
    exception?: string;
    source: string;
}

export interface LogStats {
    totalLogs: number;
    errorCount: number;
    warningCount: number;
    infoCount: number;
    lastUpdated: string;
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

export const logsApi = {
    getLogs: async (
        page = 1,
        pageSize = 50,
        level?: string,
        search?: string,
        date?: string
    ): Promise<PagedResult<LogEntry>> => {
        const params = new URLSearchParams({
            page: page.toString(),
            pageSize: pageSize.toString(),
        });

        if (level) params.append('level', level);
        if (search) params.append('search', search);
        if (date) params.append('date', date);

        const response = await fetch(`${API_BASE_URL}/logs?${params}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch logs: ${response.statusText}`);
        }
        return response.json();
    },

    getLogStats: async (): Promise<LogStats> => {
        const response = await fetch(`${API_BASE_URL}/logs/stats`);
        if (!response.ok) {
            throw new Error(`Failed to fetch log stats: ${response.statusText}`);
        }
        return response.json();
    }
};
