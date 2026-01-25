export interface NewsSource {
    id: number;
    name: string;
    slug: string;
    baseUrl: string;
    logoUrl?: string;
    fetchMethod: number; // 0: Rss, 1: Api, 2: Scrape
    rssFeedUrl?: string;
    apiEndpoint?: string;
    apiKey?: string;
    fetchIntervalMinutes: number;
    isActive: boolean;
    lastFetchedAt?: string;
    articleCount?: number;
}

export interface CreateNewsSourceDto {
    name: string;
    baseUrl: string;
    logoUrl?: string;
    fetchMethod: number;
    rssFeedUrl?: string;
    apiEndpoint?: string;
    apiKey?: string;
    fetchIntervalMinutes: number;
}
