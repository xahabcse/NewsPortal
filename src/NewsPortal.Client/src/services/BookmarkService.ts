import { axiosInstance } from './axiosInstance';

export interface BookmarkArticle {
    id: number;
    title: string;
    slug: string;
    summary: string | null;
    thumbnailUrl: string | null;
    publishedAt: string;
    sourceName: string;
    categoryName: string | null;
}

export interface Bookmark {
    id: number;
    articleId: number;
    userId: number;
    createdAt: string;
    article: BookmarkArticle;
}

export interface PagedBookmarkResult {
    items: Bookmark[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
}

export const BookmarkService = {
    getBookmarks: async (page = 1, pageSize = 12): Promise<PagedBookmarkResult> => {
        const response = await axiosInstance.get<PagedBookmarkResult>(
            `/bookmarks?page=${page}&pageSize=${pageSize}`
        );
        return response.data;
    },

    addBookmark: async (articleId: number): Promise<{ message: string; bookmarkId: number; articleId: number }> => {
        const response = await axiosInstance.post(`/bookmarks/${articleId}`);
        return response.data;
    },

    removeBookmark: async (articleId: number): Promise<{ message: string; articleId: number }> => {
        const response = await axiosInstance.delete(`/bookmarks/${articleId}`);
        return response.data;
    },

    checkBookmark: async (articleId: number): Promise<{ isBookmarked: boolean; articleId: number }> => {
        const response = await axiosInstance.get(`/bookmarks/${articleId}/check`);
        return response.data;
    }
};
