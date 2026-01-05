"""
Ultra-safe seed script to migrate STAGES.
Uses environment variables for all credentials.
"""
import asyncio
import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Load .env file if present
load_dotenv()

# Get DATABASE_URL from environment (set by Docker or .env)
DATABASE_URL = os.environ.get('DATABASE_URL')

if not DATABASE_URL:
    print("ERROR: DATABASE_URL environment variable not set.")
    print("Please set it in your .env file or container environment.")
    exit(1)

# Ensure asyncpg driver is used
if DATABASE_URL.startswith('postgresql://'):
    DATABASE_URL = DATABASE_URL.replace('postgresql://', 'postgresql+asyncpg://', 1)

STAGES_DATA = [
  {"id": 1, "title": "Nivel 1: El Núcleo", "description": "Los 50 verbos más usados (Be, Have, Do, Make, Go, Come, Take...)", "icon": "🧬", "phase": "Fase 1: La Base", "level": "A1", "category": "verbs", "word_count": 50},
  {"id": 2, "title": "Nivel 2: Supervivencia", "description": "Cuerpo y necesidades (Eat, Drink, Sleep, Wake, Wash, Help...)", "icon": "🍎", "phase": "Fase 1: La Base", "level": "A1", "category": "verbs", "word_count": 50},
  {"id": 3, "title": "Nivel 3: Movimiento", "description": "Espacio y desplazamiento (Run, Walk, Fly, Enter, Leave, Turn...)", "icon": "🏃", "phase": "Fase 1: La Base", "level": "A1", "category": "verbs", "word_count": 50},
  {"id": 4, "title": "Nivel 4: Modificadores", "description": "Modales y Permisos (Can, Must, Should, Allow, Let, Dare...)", "icon": "🚦", "phase": "Fase 2: Interacción", "level": "A2", "category": "verbs", "word_count": 50},
  {"id": 5, "title": "Nivel 5: Comunicación", "description": "Hablar y escribir (Say, Tell, Speak, Ask, Answer, Call, Explain...)", "icon": "🗣️", "phase": "Fase 2: Interacción", "level": "A2", "category": "verbs", "word_count": 50},
  {"id": 6, "title": "Nivel 6: Rutina y Ocio", "description": "Vida diaria (Play, Watch, Listen, Read, Write, Enjoy, Wait...)", "icon": "🎮", "phase": "Fase 2: Interacción", "level": "B1", "category": "verbs", "word_count": 50},
  {"id": 7, "title": "Nivel 7: El Caos (Irregulares)", "description": "Irregulares Pack 1 - 3 Columnas (Bring, Buy, Catch, Teach...)", "icon": "🌪️", "phase": "Fase 3: Pasado y Mente", "level": "B1", "category": "verbs", "word_count": 50},
  {"id": 8, "title": "Nivel 8: Posesión", "description": "Dinero y negocios (Buy, Sell, Pay, Cost, Spend, Earn, Lose...)", "icon": "💰", "phase": "Fase 3: Pasado y Mente", "level": "B1", "category": "verbs", "word_count": 50},
  {"id": 9, "title": "Nivel 9: Procesos Mentales", "description": "Pensar y sentir (Think, Know, Learn, Forget, Remember, Dream...)", "icon": "🧠", "phase": "Fase 3: Pasado y Mente", "level": "B2", "category": "verbs", "word_count": 50},
  {"id": 10, "title": "Nivel 10: Patrones (Irregulares)", "description": "Irregulares Pack 2 - Por sonido (Ring/Rang/Rung, Sing/Sang/Sung...)", "icon": "🎶", "phase": "Fase 4: Perfeccionamiento", "level": "B2", "category": "verbs", "word_count": 50},
  {"id": 11, "title": "Nivel 11: Sentidos", "description": "Percepción y Emoción (See, Look, Hear, Sound, Touch, Smell...)", "icon": "👁️", "phase": "Fase 4: Perfeccionamiento", "level": "C1", "category": "verbs", "word_count": 50},
  {"id": 12, "title": "Nivel 12: Profesional", "description": "Mundo académico/laboral (Accept, Develop, Manage, Plan, Achieve...)", "icon": "💼", "phase": "Fase 4: Perfeccionamiento", "level": "C1", "category": "verbs", "word_count": 50},
  {"id": 13, "title": "Nivel 13: Boss Final", "description": "Phrasal Verbs Indispensables (Get up, Put on, Look for, Give up...)", "icon": "👑", "phase": "Fase 5: Maestría", "level": "C2", "category": "verbs", "word_count": 50},
  {"id": 101, "title": "Adj. Nivel 1: Descriptivos", "description": "Colores, Tamaños y Formas básicas", "icon": "🎨", "phase": "Fase 1: Cualidades", "level": "A1", "category": "adjectives", "word_count": 40},
  {"id": 102, "title": "Adj. Nivel 2: Personalidad", "description": "Carácter y emociones básicas", "icon": "😊", "phase": "Fase 1: Cualidades", "level": "A2", "category": "adjectives", "word_count": 40},
  {"id": 103, "title": "Adj. Nivel 3: Sensoriales", "description": "Tacto, Sabor y Clima", "icon": "❄️", "phase": "Fase 2: Percepción", "level": "B1", "category": "adjectives", "word_count": 40},
  {"id": 104, "title": "Adj. Nivel 4: Abstractos", "description": "Conceptos generales", "icon": "💡", "phase": "Fase 2: Percepción", "level": "B2", "category": "adjectives", "word_count": 40},
  {"id": 105, "title": "Adj. Nivel 5: Emociones Matizadas", "description": "Sentimientos complejos", "icon": "🎭", "phase": "Fase 3: Profundidad", "level": "B2", "category": "adjectives", "word_count": 40},
  {"id": 106, "title": "Adj. Nivel 6: Personalidad II", "description": "Rasgos de carácter avanzados", "icon": "🧠", "phase": "Fase 3: Profundidad", "level": "B2", "category": "adjectives", "word_count": 40},
  {"id": 107, "title": "Adj. Nivel 7: Tiempo y Velocidad", "description": "Duración y ritmo", "icon": "⏱️", "phase": "Fase 4: Precisión", "level": "C1", "category": "adjectives", "word_count": 40},
  {"id": 108, "title": "Adj. Nivel 8: Materiales y Estado", "description": "Físico y texturas", "icon": "🧱", "phase": "Fase 4: Precisión", "level": "C1", "category": "adjectives", "word_count": 40},
  {"id": 109, "title": "Adj. Nivel 9: Juicios de Valor", "description": "Opinión y Calidad", "icon": "🌟", "phase": "Fase 5: Maestría", "level": "C1", "category": "adjectives", "word_count": 40},
  {"id": 110, "title": "Adj. Nivel 10: Académico", "description": "Intelectual y Formal", "icon": "🎓", "phase": "Fase 5: Maestría", "level": "C2", "category": "adjectives", "word_count": 40},
  {"id": 111, "title": "Adj. Nivel 11: Literario", "description": "Estilo descriptivo avanzado", "icon": "📜", "phase": "Fase 5: Maestría C2", "level": "C2", "category": "adjectives", "word_count": 40},
  {"id": 112, "title": "Adj. Nivel 12: Filosófico", "description": "Existencia y lógica", "icon": "🤔", "phase": "Fase 5: Maestría C2", "level": "C2", "category": "adjectives", "word_count": 40},
  {"id": 201, "title": "Sus. Nivel 1: Entorno Inmediato", "description": "Casa y Familia", "icon": "🏠", "phase": "Fase 1: Lo Tangible", "level": "A1", "category": "nouns", "word_count": 40},
  {"id": 202, "title": "Sus. Nivel 2: Ciudad y Trabajo", "description": "Lugares y Profesiones", "icon": "🏢", "phase": "Fase 1: Lo Tangible", "level": "A2", "category": "nouns", "word_count": 40},
  {"id": 203, "title": "Sus. Nivel 3: Naturaleza y Tiempo", "description": "Mundo natural", "icon": "🌳", "phase": "Fase 2: El Mundo", "level": "B1", "category": "nouns", "word_count": 40},
  {"id": 204, "title": "Sus. Nivel 4: Conceptos Generales", "description": "Ideas básicas", "icon": "💭", "phase": "Fase 2: El Mundo", "level": "B2", "category": "nouns", "word_count": 40},
  {"id": 205, "title": "Sus. Nivel 5: Tecnología", "description": "Mundo digital", "icon": "💻", "phase": "Fase 3: Sociedad", "level": "B2", "category": "nouns", "word_count": 40},
  {"id": 206, "title": "Sus. Nivel 6: Negocios", "description": "Economía y Empresa", "icon": "📈", "phase": "Fase 3: Sociedad", "level": "B2", "category": "nouns", "word_count": 40},
  {"id": 207, "title": "Sus. Nivel 7: Gobierno y Ley", "description": "Política y Justicia", "icon": "⚖️", "phase": "Fase 4: Estructuras", "level": "C1", "category": "nouns", "word_count": 40},
  {"id": 208, "title": "Sus. Nivel 8: Salud", "description": "Cuerpo y Medicina", "icon": "🩺", "phase": "Fase 4: Estructuras", "level": "C1", "category": "nouns", "word_count": 40},
  {"id": 209, "title": "Sus. Nivel 9: Arte y Cultura", "description": "Creatividad", "icon": "🎭", "phase": "Fase 5: Abstracción", "level": "C1", "category": "nouns", "word_count": 40},
  {"id": 210, "title": "Sus. Nivel 10: Ciencia", "description": "Conocimiento", "icon": "🧪", "phase": "Fase 5: Abstracción", "level": "C2", "category": "nouns", "word_count": 40},
  {"id": 211, "title": "Sus. Nivel 11: Sociedad Global", "description": "Fenómenos Mundiales", "icon": "🌍", "phase": "Fase 5: Maestría C2", "level": "C2", "category": "nouns", "word_count": 40},
  {"id": 212, "title": "Sus. Nivel 12: Condición Humana", "description": "Existencia y Metafísica", "icon": "🧘", "phase": "Fase 5: Maestría C2", "level": "C2", "category": "nouns", "word_count": 40},
  {"id": 301, "title": "Adv. Nivel 1: Frecuencia", "description": "Tiempo y repetición", "icon": "📅", "phase": "Fase 1: Modificadores", "level": "A1", "category": "adverbs", "word_count": 40},
  {"id": 302, "title": "Adv. Nivel 2: Modo", "description": "Cómo se hacen las cosas", "icon": "⚡", "phase": "Fase 1: Modificadores", "level": "A2", "category": "adverbs", "word_count": 40},
  {"id": 303, "title": "Adv. Nivel 3: Cantidad y Grado", "description": "Intensidad", "icon": "📊", "phase": "Fase 2: Precisión", "level": "B1", "category": "adverbs", "word_count": 40},
  {"id": 304, "title": "Adv. Nivel 4: Conectores Lógicos", "description": "Estructura del discurso", "icon": "🔗", "phase": "Fase 4: Fluidez C1", "level": "C1", "category": "adverbs", "word_count": 40},
  {"id": 305, "title": "Adv. Nivel 5: Opinión y Certeza", "description": "Matices y Postura", "icon": "🧐", "phase": "Fase 5: Maestría C2", "level": "C2", "category": "adverbs", "word_count": 40}
]

