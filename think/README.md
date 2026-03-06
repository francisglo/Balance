# THINK — Beyond Meethink

Plataforma para reuniones inteligentes con:

- **Frontend**: Next.js 14 + React 18 + Tailwind
- **Realtime**: LiveKit (WebRTC) + Yjs
- **Backend**: NestJS (local) / Express (Vercel)
- **Database**: PostgreSQL (Prisma, opcional)

## URLs En Vivo

| Componente | URL |
|-----------|-----|
| 🌐 Web App | https://web-three-sooty-37.vercel.app |
| 🔌 API | https://api-rose-xi-29.vercel.app* |

*Requiere deshabilitar Deployment Protection (ver Configuración)

## Estructura

- `apps/web`: Interfaz THINK (Next.js)
- `apps/api`: API (Express serverless + NestJS local)
- `docker-compose.yml`: PostgreSQL local

## 🚀 Configuración Post-Deploy (IMPORTANTE)

### 1. Deshabilitar Deployment Protection
```powershell
# Ejecuta desde la carpeta think/:
.\Disable-DeploymentProtection.ps1
```

Esto desactiva SSO en ambos proyectos Vercel. Espera ~60 segundos para efectos.

### 2. Probar Endpoints
```powershell
# Después de deshabilitar protección:
.\Test-Endpoints.ps1
```

Valida que la API responda correctamente.

### 3. Configurar Variables de Entorno (Opcional)
```powershell
.\Configure-EnvVars.ps1
```

Para LiveKit, CORS custom, o PostgreSQL en producción.

## 📖 Documentación Completa

Lee `DEPLOYMENT_SETUP.md` para:
- Instrucciones paso-a-paso de Deployment Protection
- Configuración de credenciales LiveKit
- Provisión de PostgreSQL en producción
- Troubleshooting

## 🛠️ Inicio Rápido (Desarrollo Local)

### Requisitos
- Node.js 18+
- Docker & Docker Compose
- Vercel CLI (para deploy)

### Setup

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Configurar variables:**
   ```bash
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env.local
   ```

3. **Inicializar datos:**
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   ```

4. **Iniciar PostgreSQL y servidor:**
   ```bash
   docker-compose up -d        # PostgreSQL en localhost:5432
   npm run dev                 # Web (3000) + API (4001) en paralelo
   ```

5. **Accede a:**
   - Web: http://localhost:3000
   - API Health: http://localhost:4001/health

## 💡 Flujo THINK

1. **Abre reunión** en https://web-three-sooty-37.vercel.app
2. **Pega transcripción** o colabora en tiempo real
3. **Ejecuta Think Engine** (botón "Ejecutar Think Engine")
4. **Recibe automáticamente:**
   - 📝 Resumen
   - ✅ Decisiones
   - 📌 Tareas
   - 🗺️ Mapa de ideas

## 📁 Directorios Importantes

```
think/
├── apps/
│   ├── web/                   # Next.js frontend
│   │   └── src/components/ThinkRoom.tsx
│   └── api/                   # Express API (Vercel)
│       ├── api/index.ts       # Serverless handler
│       └── src/               # NestJS modules (local dev)
├── DEPLOYMENT_SETUP.md        # Guía de configuración
├── Disable-DeploymentProtection.ps1
├── Test-Endpoints.ps1
└── Configure-EnvVars.ps1
```

## 🔑 Variables de Entorno

### API (.env.api)
```
LIVEKIT_API_KEY=tu-key
LIVEKIT_API_SECRET=tu-secret
LIVEKIT_URL=ws://tu-servidor:6080
DATABASE_URL=postgresql://think:think@localhost:5432/think
CORS_ORIGIN=http://localhost:3000
```

### Web (.env.web.local)
```
NEXT_PUBLIC_API_URL=http://localhost:4001
```

## 🐳 Docker Compose

Inicia PostgreSQL:
```bash
docker-compose up -d
```

Ver logs:
```bash
docker-compose logs -f postgres
```

Detener:
```bash
docker-compose down
```

## 📦 Scripts Disponibles

```bash
# Desarrollo
npm run dev          # Ambos apps (web + api)
npm run dev:web     # Solo frontend
npm run dev:api     # Solo API

# Build
npm run build        # Ambos apps
npm run build:web   # Solo web
npm run build:api   # Solo API

# Database
npm run prisma:generate
npm run prisma:migrate
npm run prisma:studio    # GUI de datos
```

## 🚢 Deployar a Vercel

```bash
# API
cd apps/api
vercel deploy --prod

# Web
cd ../web
vercel deploy --prod
```

## 🐛 Troubleshooting

**API retorna 401?**
→ Deployment Protection activo. Ejecuta `Disable-DeploymentProtection.ps1`

**LiveKit token es null?**
→ Normal sin credenciales. Configura env vars en Vercel settings.

**Reuniones no se guardan?**
→ Sin PostgreSQL. Configura `DATABASE_URL` en Vercel env vars.

## 📞 Soporte

Ver `DEPLOYMENT_SETUP.md` para troubleshooting detallado.

---

**v1 Deployed**: 2026-03-05  
**Last Updated**: 2026-03-05
