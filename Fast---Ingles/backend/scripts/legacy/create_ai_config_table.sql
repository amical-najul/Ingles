-- Tabla para configuración dinámica de proveedores de IA
CREATE TABLE IF NOT EXISTS ai_configs (
    id SERIAL PRIMARY KEY,
    provider VARCHAR(50) UNIQUE NOT NULL,
    api_key VARCHAR(255),
    model VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Insertar proveedores por defecto (si no existen)
INSERT INTO ai_configs (provider, model, is_active, api_key) VALUES
('gemini', 'gemini-1.5-flash', TRUE, ''),
('claude', 'claude-3-5-sonnet-20241022', FALSE, ''),
('openai', 'gpt-4o-mini', FALSE, ''),
('deepseek', 'deepseek-chat', FALSE, '')
ON CONFLICT (provider) DO NOTHING;
