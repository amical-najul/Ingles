
import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Dashboard } from './components/Dashboard';
import { Player } from './components/Player';
import { ProgressScreen } from './components/ProgressScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { PracticeSelectionScreen } from './components/PracticeSelectionScreen';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { LoginScreen } from './components/auth/LoginScreen';
import { RegisterScreen } from './components/auth/RegisterScreen';
import { ForgotPasswordScreen } from './components/auth/ForgotPasswordScreen';

import { AppState, WordEntry, User, CategoryType } from './types';
import { apiService } from './services/apiService';
import { storageService } from './services/storageService';
import { STAGES } from './constants';

// Helper to get category label in Spanish for loading messages
const getCategoryLabel = (category: CategoryType): string => {
  const labels: Record<CategoryType, string> = {
    'verbs': 'verbos',
    'adjectives': 'adjetivos',
    'nouns': 'sustantivos',
    'adverbs': 'adverbios'
  };
  return labels[category] || 'palabras';
};


const AppContent: React.FC = () => {
  const { user, loading, logout } = useAuth(); // Removed dbUser

  // Auth View State
  const [authView, setAuthView] = useState<'login' | 'register' | 'forgot'>('login');

  // App State
  const [appState, setAppState] = useState<AppState>(AppState.DASHBOARD);
  const [viewMode, setViewMode] = useState<'admin' | 'user'>('user');
  const [darkMode, setDarkMode] = useState(true);

  // Learning State
  const [stages, setStages] = useState<any[]>(STAGES); // Default to local constant
  const [currentTopic, setCurrentTopic] = useState<string>("");
  const [currentDayId, setCurrentDayId] = useState<number>(0);
  const [lessonData, setLessonData] = useState<WordEntry[]>([]);
  const [initialPlayerIndex, setInitialPlayerIndex] = useState<number>(0);
  const [currentCategory, setCurrentCategory] = useState<CategoryType>('verbs');
  const [currentWordCount, setCurrentWordCount] = useState<number>(50);
  const [error, setError] = useState<string | null>(null);

  // Sync Stages from Backend
  useEffect(() => {
    const fetchStages = async () => {
      try {
        const remoteStages = await apiService.getStages();
        if (remoteStages && remoteStages.length > 0) {
          // We might need to map key names if backend differs from frontend DayTopic
          // Backend Stage: { id, title, description, icon, phase, level, category, word_count }
          // Frontend DayTopic: { id, title, description, icon, phase, level, category, wordCount }
          const mapped = remoteStages.map((s: any) => ({
            id: s.id,
            title: s.title,
            description: s.description,
            icon: s.icon,
            phase: s.phase,
            level: s.level,
            category: s.category,
            wordCount: s.word_count
          }));
          setStages(mapped);
        }
      } catch (err) {
        console.error("Failed to load stages from backend, using fallback.", err);
      }
    };
    fetchStages();
  }, []);

  // Initial Config Load
  useEffect(() => {
    const prefs = storageService.getPreferences();
    setDarkMode(prefs.darkMode);
  }, []);

  // Role Sync
  useEffect(() => {
    if (user?.role === 'admin') {
      setViewMode('admin');
      setAppState(AppState.ADMIN_DASHBOARD);
    } else if (user) {
      setViewMode('user');
      setAppState(AppState.DASHBOARD);
    }
  }, [user?.role]);

  // --- HANDLERS ---

  const handleLogout = async () => {
    logout(); // Sync wrapper
    setAppState(AppState.AUTH);
  };

  const handleSelectDay = async (dayId: number, topic: string) => {
    const stageConfig = stages.find(s => s.id === dayId);
    const category = stageConfig?.category || 'verbs';
    const wordCount = stageConfig?.wordCount || 50;

    setCurrentTopic(topic);
    setCurrentDayId(dayId);
    setCurrentCategory(category);
    setCurrentWordCount(wordCount);
    setAppState(AppState.LOADING);
    setError(null);

    try {
      await new Promise(r => setTimeout(r, 100)); // UI Breath
      const savedIndex = storageService.getProgress(dayId);
      setInitialPlayerIndex(savedIndex);

      const lesson = await apiService.getLesson(dayId);

      if (!lesson || !lesson.content || lesson.content.length === 0) {
        throw new Error(
          "Este nivel aún no está disponible. " +
          "El administrador debe generar el contenido primero."
        );
      }

      setLessonData(lesson.content);
      setAppState(AppState.PLAYER);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "No pudimos cargar la lección. Por favor intenta de nuevo.");
      setAppState(AppState.ERROR);
    }
  };

  const handleStartPractice = (selectedWords: WordEntry[]) => {
    setLessonData(selectedWords);
    setCurrentTopic("Práctica Personalizada");
    setCurrentDayId(0);
    setInitialPlayerIndex(0);
    setAppState(AppState.PLAYER);
  };

  // --- RENDER LOGIC ---

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // 1. Not Authenticated -> Show Auth Screens
  if (!user) {
    if (authView === 'register') {
      return (
        <RegisterScreen
          onSwitchToLogin={() => setAuthView('login')}
          onRegistrationSuccess={() => { }} // Auto-login handles navigation by updating 'user'
        />
      );
    }
    if (authView === 'forgot') return <ForgotPasswordScreen onBack={() => setAuthView('login')} />;
    return <LoginScreen onSwitchToRegister={() => setAuthView('register')} onForgotPassword={() => setAuthView('forgot')} />;
  }

  // 2. Admin View
  if (viewMode === 'admin' && user?.role === 'admin') {
    return (
      <AdminDashboard
        user={user}
        onLogout={handleLogout}
        onSwitchToApp={() => { setViewMode('user'); setAppState(AppState.DASHBOARD); }}
      />
    );
  }

  // 3. User View
  const bgClass = darkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900';

  return (
    <div className={`antialiased min-h-screen transition-colors duration-300 ${bgClass}`}>
      {appState === AppState.DASHBOARD && (
        <Dashboard
          user={user}
          darkMode={darkMode}
          stages={stages}
          onSelectDay={handleSelectDay}
          onLogout={handleLogout}
          onViewProgress={() => setAppState(AppState.PROGRESS)}
          onOpenSettings={() => setAppState(AppState.SETTINGS)}
          onOpenPractice={() => setAppState(AppState.PRACTICE_SELECTION)}
          onSwitchToAdmin={user.role === 'admin' ? () => { setViewMode('admin'); setAppState(AppState.ADMIN_DASHBOARD); } : undefined}
        />
      )}

      {appState === AppState.PROGRESS && (
        <ProgressScreen darkMode={darkMode} onBack={() => setAppState(AppState.DASHBOARD)} />
      )}

      {appState === AppState.SETTINGS && (
        <SettingsScreen
          user={user}
          darkMode={darkMode}
          onBack={() => setAppState(AppState.DASHBOARD)}
          onUpdateUser={(u) => { /* Update handled via context / service if needed */ }}
          onToggleDarkMode={(isDark) => {
            setDarkMode(isDark);
            const prefs = storageService.getPreferences();
            prefs.darkMode = isDark;
            storageService.savePreferences(prefs);
          }}
        />
      )}

      {appState === AppState.PRACTICE_SELECTION && (
        <PracticeSelectionScreen
          darkMode={darkMode}
          onBack={() => setAppState(AppState.DASHBOARD)}
          onStartPractice={handleStartPractice}
        />
      )}

      {appState === AppState.LOADING && (
        <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center p-6 text-center z-50">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-6"></div>
          <h2 className="text-xl font-bold text-white mb-2">Creando tu clase de {getCategoryLabel(currentCategory)}...</h2>
        </div>
      )}

      {appState === AppState.PLAYER && (
        <Player
          words={lessonData}
          topic={currentTopic}
          dayId={currentDayId}
          initialIndex={initialPlayerIndex}
          darkMode={darkMode}
          category={currentCategory}
          onExit={() => { setAppState(AppState.DASHBOARD); setLessonData([]); }}
        />
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