async def seed():
    print(f"Connecting to database...")
    engine = create_async_engine(DATABASE_URL)
    session_factory = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with session_factory() as session:
        # Create table if not exists
        await session.execute(text("""
            CREATE TABLE IF NOT EXISTS stages (
                id INTEGER PRIMARY KEY,
                title VARCHAR NOT NULL,
                description VARCHAR,
                icon VARCHAR,
                phase VARCHAR,
                level VARCHAR NOT NULL,
                category VARCHAR NOT NULL,
                word_count INTEGER DEFAULT 50,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
        """))
        
        # Upsert data
        upsert_sql = text("""
            INSERT INTO stages (id, title, description, icon, phase, level, category, word_count)
            VALUES (:id, :title, :description, :icon, :phase, :level, :category, :word_count)
            ON CONFLICT (id) DO UPDATE SET
                title = EXCLUDED.title,
                description = EXCLUDED.description,
                icon = EXCLUDED.icon,
                phase = EXCLUDED.phase,
                level = EXCLUDED.level,
                category = EXCLUDED.category,
                word_count = EXCLUDED.word_count,
                updated_at = NOW()
        """)
        
        for s in STAGES_DATA:
            await session.execute(upsert_sql, s)
        
        await session.commit()
        print(f"✅ Successfully seeded {len(STAGES_DATA)} stages.")
    
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(seed())
