import { axiosInstance } from './axiosInstance';

export interface Category {
    id: number;
    name: string;
    nameBn?: string;
    slug: string;
    description?: string;
    icon?: string;
    color?: string;
    articleCount?: number;
    sortOrder?: number;
}

export interface CreateCategoryDto {
    name: string;
    nameBn?: string;
    slug?: string;
    description?: string;
    icon?: string;
    color?: string;
    sortOrder?: number;
}

export const CategoryService = {
    getAll: async (): Promise<Category[]> => {
        const response = await axiosInstance.get<Category[]>('/news/categories');
        return response.data;
    },

    getById: async (id: number): Promise<Category> => {
        const response = await axiosInstance.get<Category>(`/categories/${id}`);
        return response.data;
    },

    create: async (dto: CreateCategoryDto): Promise<Category> => {
        const response = await axiosInstance.post<Category>('/categories', dto);
        return response.data;
    },

    update: async (id: number, dto: CreateCategoryDto): Promise<void> => {
        await axiosInstance.put(`/categories/${id}`, dto);
    },

    delete: async (id: number): Promise<void> => {
        await axiosInstance.delete(`/categories/${id}`);
    }
};
