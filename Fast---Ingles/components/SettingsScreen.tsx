import React, { useState, useEffect } from 'react';
import { User, UserPreferences } from '../types';
import { Button } from './ui/Button';
import { authService } from '../services/authService';
import { storageService } from '../services/storageService';
import { apiService } from '../services/apiService';
import { useAuth } from '../contexts/AuthContext';

interface SettingsScreenProps {
    user: User;
    darkMode: boolean;
    onBack: () => void;
    onUpdateUser: (user: User) => void;
    onToggleDarkMode: (isDark: boolean) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ user, darkMode, onBack, onUpdateUser, onToggleDarkMode }) => {
    const { logout } = useAuth();
    const [activeTab, setActiveTab] = useState<'profile' | 'appearance' | 'audio' | 'study'>('profile');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    // Profile Form
    const [name, setName] = useState(user.name);
    const [email, setEmail] = useState(user.email);
    const [password, setPassword] = useState('');
    const [photoUrl, setPhotoUrl] = useState(user.photo_url || '');

    // Reset Confirmation State
    const [resetConfirm, setResetConfirm] = useState(false);

    // Password visibility
    const [showPassword, setShowPassword] = useState(false);

    // Preferences
    const [prefs, setPrefs] = useState<UserPreferences>(storageService.getPreferences()); // Initial state from local, then fetch DB
    const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

    useEffect(() => {
        // Load settings from DB
        const loadSettings = async () => {
            try {
                const dbSettings = await apiService.getSettings();
                if (dbSettings) {
                    setPrefs(prev => ({
                        ...prev,
                        preferredVoiceURI: dbSettings.preferred_voice_uri || prev.preferredVoiceURI,
                        speechRate: dbSettings.speech_rate || prev.speechRate,
                        verbRepetitions: dbSettings.verb_repetitions || prev.verbRepetitions,
                        visualizationSeconds: dbSettings.visualization_seconds || prev.visualizationSeconds,
                    }));
                    // NOTE: Do NOT auto-change dark mode here - user controls it locally
                }
            } catch (error) {
                console.error("Error loading settings:", error);
            }
        };
        loadSettings();

        // Load voices
        const loadVoices = () => {
            const voices = window.speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'));
            setAvailableVoices(voices);
        };
        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }, []);

    const saveSettingsToDB = async (newPrefs: UserPreferences) => {
        try {
            await apiService.updateSettings({
                theme: darkMode ? 'dark' : 'light',
                preferred_voice_uri: newPrefs.preferredVoiceURI,
                speech_rate: newPrefs.speechRate,
                verb_repetitions: newPrefs.verbRepetitions,
                visualization_seconds: newPrefs.visualizationSeconds
            });
        } catch (error) {
            console.error("Error saving settings:", error);
        }
    };


    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setLoading(true);
            try {
                // Upload to API
                const updatedUser = await apiService.uploadAvatar(file);
                onUpdateUser(updatedUser);
                setPhotoUrl(updatedUser.photo_url || ''); // Update local preview
                setMessage("Foto actualizada correctamente.");
            } catch (error: any) {
                console.error("Upload error:", error);
                setMessage("Error al subir imagen.");
            } finally {
                setLoading(false);
            }
        }
    };

    // Keep handleSaveProfile for name/email updates
    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        try {
            const updates: any = { displayName: name }; // Cleaned up interface

            const updatedUser = await apiService.updateUserProfile(updates);
            onUpdateUser(updatedUser);
            setMessage("Perfil actualizado correctamente.");
        } catch (err: any) {
            setMessage(err.message || "Error al actualizar perfil.");
        } finally {
            setLoading(false);
        }
    };

    const handleVoiceChange = (uri: string) => {
        const newPrefs = { ...prefs, preferredVoiceURI: uri };
        setPrefs(newPrefs);
        storageService.savePreferences(newPrefs);
        // saveSettingsToDB(newPrefs); // Manual save only
    };

    const handleVisualizationTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value);
        const newPrefs = { ...prefs, visualizationSeconds: val };
        setPrefs(newPrefs);
        storageService.savePreferences(newPrefs);
        // saveSettingsToDB(newPrefs); // Manual save only
    };

    const handleSpeechRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        const newPrefs = { ...prefs, speechRate: val };
        setPrefs(newPrefs);
        storageService.savePreferences(newPrefs);
        // saveSettingsToDB(newPrefs); // Manual save only
    };

    const handleVerbRepetitionsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value);
        const newPrefs = { ...prefs, verbRepetitions: val };
        setPrefs(newPrefs);
        storageService.savePreferences(newPrefs);
        // saveSettingsToDB(newPrefs); // Manual save only
    };

    const handleManualSaveSettings = async () => {
        setLoading(true);
        try {
            await saveSettingsToDB(prefs);
            setMessage("Configuración guardada correctamente.");
            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
            setMessage("Error al guardar configuración.");
        } finally {
            setLoading(false);
        }
    };

    const handleResetClick = async () => {
        if (resetConfirm) {
            storageService.clearAllData();
            await logout();
            window.location.reload();
        } else {
            setResetConfirm(true);
            setTimeout(() => setResetConfirm(false), 3000); // Reset confirmation state after 3 seconds
        }
    };

    const textPrimary = darkMode ? "text-slate-100" : "text-slate-900";
    const textSecondary = darkMode ? "text-slate-400" : "text-slate-500";
    const bgCard = darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200 shadow-sm";
    const inputBg = darkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-50 border-slate-300 text-slate-900";

    return (
        <div className={`min-h-screen flex flex-col ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
            {/* Header */}
            <div className={`p-6 flex items-center gap-4 ${darkMode ? 'bg-slate-800/50' : 'bg-white border-b border-slate-200'}`}>
                <button onClick={onBack} className={`p-2 rounded-full border ${darkMode ? 'bg-slate-800 text-slate-400 hover:text-white border-slate-700' : 'bg-slate-100 text-slate-500 hover:text-slate-900 border-slate-200'}`}>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </button>
                <h1 className={`text-xl font-bold ${textPrimary}`}>Configuración</h1>
            </div>

            {/* Tabs */}
            <div className={`flex border-b overflow-x-auto ${darkMode ? 'border-slate-700' : 'border-slate-200 bg-white'}`}>
                <button onClick={() => { setActiveTab('profile'); setMessage(null); }} className={`flex-1 py-4 px-2 text-sm font-bold whitespace-nowrap transition-colors relative ${activeTab === 'profile' ? 'text-emerald-500' : textSecondary}`}>
                    Perfil
                    {activeTab === 'profile' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-500"></div>}
                </button>
                <button onClick={() => { setActiveTab('study'); setMessage(null); }} className={`flex-1 py-4 px-2 text-sm font-bold whitespace-nowrap transition-colors relative ${activeTab === 'study' ? 'text-emerald-500' : textSecondary}`}>
                    Estudio
                    {activeTab === 'study' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-500"></div>}
                </button>
                <button onClick={() => { setActiveTab('appearance'); setMessage(null); }} className={`flex-1 py-4 px-2 text-sm font-bold whitespace-nowrap transition-colors relative ${activeTab === 'appearance' ? 'text-emerald-500' : textSecondary}`}>
                    Apariencia
                    {activeTab === 'appearance' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-500"></div>}
                </button>
                <button onClick={() => { setActiveTab('audio'); setMessage(null); }} className={`flex-1 py-4 px-2 text-sm font-bold whitespace-nowrap transition-colors relative ${activeTab === 'audio' ? 'text-emerald-500' : textSecondary}`}>
                    Voz
                    {activeTab === 'audio' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-500"></div>}
                </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">

                {/* PROFILE TAB */}
                {activeTab === 'profile' && (
                    <form onSubmit={handleSaveProfile} className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex flex-col items-center gap-4">
                            <div className="relative w-24 h-24">
                                {user.photo_url ? (
                                    <img src={user.photo_url} alt="Profile" className="w-full h-full rounded-full object-cover border-4 border-slate-700" />
                                ) : (
                                    <div className={`w-full h-full rounded-full flex items-center justify-center border-4 ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-400' : 'bg-slate-200 border-slate-300 text-slate-400'}`}>
                                        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                    </div>
                                )}
                                <label className="absolute bottom-0 right-0 bg-emerald-600 p-2 rounded-full text-white cursor-pointer hover:bg-emerald-500 shadow-lg">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                                </label>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nombre</label>
                                <input type="text" value={name} onChange={e => setName(e.target.value)} className={`w-full rounded-xl px-4 py-3 focus:border-emerald-500 focus:outline-none ${inputBg}`} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Email</label>
                                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={`w-full rounded-xl px-4 py-3 focus:border-emerald-500 focus:outline-none ${inputBg}`} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nueva Contraseña (Opcional)</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder="••••••"
                                        className={`w-full rounded-xl px-4 py-3 pr-12 focus:border-emerald-500 focus:outline-none ${inputBg}`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        tabIndex={-1}
                                    >
                                        {showPassword ? (
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {message && (
                            <div className={`p-3 rounded-lg text-sm text-center border ${message.includes('Error') || message.includes('insuficiente') ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'}`}>
                                {message}
                            </div>
                        )}

                        <Button type="submit" fullWidth disabled={loading}>
                            {loading ? 'Guardando...' : 'Guardar Cambios'}
                        </Button>
                    </form>
                )}

                {/* STUDY TAB */}
                {activeTab === 'study' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">

                        {/* Verb Repetitions */}
                        <div className={`p-6 rounded-2xl border ${bgCard}`}>
                            <h3 className="text-emerald-500 text-sm font-bold uppercase mb-4">Repeticiones del Verbo</h3>
                            <p className={`${textSecondary} text-sm mb-6`}>
                                Define cuántas veces quieres escuchar el verbo en inglés al inicio de cada secuencia.
                            </p>

                            <div className="flex items-center justify-between mb-4">
                                <span className={`text-2xl font-bold ${textPrimary}`}>{prefs.verbRepetitions || 1}x</span>
                            </div>

                            <input
                                type="range"
                                min="1"
                                max="5"
                                step="1"
                                value={prefs.verbRepetitions || 1}
                                onChange={handleVerbRepetitionsChange}
                                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            />
                            <div className="flex justify-between mt-2 text-xs text-slate-500 font-mono">
                                <span>1 (Estándar)</span>
                                <span>5 (Intensivo)</span>
                            </div>
                        </div>

                        {/* Visualization Time */}
                        <div className={`p-6 rounded-2xl border ${bgCard}`}>
                            <h3 className="text-emerald-500 text-sm font-bold uppercase mb-4">Temporizador de Visualización</h3>
                            <p className={`${textSecondary} text-sm mb-6`}>
                                Ajusta el tiempo de espera entre cada verbo para visualizar la asociación mental.
                            </p>

                            <div className="flex items-center justify-between mb-4">
                                <span className={`text-2xl font-bold ${textPrimary}`}>{prefs.visualizationSeconds}s</span>
                                <span className="text-xs text-slate-500">Recomendado: 20s</span>
                            </div>

                            <input
                                type="range"
                                min="3"
                                max="90"
                                step="1"
                                value={prefs.visualizationSeconds}
                                onChange={handleVisualizationTimeChange}
                                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            />
                            <div className="flex justify-between mt-2 text-xs text-slate-500 font-mono">
                                <span>3s (Rápido)</span>
                                <span>90s (Profundo)</span>
                            </div>
                        </div>

                        {message && (
                            <div className={`p-3 rounded-lg text-sm text-center border ${message.includes('Error') ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'}`}>
                                {message}
                            </div>
                        )}

                        <Button onClick={handleManualSaveSettings} fullWidth disabled={loading}>
                            {loading ? 'Guardando...' : 'Guardar Configuración'}
                        </Button>

                        <div className="border-t border-slate-700 pt-8">
                            <h3 className="text-red-400 text-sm font-bold uppercase mb-4">Zona de Peligro</h3>
                            <div className="bg-red-500/10 p-6 rounded-2xl border border-red-500/20">
                                <p className="text-red-400 dark:text-red-200 text-sm mb-4">
                                    Si tienes problemas con las lecciones o quieres empezar de cero, puedes borrar el caché local.
                                </p>
                                <Button
                                    variant="danger"
                                    fullWidth
                                    onClick={handleResetClick}
                                    className={resetConfirm ? "bg-red-600 animate-pulse font-bold" : ""}
                                >
                                    {resetConfirm ? "⚠️ ¿Estás seguro? Clic para confirmar" : "Resetear Datos Locales"}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* APPEARANCE TAB */}
                {activeTab === 'appearance' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                        <div className={`p-6 rounded-2xl border ${bgCard}`}>
                            <h3 className="text-emerald-500 text-sm font-bold uppercase mb-4">Modo de Visualización</h3>

                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className={`font-bold ${textPrimary}`}>Modo Oscuro</h4>
                                    <p className={`text-sm ${textSecondary}`}>Reduce la fatiga visual</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={darkMode}
                                        onChange={(e) => onToggleDarkMode(e.target.checked)}
                                    />
                                    <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-600"></div>
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {/* AUDIO TAB */}
                {activeTab === 'audio' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">

                        {/* Speech Rate Control */}
                        <div className={`p-6 rounded-2xl border ${bgCard}`}>
                            <h3 className="text-emerald-500 text-sm font-bold uppercase mb-4">Velocidad de Lectura</h3>
                            <p className={`${textSecondary} text-sm mb-6`}>
                                Controla qué tan rápido lee el asistente los ejemplos en inglés.
                            </p>

                            <div className="flex items-center justify-between mb-4">
                                <span className={`text-2xl font-bold ${textPrimary}`}>{prefs.speechRate || 0.9}x</span>
                            </div>

                            <input
                                type="range"
                                min="0.75"
                                max="1.5"
                                step="0.05"
                                value={prefs.speechRate || 0.9}
                                onChange={handleSpeechRateChange}
                                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            />
                            <div className="flex justify-between mt-2 text-xs text-slate-500 font-mono">
                                <span>0.75x (Lento)</span>
                                <span>1.5x (Rápido)</span>
                            </div>
                        </div>

                        {/* Voice Selection */}
                        <div className="space-y-4">
                            <h3 className="text-slate-400 text-sm font-bold uppercase">Voz de Lectura (Inglés)</h3>
                            <div className="space-y-2">
                                {availableVoices.length === 0 && <p className="text-slate-500 text-sm">Cargando voces...</p>}
                                {availableVoices.map((voice) => (
                                    <button
                                        key={voice.voiceURI}
                                        onClick={() => handleVoiceChange(voice.voiceURI)}
                                        className={`w-full p-4 rounded-xl text-left border-2 transition-all ${prefs.preferredVoiceURI === voice.voiceURI
                                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                            : `${bgCard} hover:border-emerald-300`
                                            }`}
                                    >
                                        <div className={`font-bold text-sm ${textPrimary}`}>{voice.name}</div>
                                        <div className="text-xs opacity-70 text-slate-500">{voice.lang}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {message && (
                            <div className={`p-3 rounded-lg text-sm text-center border ${message.includes('Error') ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'}`}>
                                {message}
                            </div>
                        )}

                        <Button onClick={handleManualSaveSettings} fullWidth disabled={loading}>
                            {loading ? 'Guardando...' : 'Guardar Configuración'}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};
