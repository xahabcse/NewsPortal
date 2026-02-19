import { axiosInstance } from './axiosInstance';

export interface TodayStats {
    count: number;
    timestamp: string;
}

export const StatsService = {
    getTodayCount: async (): Promise<TodayStats> => {
        const response = await axiosInstance.get<TodayStats>('/news/stats/today');
        return response.data;
    }
};
