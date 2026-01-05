-- Tabla para almacenar preferencias de usuario
CREATE TABLE IF NOT EXISTS user_settings (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    
    -- Apariencia
    theme VARCHAR(20) DEFAULT 'light', -- 'light', 'dark'
    
    -- Voz y Audio
    preferred_voice_uri VARCHAR(255),
    speech_rate FLOAT DEFAULT 0.9,
    
    -- Estudio
    verb_repetitions INTEGER DEFAULT 1,
    visualization_seconds INTEGER DEFAULT 20,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);
