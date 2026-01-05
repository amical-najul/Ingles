import { api } from './api';
import { User } from '../types';

interface LoginResponse {
    access_token: string;
    token_type: string;
}

export const authService = {
    /**
     * Login with email and password.
     * Returns the JWT token.
     */
    login: async (email: string, pass: string): Promise<LoginResponse> => {
        // OAuth2PasswordRequestForm expects form-urlencoded data with 'username' and 'password'
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', pass);

        const response = await api.post<LoginResponse>('/api/auth/login', formData, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        return response.data;
    },

    /**
     * Register a new user.
     */
    register: async (name: string, email: string, pass: string): Promise<User> => {
        const response = await api.post<User>('/api/auth/register', {
            email,
            password: pass,
            name
        });
        return response.data;
    },

    /**
     * Get current user profile using the stored token.
     */
    getMe: async (): Promise<User> => {
        const response = await api.get<User>('/api/auth/me');
        return response.data;
    },

    /**
     * Update user profile.
     */
    updateProfile: async (updates: { name?: string, photo_url?: string }): Promise<User> => {
        const response = await api.put<User>('/api/auth/me', updates);
        return response.data;
    },

    // --- ADMIN METHODS ---

    getAllUsers: async (): Promise<User[]> => {
        const response = await api.get<User[]>('/api/admin/users');
        return response.data;
    },

    adminCreateUser: async (userData: any): Promise<User> => {
        const response = await api.post<User>('/api/admin/users', userData);
        return response.data;
    },

    adminUpdateUser: async (userId: string, updates: any): Promise<User> => {
        const response = await api.put<User>(`/api/admin/users/${userId}`, updates);
        return response.data;
    },

    adminDeleteUser: async (userId: string): Promise<void> => {
        await api.delete(`/api/admin/users/${userId}`);
    }
};
