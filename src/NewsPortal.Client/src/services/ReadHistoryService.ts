import { axiosInstance } from './axiosInstance';

export interface ReadHistoryItem {
    id: number;
    articleId: number;
    userId: number;
    createdAt: string;
    article: {
        id: number;
        title: string;
        slug: string;
        summary: string | null;
        thumbnailUrl: string | null;
        publishedAt: string;
        sourceName: string;
        categoryName: string | null;
    };
}

export interface ReadHistoryResponse {
    items: ReadHistoryItem[];
    totalCount: number;
}

export const ReadHistoryService = {
    getReadingHistory: async (limit = 50): Promise<ReadHistoryResponse> => {
        const response = await axiosInstance.get<ReadHistoryResponse>(
            `/readhistory?limit=${limit}`
        );
        return response.data;
    },

    recordRead: async (articleId: number): Promise<{ message: string; articleId: number }> => {
        const response = await axiosInstance.post(`/readhistory/${articleId}`);
        return response.data;
    },

    checkReadHistory: async (articleId: number): Promise<{ hasRead: boolean; articleId: number }> => {
        const response = await axiosInstance.get(`/readhistory/${articleId}/check`);
        return response.data;
    }
};
