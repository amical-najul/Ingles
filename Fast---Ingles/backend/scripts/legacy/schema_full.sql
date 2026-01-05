-- =============================================
-- SCHEMA MAESTRO: Fast-Ingles (Opción C)
-- Autenticación Propia + Contenido + Progreso
-- =============================================

-- 1. Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabla Levels
CREATE TABLE IF NOT EXISTS levels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    difficulty_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 3. Tabla Categories
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    slug VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 4. Tabla Users (Standalone Auth)
-- NOTA: Eliminamos dependencias de auth.users externo
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    status VARCHAR(50) DEFAULT 'active',
    photo_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 5. Tabla Lessons
CREATE TABLE IF NOT EXISTS lessons (
    id SERIAL PRIMARY KEY,
    day_id INTEGER UNIQUE NOT NULL,
    topic VARCHAR(255) NOT NULL,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    level_id INTEGER REFERENCES levels(id) ON DELETE SET NULL,
    content JSONB NOT NULL,
    word_count INTEGER NOT NULL,
    ai_provider VARCHAR(50),
    ai_model VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);
CREATE INDEX IF NOT EXISTS idx_lessons_day_id ON lessons(day_id);

-- 6. Tabla Progress
CREATE TABLE IF NOT EXISTS progress (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    day_id INTEGER NOT NULL REFERENCES lessons(day_id),
    current_index INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    score INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    UNIQUE(user_id, day_id)
);

-- 7. Tabla Audio Cache
CREATE TABLE IF NOT EXISTS audio_cache (
    id SERIAL PRIMARY KEY,
    text_hash VARCHAR(64) UNIQUE NOT NULL,
    text_content TEXT NOT NULL,
    language VARCHAR(10) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    minio_key VARCHAR(500) NOT NULL,
    file_size INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 8. Seed Data (Datos iniciales)
INSERT INTO levels (name, difficulty_order, description) VALUES
('A1', 1, 'Beginner'),
('A2', 2, 'Elementary'),
('B1', 3, 'Intermediate'),
('B2', 4, 'Upper Intermediate'),
('C1', 5, 'Advanced')
ON CONFLICT (name) DO NOTHING;

INSERT INTO categories (name, slug, description) VALUES
('Grammar', 'grammar', 'Grammar rules and structures'),
('Vocabulary', 'vocabulary', 'Word lists and usage'),
('Conversation', 'conversation', 'Dialogues and speaking practice')
ON CONFLICT (name) DO NOTHING;
