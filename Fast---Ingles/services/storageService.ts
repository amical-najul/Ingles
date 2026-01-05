
import { WordEntry, UserPreferences } from "../types";
import { STAGES } from "../constants";
import { apiService } from "./apiService";

const STORAGE_PREFIX = 'fast_ingles_lesson_v1_';
const PROGRESS_PREFIX = 'fast_ingles_progress_v1_';
const PREFS_KEY = 'fast_ingles_prefs_v1';

export const storageService = {
  /**
   * Saves a lesson to local storage
   */
  saveLesson: (dayId: number, data: WordEntry[]) => {
    try {
      const key = `${STORAGE_PREFIX}${dayId}`;
      localStorage.setItem(key, JSON.stringify(data));
      // Save timestamp if needed later
      localStorage.setItem(`${key}_timestamp`, Date.now().toString());
    } catch (e) {
      console.error("Failed to save lesson to local storage", e);
    }
  },

  /**
   * Retrieves a lesson from local storage
   */
  getLesson: (dayId: number): WordEntry[] | null => {
    try {
      const key = `${STORAGE_PREFIX}${dayId}`;
      const item = localStorage.getItem(key);
      if (item) {
        return JSON.parse(item) as WordEntry[];
      }
      return null;
    } catch (e) {
      console.error("Failed to load lesson from local storage", e);
      return null;
    }
  },

  /**
   * Update a specific word in a lesson (Admin Feature)
   */
  updateWordInLesson: (dayId: number, wordIndex: number, updatedEntry: WordEntry) => {
    const lesson = storageService.getLesson(dayId);
    if (lesson && lesson[wordIndex]) {
      lesson[wordIndex] = updatedEntry;
      storageService.saveLesson(dayId, lesson);
      return true;
    }
    return false;
  },

  /**
   * Retrieves ALL verbs from all cached lessons
   */
  getAllCachedLessons: (): { dayId: number, words: WordEntry[] }[] => {
    const allData: { dayId: number, words: WordEntry[] }[] = [];
    // Iterate over all stage IDs from STAGES constant instead of hardcoded limit
    for (const stage of STAGES) {
      const lesson = storageService.getLesson(stage.id);
      if (lesson && lesson.length > 0) {
        allData.push({ dayId: stage.id, words: lesson });
      }
    }
    return allData;
  },

  /**
   * Checks if a lesson exists
   */
  hasLesson: (dayId: number): boolean => {
    return !!localStorage.getItem(`${STORAGE_PREFIX}${dayId}`);
  },

  /**
   * Saves the current index progress for a specific day
   */
  saveProgress: (dayId: number, index: number) => {
    try {
      const key = `${PROGRESS_PREFIX}${dayId}`;
      localStorage.setItem(key, index.toString());
    } catch (e) {
      console.error("Failed to save progress", e);
    }

    // Background Sync to Backend
    if (apiService.isAuthenticated()) {
      apiService.updateProgress(dayId, index).catch(err => console.error("Bg sync failed", err));
    }
  },

  /**
   * Gets the last saved index for a specific day
   */
  getProgress: (dayId: number): number => {
    try {
      const key = `${PROGRESS_PREFIX}${dayId}`;
      const item = localStorage.getItem(key);
      return item ? parseInt(item, 10) : 0;
    } catch (e) {
      return 0;
    }
  },

  /**
   * Calculates overall stats
   */
  getOverallStats: () => {
    let totalLearned = 0;
    const totalVerbs = STAGES.reduce((acc, curr) => acc + curr.wordCount, 0);
    const dayBreakdown: { id: number, learned: number }[] = [];

    for (const stage of STAGES) {
      const learned = storageService.getProgress(stage.id);
      totalLearned += learned;
      dayBreakdown.push({ id: stage.id, learned });
    }

    return {
      totalLearned,
      totalVerbs,
      percentage: totalVerbs > 0 ? Math.round((totalLearned / totalVerbs) * 100) : 0,
      dayBreakdown
    };
  },

  getAdminGlobalStats: () => {
    // 1. Calculate Content Stats
    const allLessons = storageService.getAllCachedLessons();
    const generatedStages = allLessons.length;
    const totalWordsGenerated = allLessons.reduce((acc, l) => acc + l.words.length, 0);
    const totalAvailableStages = STAGES.length;

    return {
      generatedStages,
      totalWordsGenerated,
      totalAvailableStages,
      storageUsage: JSON.stringify(localStorage).length
    };
  },

  /**
   * Save User Preferences
   */
  savePreferences: (prefs: UserPreferences) => {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));

    // Background Sync
    if (apiService.isAuthenticated()) {
      apiService.updateSettings({
        theme: prefs.darkMode ? 'dark' : 'light',
        preferred_voice_uri: prefs.preferredVoiceURI,
        speech_rate: prefs.speechRate,
        verb_repetitions: prefs.verbRepetitions,
        visualization_seconds: prefs.visualizationSeconds
      }).catch(e => console.error("Pref sync failed", e));
    }
  },

  /**
   * Get User Preferences
   */
  getPreferences: (): UserPreferences => {
    const str = localStorage.getItem(PREFS_KEY);
    if (str) {
      try {
        const parsed = JSON.parse(str);
        // Default settings if not set
        if (!parsed.visualizationSeconds) parsed.visualizationSeconds = 20;
        if (!parsed.speechRate) parsed.speechRate = 0.9;
        if (!parsed.verbRepetitions) parsed.verbRepetitions = 1;
        if (parsed.darkMode === undefined) parsed.darkMode = true; // Default to dark
        return parsed;
      } catch { }
    }
    return { darkMode: true, preferredVoiceURI: null, visualizationSeconds: 20, speechRate: 0.9, verbRepetitions: 1 };
  },

  /**
   * Syncs local storage with backend data
   */
  syncWithBackend: async () => {
    if (!apiService.isAuthenticated()) return;

    try {
      // 1. Sync Settings
      const serverSettings = await apiService.getSettings();
      const localSettings = storageService.getPreferences();
      // Simple strategy: Server wins for now, unless local has critical diff? 
      // Use server settings to overwrite local
      if (serverSettings) {
        const merged = { ...localSettings, ...serverSettings }; // Server settings naming might differ? 
        // BE returns: { theme, speech_rate... } which matches UserPreferences roughly
        // We need to map if names differ. 
        // UserPreferences: darkMode, preferredVoiceURI, speechRate...
        // backend UserSettings: theme ('dark'/'light'), preferred_voice_uri, speech_rate...

        const mappedPrefs: UserPreferences = {
          darkMode: serverSettings.theme === 'dark',
          preferredVoiceURI: serverSettings.preferred_voice_uri,
          speechRate: serverSettings.speech_rate,
          verbRepetitions: serverSettings.verb_repetitions,
          visualizationSeconds: serverSettings.visualization_seconds
        };
        localStorage.setItem(PREFS_KEY, JSON.stringify(mappedPrefs));
      }

      // 2. Sync Progress
      const serverProgress = await apiService.getAllProgress();
      if (serverProgress && Array.isArray(serverProgress)) {
        serverProgress.forEach((p: any) => {
          const key = `${PROGRESS_PREFIX}${p.day_id}`;
          // If server has progress, overwrite local? Or max?
          // Let's take max to be safe if offline progress happened
          const localVal = storageService.getProgress(p.day_id);
          if (p.current_index > localVal) {
            localStorage.setItem(key, p.current_index.toString());
          } else if (localVal > p.current_index) {
            // Push local to server
            apiService.updateProgress(p.day_id, localVal, 0, 0);
          }
        });
      }
    } catch (e) {
      console.error("Sync failed", e);
    }
  },

  /**
   * Clears all app data
   */
  clearAllData: () => {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(STORAGE_PREFIX) || key.startsWith(PROGRESS_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  }
};
