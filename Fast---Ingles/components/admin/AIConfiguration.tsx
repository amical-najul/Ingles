import React, { useState, useEffect } from 'react';
import { adminService, AIConfig, AIConfigUpdate } from '../../services/adminService';
import { Button } from '../ui/Button';

// Constants for Models
const PROVIDER_MODELS: Record<string, string[]> = {
    gemini: ['gemini-2.0-flash-exp', 'gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'],
    claude: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'],
    openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o1-mini'],
    deepseek: ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner']
};

const PROVIDER_NAMES: Record<string, string> = {
    gemini: 'Google Gemini',
    claude: 'Anthropic Claude',
    openai: 'OpenAI ChatGPT',
    deepseek: 'DeepSeek'
};

const PROVIDER_LOGOS: Record<string, string> = {
    gemini: '✨',
    claude: '🤖',
    openai: '💬',
    deepseek: '🔮'
};

export const AIConfiguration: React.FC = () => {
    const [configs, setConfigs] = useState<AIConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState<Record<string, boolean>>({});
    const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

    // Load initial data
    const loadConfigs = async () => {
        setLoading(true);
        try {
            const data = await adminService.getAIConfigs();
            setConfigs(data);
        } catch (error) {
            console.error('Error loading AI configs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadConfigs();
    }, []);

    const handleUpdate = async (provider: string, data: AIConfigUpdate) => {
        setSaving(provider);
        try {
            const updatedConfig = await adminService.updateAIConfig(provider, data);
            setConfigs(prev => prev.map(c => c.provider === provider ? updatedConfig : (data.is_active ? { ...c, is_active: false } : c)));
            setHasUnsavedChanges(prev => ({ ...prev, [provider]: false }));
            setSaveSuccess(provider);
            setTimeout(() => setSaveSuccess(null), 2000);
        } catch (error) {
            console.error('Error updating config:', error);
            alert('Error al actualizar la configuración');
        } finally {
            setSaving(null);
        }
    };

    const handleLocalChange = (provider: string, field: string, value: string) => {
        const newConfigs = configs.map(c =>
            c.provider === provider ? { ...c, [field]: value } : c
        );
        setConfigs(newConfigs);
        setHasUnsavedChanges(prev => ({ ...prev, [provider]: true }));
    };

    const handleSaveConfig = (provider: string) => {
        const config = configs.find(c => c.provider === provider);
        if (config) {
            handleUpdate(provider, { api_key: config.api_key || '', model: config.model });
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Cargando configuración...</div>;

    const activeProvider = configs.find(c => c.is_active);

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <header>
                <h2 className="text-2xl font-bold text-slate-800">Configuración de IA</h2>
                <p className="text-slate-500">Configura las API keys y modelos para los proveedores de inteligencia artificial.</p>
            </header>

            {/* Active Provider Selector */}
            <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Proveedor Activo</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {configs.map(config => (
                        <button
                            key={config.provider}
                            onClick={() => handleUpdate(config.provider, { is_active: true })}
                            className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${config.is_active
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                : 'border-slate-200 hover:border-slate-300 text-slate-600'
                                }`}
                        >
                            <span className="text-3xl mb-2">{PROVIDER_LOGOS[config.provider] || '🤖'}</span>
                            <span className="font-bold text-sm">{PROVIDER_NAMES[config.provider] || config.provider}</span>
                            {config.is_active && <span className="text-xs mt-1 font-bold text-emerald-600">✓ Activo</span>}
                        </button>
                    ))}
                </div>
            </section>

            {/* Individual Configurations */}
            <div className="space-y-4">
                {configs.map(config => (
                    <div key={config.provider} className={`bg-white rounded-xl shadow-sm border transition-all ${config.is_active ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-slate-200'}`}>
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl bg-slate-100 w-10 h-10 flex items-center justify-center rounded-lg">
                                        {PROVIDER_LOGOS[config.provider] || '🤖'}
                                    </span>
                                    <div>
                                        <h4 className="font-bold text-slate-800">{PROVIDER_NAMES[config.provider] || config.provider}</h4>
                                        <p className="text-xs text-slate-500">Configura tu API key y modelo</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {saveSuccess === config.provider && (
                                        <span className="text-xs text-emerald-600 font-bold">✓ Guardado</span>
                                    )}
                                    {config.is_active && (
                                        <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-1 rounded">ACTIVO</span>
                                    )}
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">API Key</label>
                                    <div className="relative">
                                        <input
                                            type="password"
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none pr-10"
                                            placeholder={`Ingresa tu ${PROVIDER_NAMES[config.provider]} API Key`}
                                            value={config.api_key || ''}
                                            onChange={(e) => handleLocalChange(config.provider, 'api_key', e.target.value)}
                                        />
                                        <div className="absolute right-3 top-2.5 text-slate-400">
                                            🔑
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Modelo</label>
                                    <select
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                                        value={config.model}
                                        onChange={(e) => {
                                            handleLocalChange(config.provider, 'model', e.target.value);
                                            // Auto-save model change
                                            handleUpdate(config.provider, { model: e.target.value });
                                        }}
                                    >
                                        {PROVIDER_MODELS[config.provider]?.map(model => (
                                            <option key={model} value={model}>{model}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Save Button */}
                            <div className="mt-4 flex justify-end">
                                <button
                                    onClick={() => handleSaveConfig(config.provider)}
                                    disabled={saving === config.provider || !hasUnsavedChanges[config.provider]}
                                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${hasUnsavedChanges[config.provider]
                                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                        }`}
                                >
                                    {saving === config.provider ? 'Guardando...' : '💾 Guardar Cambios'}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
