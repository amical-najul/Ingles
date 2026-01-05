import { api } from './api';

export interface AIConfig {
    id: number;
    provider: string;
    api_key: string | null;
    model: string;
    is_active: boolean;
    created_at: string;
    updated_at: string | null;
}

export interface AIConfigUpdate {
    api_key?: string;
    model?: string;
    is_active?: boolean;
}

export const adminService = {
    getAIConfigs: async (): Promise<AIConfig[]> => {
        const response = await api.get('/api/admin/ai-config');
        return response.data;
    },

    updateAIConfig: async (provider: string, data: AIConfigUpdate): Promise<AIConfig> => {
        const response = await api.put(`/api/admin/ai-config/${provider}`, data);
        return response.data;
    },

    // --- User Management ---
    getAllUsers: async (): Promise<any[]> => {
        const response = await api.get('/api/admin/users');
        return response.data;
    },

    createUser: async (userData: any): Promise<any> => {
        const response = await api.post('/api/admin/users', userData);
        return response.data;
    },

    updateUser: async (userId: string, userData: any): Promise<any> => {
        const response = await api.put(`/api/admin/users/${userId}`, userData);
        return response.data;
    },

    deleteUser: async (userId: string): Promise<void> => {
        await api.delete(`/api/admin/users/${userId}`);
    }
};
