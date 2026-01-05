import { api } from './api';
import { WordEntry, User } from '../types';
import axios from 'axios';

export const apiService = {
    // ========== AUTH API METHODS (Backend Integration) ==========

    /**
     * Sync user with backend (Legacy/Unused potentially, keeping for compatibility if any)
     */
    syncUserWithBackend: async (): Promise<User> => {
        const response = await api.get('/api/auth/me');
        return response.data;
    },

    /**
     * Update user profile in backend.
     */
    updateUserProfile: async (updates: { displayName?: string, photoURL?: string }): Promise<User> => {
        const payload: any = {};
        if (updates.displayName) payload.name = updates.displayName;
        if (updates.photoURL) payload.photo_url = updates.photoURL;

        const response = await api.put('/api/auth/me', payload);
        return response.data;
    },

    /**
     * Upload user avatar.
     */
    uploadAvatar: async (file: File): Promise<User> => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await api.post<User>('/api/auth/me/avatar', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data; // Returns updated user with photo_url
    },

    /**
     * Delete user avatar.
     */
    deleteAvatar: async (): Promise<User> => {
        const response = await api.delete<User>('/api/auth/me/avatar');
        return response.data;
    },

    /**
     * Get user settings.
     */
    getSettings: async () => {
        const response = await api.get('/api/settings');
        return response.data;
    },

    /**
     * Update user settings.
     */
    updateSettings: async (settings: any) => {
        const response = await api.put('/api/settings', settings);
        return response.data;
    },

    // ========== CONTENT METHODS ==========

    previewLesson: async (
        topic: string,
        category: string,
        wordCount: number = 50,
        provider: string = 'gemini'
    ): Promise<WordEntry[]> => {
        const response = await api.post<WordEntry[]>('/api/lessons/preview', {
            topic,
            category,
            word_count: wordCount,
            provider
        });
        return response.data;
    },

    saveLesson: async (
        dayId: number,
        content: WordEntry[],
        topic: string,
        category: string,
        skipBackgroundAudio: boolean = false
    ) => {
        const url = `/api/lessons/${dayId}${skipBackgroundAudio ? '?generate_audio=false' : ''}`;
        const response = await api.put(url, {
            content,
            topic,
            category
        });
        return response.data;
    },

    generateAudioSingle: async (
        word: string,
        category: string,
        level: number
    ) => {
        const response = await api.post('/api/lessons/generate-audio-single', {
            word,
            category,
            level,
            lang: 'en-US'
        });
        return response.data;
    },

    isAuthenticated: () => {
        return !!api.defaults.headers.common['Authorization'];
    },

    getLesson: async (dayId: number) => {
        try {
            const response = await api.get(`/api/lessons/${dayId}`);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 404) {
                return null;
            }
            throw error;
        }
    },

    getLessonSection: async (dayId: number, sectionId: number) => {
        try {
            const response = await api.get(`/api/lessons/${dayId}/section/${sectionId}`);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 404) {
                return null;
            }
            throw error;
        }
    },

    getTTSUrl: async (text: string, lang: string = 'en-US'): Promise<string> => {
        try {
            const response = await api.post('/api/tts/speak', {
                text,
                language: lang,
                provider: 'browser'
            });
            return response.data.url;
        } catch (error) {
            console.error('Error getting TTS:', error);
            return `BROWSER_TTS::${text}::${lang}`;
        }
    },

    // ========== ADMIN USER MANAGEMENT API ==========
    // Note: These overlap with authService generic admin methods, but keeping for compatibility

    adminGetAllUsers: async () => {
        const response = await api.get('/api/admin/users');
        return response.data;
    },

    adminCreateUser: async (userData: any) => {
        const response = await api.post('/api/admin/users', userData);
        return response.data;
    },

    adminUpdateUser: async (userId: string, updates: any) => {
        const response = await api.put(`/api/admin/users/${userId}`, updates);
        return response.data;
    },

    adminDeleteUser: async (userId: string) => {
        await api.delete(`/api/admin/users/${userId}`);
        return true;
    },

    // ========== DIAGNOSTICS API (System Check) ==========

    /**
     * Start a new diagnostic run (auto-cleans previous data).
     */
    diagnosticsStart: async (): Promise<{ run_id: string; words: any[]; topic: string }> => {
        const response = await api.post('/api/diagnostics/start');
        return response.data;
    },

    /**
     * Generate audio for a single diagnostic word.
     */
    diagnosticsGenerateAudio: async (runId: string, word: string) => {
        const response = await api.post(`/api/diagnostics/${runId}/audio`, { word });
        return response.data;
    },

    /**
     * Get all words for a diagnostic run.
     */
    diagnosticsGetRun: async (runId: string) => {
        const response = await api.get(`/api/diagnostics/${runId}`);
        return response.data;
    },

    /**
     * Get audio URL for a diagnostic word.
     */
    diagnosticsGetAudioUrl: async (runId: string, word: string): Promise<{ url: string; fallback: boolean }> => {
        const response = await api.get(`/api/diagnostics/${runId}/audio/${encodeURIComponent(word)}/url`);
        return response.data;
    },

    /**
     * Cleanup all diagnostic data.
     */
    diagnosticsCleanup: async () => {
        const response = await api.delete('/api/diagnostics/cleanup');
        return response.data;
    },

    // ========== STAGES & PROGRESS API ==========

    getStages: async () => {
        const response = await api.get('/api/stages');
        return response.data;
    },

    getAllProgress: async () => {
        try {
            const response = await api.get('/api/progress/');
            return response.data;
        } catch (error) {
            return [];
        }
    },

    getProgress: async (dayId: number) => {
        try {
            const response = await api.get(`/api/progress/${dayId}`);
            return response.data;
        } catch (error) {
            return null;
        }
    },

    updateProgress: async (dayId: number, currentIndex: number, completed: number = 0, score: number = 0) => {
        const response = await api.post('/api/progress', {
            day_id: dayId,
            current_index: currentIndex,
            completed,
            score
        });
        return response.data;
    }
};
