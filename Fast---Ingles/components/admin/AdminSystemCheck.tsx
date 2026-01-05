import React, { useState } from 'react';
import { apiService } from '../../services/apiService';

interface DiagnosticWord {
    word: string;
    pronunciation: string;
    translation: string;
    mnemonic: string;
    minio_audio_key: string | null;
    audio_verified: boolean;
}

export const AdminSystemCheck: React.FC = () => {
    // Steps: 1=Generate, 2=Save Audio, 3=Verify
    const [step, setStep] = useState<1 | 2 | 3>(1);

    // Data State
    const [runId, setRunId] = useState<string>('');
    const [generatedWords, setGeneratedWords] = useState<any[]>([]);
    const [verifiedWords, setVerifiedWords] = useState<DiagnosticWord[]>([]);
    const [generatedTopic, setGeneratedTopic] = useState<string>('');

    // Interactive State
    const [progress, setProgress] = useState(0);
    const [currentWord, setCurrentWord] = useState('');
    const [failures, setFailures] = useState<string[]>([]);
    const [statusMessage, setStatusMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    // Loading States
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);

    // STEP 1: START DIAGNOSTIC (Auto-cleanup + Generate)
    const handleStartDiagnostic = async () => {
        setIsGenerating(true);
        setErrorMessage('');
        setSuccessMessage('');
        setFailures([]);
        setProgress(0);

        try {
            // This call auto-cleans previous data and generates new words
            const result = await apiService.diagnosticsStart();

            setRunId(result.run_id);
            setGeneratedWords(result.words);
            setGeneratedTopic(result.topic);
            setStep(2);
            setSuccessMessage(`✅ Generados ${result.words.length} verbos aleatorios`);
            setTimeout(() => setSuccessMessage(''), 2000);
        } catch (error: any) {
            console.error("Diagnosis Error (Start):", error);
            setErrorMessage(`Error iniciando diagnóstico: ${error.response?.data?.detail || error.message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    // STEP 2: GENERATE AUDIO FOR EACH WORD
    const handleGenerateAudios = async () => {
        setIsSaving(true);
        setProgress(0);
        setFailures([]);
        setStatusMessage('Iniciando generación de audios...');

        let completed = 0;
        const total = generatedWords.length;
        const localFailures: string[] = [];

        for (const item of generatedWords) {
            setCurrentWord(item.word);
            let retries = 0;
            let success = false;

            while (retries < 3 && !success) {
                try {
                    const attemptLabel = retries > 0 ? `(Reintento ${retries}/3)` : '';
                    setStatusMessage(`Procesando: ${item.word} ${attemptLabel}`);

                    await apiService.diagnosticsGenerateAudio(runId, item.word);
                    success = true;
                } catch (e) {
                    retries++;
                    console.warn(`Retry ${retries} for ${item.word}`, e);
                    await new Promise(r => setTimeout(r, 1000));
                }
            }

            if (!success) {
                localFailures.push(item.word);
            }

            completed++;
            setProgress(Math.round((completed / total) * 100));
        }

        setFailures(localFailures);

        if (localFailures.length === 0) {
            setSuccessMessage("✅ ¡Audios generados! Verificando...");
            setTimeout(() => {
                setSuccessMessage('');
                setStep(3);
                handleLoadVerification();
            }, 1500);
        } else {
            setErrorMessage(`Fallos en ${localFailures.length} audios.`);
        }

        setIsSaving(false);
        setStatusMessage('');
        setCurrentWord('');
    };

    // STEP 3: LOAD VERIFICATION DATA
    const handleLoadVerification = async () => {
        setIsLoadingDetails(true);
        try {
            const result = await apiService.diagnosticsGetRun(runId);
            setVerifiedWords(result.words);
        } catch (error) {
            console.error("Diagnosis Error (Verify):", error);
            setErrorMessage("Error cargando datos de verificación.");
        } finally {
            setIsLoadingDetails(false);
        }
    };

    // PLAY AUDIO
    const handlePlayAudio = async (word: string) => {
        try {
            const result = await apiService.diagnosticsGetAudioUrl(runId, word);

            if (result.fallback) {
                setErrorMessage(`⚠️ Fallback: Audio no en MinIO para '${word}'.`);
                setTimeout(() => setErrorMessage(''), 3000);
                const utterance = new SpeechSynthesisUtterance(word);
                utterance.lang = 'en-US';
                window.speechSynthesis.speak(utterance);
            } else {
                const audio = new Audio(result.url);
                await audio.play();
            }
        } catch (error) {
            console.error("Audio Playback Error:", error);
            setErrorMessage("Error reproduciendo audio.");
            setTimeout(() => setErrorMessage(''), 3000);
        }
    };

    // RESET
    const handleReset = () => {
        setStep(1);
        setRunId('');
        setGeneratedWords([]);
        setVerifiedWords([]);
        setGeneratedTopic('');
        setProgress(0);
        setFailures([]);
        setSuccessMessage('');
        setErrorMessage('');
    };

    return (
        <div className="max-w-4xl mx-auto p-8">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <span className="text-emerald-600">🛠️</span> System Check & Diagnosis
                </h2>
                <p className="text-slate-500">
                    Prueba de conexión: Frontend ↔ Backend ↔ IA ↔ MinIO.
                    {runId && <span className="ml-2 text-xs font-mono bg-slate-100 px-2 py-1 rounded">Run: {runId.slice(0, 8)}...</span>}
                </p>
            </div>

            {/* MESSAGES */}
            {successMessage && (
                <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 font-bold text-center">
                    {successMessage}
                </div>
            )}
            {errorMessage && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 font-bold text-center">
                    {errorMessage}
                </div>
            )}

            {/* PROGRESS STEPS */}
            <div className="flex items-center justify-between mb-12 relative">
                <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-200 -z-10"></div>

                {/* STEP 1 */}
                <div className={`flex flex-col items-center gap-2 bg-slate-50 px-4 ${step >= 1 ? 'opacity-100' : 'opacity-50'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${step > 1 ? 'bg-emerald-500 text-white' : step === 1 ? 'bg-blue-600 text-white' : 'bg-slate-300 text-slate-600'}`}>
                        {step > 1 ? '✓' : '1'}
                    </div>
                    <span className="text-xs font-bold uppercase text-slate-600">Generación AI</span>
                </div>

                {/* STEP 2 */}
                <div className={`flex flex-col items-center gap-2 bg-slate-50 px-4 ${step >= 2 ? 'opacity-100' : 'opacity-50'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${step > 2 ? 'bg-emerald-500 text-white' : step === 2 ? 'bg-blue-600 text-white' : 'bg-slate-300 text-slate-600'}`}>
                        {step > 2 ? '✓' : '2'}
                    </div>
                    <span className="text-xs font-bold uppercase text-slate-600">Audio + MinIO</span>
                </div>

                {/* STEP 3 */}
                <div className={`flex flex-col items-center gap-2 bg-slate-50 px-4 ${step >= 3 ? 'opacity-100' : 'opacity-50'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${verifiedWords.length > 0 ? 'bg-emerald-500 text-white' : step === 3 ? 'bg-blue-600 text-white' : 'bg-slate-300 text-slate-600'}`}>
                        3
                    </div>
                    <span className="text-xs font-bold uppercase text-slate-600">Verificación</span>
                </div>
            </div>

            {/* ACTION AREA */}
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8">

                {/* STEP 1 VIEW */}
                {step === 1 && (
                    <div className="text-center">
                        <div className="mb-6">
                            <h3 className="text-lg font-bold text-slate-800">Paso 1: Iniciar Diagnóstico</h3>
                            <p className="text-slate-500">
                                Se generarán 5 verbos aleatorios usando la IA.<br />
                                <span className="text-xs text-amber-600">⚠️ Los datos anteriores se borrarán automáticamente.</span>
                            </p>
                        </div>
                        <button
                            onClick={handleStartDiagnostic}
                            disabled={isGenerating}
                            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold flex items-center gap-2 mx-auto disabled:opacity-50"
                        >
                            {isGenerating ? '⏳ Conectando con IA...' : '⚡ Iniciar Diagnóstico'}
                        </button>
                    </div>
                )}

                {/* STEP 2 VIEW */}
                {step === 2 && (
                    <div className="text-center">
                        <div className="mb-6">
                            <h3 className="text-lg font-bold text-slate-800">Paso 2: Generar Audios</h3>
                            <p className="text-slate-500">Tema: <span className="font-mono text-emerald-600">{generatedTopic}</span></p>
                        </div>

                        {/* PREVIEW */}
                        {!isSaving && failures.length === 0 && (
                            <div className="bg-slate-50 p-4 rounded-lg mb-6 max-w-md mx-auto text-left text-xs font-mono border border-slate-200">
                                <p className="text-slate-400 mb-2">Palabras generadas:</p>
                                {generatedWords.map(w => (
                                    <div key={w.word} className="text-slate-600">• {w.word} <span className="text-slate-400">({w.translation})</span></div>
                                ))}
                            </div>
                        )}

                        {/* PROGRESS BAR */}
                        {isSaving && (
                            <div className="max-w-md mx-auto mb-8">
                                <p className="text-sm font-bold text-blue-600 mb-2">{statusMessage}</p>
                                <div className="w-full bg-slate-200 rounded-full h-4 mb-2 overflow-hidden">
                                    <div
                                        className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                                        style={{ width: `${progress}%` }}
                                    ></div>
                                </div>
                                <p className="text-xs text-right text-slate-400">{progress}% Completado</p>
                            </div>
                        )}

                        {/* FAILURES */}
                        {!isSaving && failures.length > 0 && (
                            <div className="mb-8 border border-red-200 bg-red-50 rounded-lg p-4 max-w-md mx-auto">
                                <h4 className="text-red-700 font-bold mb-2">⚠️ Errores ({failures.length})</h4>
                                <ul className="text-sm text-red-600 list-disc list-inside mb-4">
                                    {failures.map(f => <li key={f}>{f}</li>)}
                                </ul>
                                <button
                                    onClick={handleGenerateAudios}
                                    className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded border border-red-200 hover:bg-red-200 font-bold"
                                >
                                    🔁 Reintentar
                                </button>
                            </div>
                        )}

                        {!isSaving && failures.length === 0 && (
                            <button
                                onClick={handleGenerateAudios}
                                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold flex items-center gap-2 mx-auto"
                            >
                                🔊 Generar Audios
                            </button>
                        )}
                    </div>
                )}

                {/* STEP 3 VIEW */}
                {step === 3 && (
                    <div>
                        <div className="text-center mb-8">
                            <h3 className="text-lg font-bold text-slate-800">Paso 3: Verificación</h3>
                            <p className="text-slate-500 mb-4">Reproduce cada audio para verificar MinIO.</p>

                            <button
                                onClick={handleLoadVerification}
                                disabled={isLoadingDetails}
                                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold text-sm"
                            >
                                {isLoadingDetails ? 'Cargando...' : '🔄 Refrescar'}
                            </button>
                        </div>

                        {verifiedWords.length > 0 ? (
                            <div className="border border-slate-200 rounded-lg overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                                        <tr>
                                            <th className="p-3">Word</th>
                                            <th className="p-3">Translation</th>
                                            <th className="p-3">Audio</th>
                                            <th className="p-3 text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {verifiedWords.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50">
                                                <td className="p-3 font-bold text-slate-700">{item.word}</td>
                                                <td className="p-3 text-slate-500">{item.translation}</td>
                                                <td className="p-3">
                                                    <button
                                                        onClick={() => handlePlayAudio(item.word)}
                                                        className="flex items-center gap-2 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-md hover:bg-emerald-200 transition-colors text-sm font-bold"
                                                    >
                                                        🔊 Play
                                                    </button>
                                                </td>
                                                <td className="p-3 text-right">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${item.minio_audio_key ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                        {item.minio_audio_key ? '✓ MinIO' : '⏳ Pending'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center text-slate-400 py-8 italic">
                                Cargando datos de verificación...
                            </div>
                        )}

                        {/* COMPLETE */}
                        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col items-center gap-4">
                            <button
                                onClick={() => {
                                    setSuccessMessage('✅ Diagnóstico completado exitosamente');
                                    setTimeout(handleReset, 2000);
                                }}
                                disabled={verifiedWords.length === 0}
                                className="px-8 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-bold text-lg disabled:opacity-50"
                            >
                                ✅ Finalizar
                            </button>
                            <button
                                onClick={handleReset}
                                className="text-slate-400 hover:text-slate-600 text-sm underline"
                            >
                                Reiniciar Prueba
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};
