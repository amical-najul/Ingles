import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService } from '../services/authService';
import { User } from '../types';

interface AuthContextType {
    user: User | null; // Unified User type (no more FirebaseUser)
    loading: boolean;
    login: (email: string, pass: string) => Promise<void>;
    register: (name: string, email: string, pass: string) => Promise<void>;
    logout: () => void;
    googleLogin: () => Promise<void>; // Disabled/Not Implemented
    resetPassword: (email: string) => Promise<void>; // Placeholder
    updateProfile: (updates: { name?: string, photo_url?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const initAuth = async () => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const me = await authService.getMe();
                setUser(me);
            } catch (error) {
                console.error("Failed to fetch user with token", error);
                localStorage.removeItem('token');
                setUser(null);
            }
        }
        setLoading(false);
    };

    useEffect(() => {
        initAuth();
    }, []);

    const login = async (email: string, pass: string) => {
        setLoading(true);
        try {
            const { access_token } = await authService.login(email, pass);
            localStorage.setItem('token', access_token);
            const me = await authService.getMe();
            setUser(me);
        } catch (error) {
            console.error("Login failed", error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const register = async (name: string, email: string, pass: string) => {
        setLoading(true);
        try {
            await authService.register(name, email, pass);
            // Auto-login after register? Or just convert to login flow.
            // Requirement said "Modificar formularios...".
            // Let's implement auto-login for better UX.
            await login(email, pass);
        } catch (error) {
            console.error("Registration failed", error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    const googleLogin = async () => {
        alert("Google Login not implemented in Self-Hosted version yet.");
    };

    const resetPassword = async (email: string) => {
        alert("Password reset not implemented in Self-Hosted version yet.");
    };

    const updateProfile = async (updates: { name?: string, photo_url?: string }) => {
        try {
            const updatedUser = await authService.updateProfile(updates);
            setUser(updatedUser);
        } catch (error) {
            console.error("Update profile failed", error);
            throw error;
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            login,
            register,
            logout,
            googleLogin,
            resetPassword,
            updateProfile
        }}>
            {children}
        </AuthContext.Provider>
    );
};
