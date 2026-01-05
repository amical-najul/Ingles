# 🚀 Fast-Ingles v1.0

**Aprende Inglés con IA - Método Ramón Campayo**

Una aplicación web para aprender inglés de forma rápida y efectiva, utilizando el método de memorización de Ramón Campayo combinado con generación de contenido por Inteligencia Artificial.

---

## 📋 Descripción

Fast-Ingles es una aplicación fullstack que permite a los usuarios aprender vocabulario en inglés a través de lecciones interactivas generadas por IA. Cada lección incluye:

- **Palabras y verbos** con pronunciación
- **Traducciones** al español
- **5 oraciones de ejemplo** por palabra
- **Mnemotecnicos** para facilitar la memorización
- **Audio TTS** (Text-to-Speech) generado automáticamente

---

## ✨ Características Principales (v1.0)

### 🔐 Sistema de Autenticación Propio
- Login/Registro con email y contraseña
- Tokens JWT para sesiones seguras
- Panel de administración de usuarios
- Roles de usuario (admin/standard)

### 🤖 Generación de Contenido con IA Multi-Proveedor
- Soporte para **Google Gemini**, **Claude**, **ChatGPT**, **DeepSeek**
- Configuración dinámica del proveedor desde el Admin Panel
- Generación de lecciones personalizadas por tema y categoría

### 🔊 Audio TTS con MinIO
- Generación de audio para cada palabra y oración
- Almacenamiento en MinIO (S3-compatible)
- Sistema de deduplicación para evitar duplicados

### 🛠️ System Check & Diagnosis
- Herramienta de diagnóstico del sistema
- Verifica conexión Frontend ↔ Backend ↔ IA ↔ MinIO
- Genera 5 verbos aleatorios de temas variados
- Tabla dedicada `system_diagnostics` para aislamiento de pruebas

### 👤 Gestión de Perfiles
- Avatar personalizable (upload de imagen)
- Preferencias de usuario
- Estadísticas de progreso

---

## 🏗️ Arquitectura

```
Fast-Ingles/
├── Frontend (React + TypeScript + Vite)
│   ├── components/           # Componentes React
│   ├── contexts/             # AuthContext
│   ├── services/             # API services
│   └── types.ts              # Tipos TypeScript
│
├── Backend (FastAPI + Python)
│   ├── app/
│   │   ├── routers/          # Endpoints API
│   │   ├── models/           # SQLAlchemy models
│   │   └── services/         # AI, TTS, Storage
│   └── scripts/              # Migraciones y utilidades
│
└── Docker
    ├── docker-compose.yml      # Desarrollo local
    └── docker-compose.prod.yml # Producción
```

---

## 🛠️ Tecnologías

| Capa | Tecnología |
|------|------------|
| Frontend | React 18, TypeScript, Vite, TailwindCSS |
| Backend | FastAPI, Python 3.11, SQLAlchemy |
| Base de Datos | PostgreSQL (Supabase) |
| Almacenamiento | MinIO (S3-compatible) |
| IA | Google Gemini, Anthropic Claude, OpenAI, DeepSeek |
| Contenedores | Docker, Docker Compose |

---

## 🚀 Instalación

### Prerrequisitos
- Docker & Docker Compose
- Node.js 18+ (para desarrollo local)
- Python 3.11+ (para desarrollo local)

### Desarrollo Local

```bash
# Clonar repositorio
git clone https://github.com/tu-usuario/fast-ingles.git
cd fast-ingles

# Copiar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# Levantar servicios
docker-compose up -d --build

# Frontend: http://localhost:8080
# Backend API: http://localhost:8000
# Docs: http://localhost:8000/docs
```

---

## 📝 Changelog v1.0

### ✨ Nuevas Características
- Sistema de Autenticación Self-Hosted (sin Firebase)
- System Check & Diagnosis con tabla dedicada
- Mensajes de Error detallados en Login
- Soporte Multi-Proveedor IA (Gemini, Claude, ChatGPT, DeepSeek)

### 🧹 Limpieza de Código
- Eliminados 15 archivos residuales (logs, scripts temporales)
- Scripts organizados en `scripts/legacy` y `scripts/debug`

---

## 👨‍💻 Desarrollador

Creado por **Jock Alcántara** 05 Enero 2026

---

## 📄 Licencia

Uso privado - Todos los derechos reservados.
