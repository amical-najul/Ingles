/**
 * Uses Browser Speech Synthesis directly.
 * Format verified for compatibility with Player.tsx
 */
export const generateSpeech = async (text: string, isEnglish: boolean = true): Promise<string> => {
    return "BROWSER_TTS_FALLBACK::" + JSON.stringify({
        text,
        lang: isEnglish ? 'en-US' : 'es-ES'
    });
};
