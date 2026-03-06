# THINK Platform - Guía de Configuración Post-Deploy

## 🚀 Status Actual
- ✅ **Frontend**: https://web-three-sooty-37.vercel.app (Activo)
- ✅ **Backend**: https://api-rose-xi-29.vercel.app (Deployado, pero protegido)
- ✅ **Código**: Pusheado a repo principal con etiqueta "Transform coworking into THINK"

---

## 📋 Checklist de Configuración

### 1. ⚠️ Deshabilitar Deployment Protection (CRÍTICO)

**Problema**: Por defecto, Vercel habilita SSO en nuevos proyectos, bloqueando acceso público.

**Solución**:

#### Para el Proyecto API:
1. Ve a: **https://vercel.com/frankguiloz123-1994s-projects/api/settings**
2. En sidebar: `Settings` → `Deployment Protection`
3. Cambia a: `Disabled` (desactiva todas las protecciones)
4. Confirma y espera ~30 segundos para que surta efecto

#### Para el Proyecto Web (opcional, ya está público):
- Verifica que esté en `Disabled` también
- URL: **https://vercel.com/frankguiloz123-1994s-projects/web/settings**

**Validación**:
```powershell
$response = Invoke-RestMethod -Uri "https://api-rose-xi-29.vercel.app/health" `
  -Method GET -ErrorAction SilentlyContinue
$response | ConvertTo-Json
# Debería retornar: {"ok":true,"service":"THINK API"}
```

---

### 2. 🔑 Variables de Entorno (Opcionales pero Recomendadas)

#### API - LiveKit Credentials
Si tienes cuenta LiveKit, agrega a https://vercel.com/frankguiloz123-1994s-projects/api/settings/environment-variables:

| Variable | Valor (Ejemplo) |
|----------|-----------------|
| `LIVEKIT_API_KEY` | tu-api-key |
| `LIVEKIT_API_SECRET` | tu-api-secret |
| `LIVEKIT_URL` | ws://tu-livekit-server.com |
| `CORS_ORIGIN` | https://web-three-sooty-37.vercel.app |

**Nota**: Sin estas, `/livekit/token` retorna advertencia pero no falla.

#### Web - API URL (ya configurado)
Si quieres override, en https://vercel.com/frankguiloz123-1994s-projects/web/settings/environment-variables:

| Variable | Valor |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | https://api-rose-xi-29.vercel.app |

---

### 3. 🗄️ PostgreSQL en Producción (Opcional)

#### Opción A: Vercel Postgres (Recomendado)
1. En Vercel Dashboard: `Storage` → `Create Database` → `Postgres`
2. Copia `DATABASE_URL` generada
3. Agrega a API environment variables en Settings
4. Red deploy: Vercel lo actualizará automáticamente

#### Opción B: Base de Datos Externa (AWS RDS, Railway, etc.)
1. Provisiona PostgreSQL en tu proveedor
2. Obtén connection string (URL)
3. Agrega como `DATABASE_URL` en API settings

#### Opción C: Sin Base de Datos (Actualmente funciona)
- API funciona sin PostgreSQL (fallback a in-memory)
- Reuniones NO se persisten entre restarts
- Endpoints `/health` y `/think/analyze` funcionan 100%

**Para verificar conectividad**:
```powershell
# Si configuraste DB, este endpoint debería retornar historial:
$response = Invoke-RestMethod -Uri "https://api-rose-xi-29.vercel.app/meetings" `
  -Method GET
$response | ConvertTo-Json
```

---

## 🧪 Testing Post-Deploy

### Test 1: Health Check
```powershell
Invoke-RestMethod -Uri "https://api-rose-xi-29.vercel.app/health" -Method GET | ConvertTo-Json
```

**Respuesta esperada**:
```json
{
  "ok": true,
  "service": "THINK API"
}
```

---

### Test 2: Think Engine Analysis
```powershell
$body = @{
  roomName = "test-meeting"
  transcript = "María: Decidimos usar React 19. Juan: Tarea para Carlos - setup base de datos. Ana: Idea clave - usar TypeScript para types."
  participants = @("María", "Juan", "Ana")
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://api-rose-xi-29.vercel.app/think/analyze" `
  -Method POST -ContentType "application/json" -Body $body | ConvertTo-Json -Depth 10
```

**Respuesta esperada**:
```json
{
  "summary": "...",
  "decisions": ["usar React 19"],
  "tasks": ["Carlos - setup base de datos"],
  "keyIdea": "usar TypeScript para types",
  "map": {...}
}
```

---

### Test 3: LiveKit Token (sin credenciales)
```powershell
$response = Invoke-RestMethod -Uri "https://api-rose-xi-29.vercel.app/livekit/token?room=test&identity=user1" `
  -Method GET
$response | ConvertTo-Json
```

**Respuesta sin credenciales**:
```json
{
  "token": null,
  "url": "",
  "warning": "LIVEKIT no configurado. Configure env vars: LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL"
}
```

---

## 🌐 URLs Finales

| Componente | URL | Status |
|-----------|-----|--------|
| Web App | https://web-three-sooty-37.vercel.app | ✅ Live |
| API Alias | https://api-rose-xi-29.vercel.app | ⚠️ SSO (till disabled) |
| Direct API | https://api-rose-xi-29.vercel.app | ⚠️ SSO (till disabled) |

---

## 🔧 Desarrollo Local

### Iniciar Todo
```bash
cd c:\Users\Usuario\OneDrive\Escritorio\DARE\curso-react-intro\think
docker-compose up -d          # Inicia PostgreSQL en localhost:5432
npm run dev                   # Inicia web + api en paralelo
```

### Endpoints Locales
- Web: http://localhost:3000
- API: http://localhost:4001/health

### Variables de Entorno Locales
Crea `.env.api` en `apps/api/`:
```
LIVEKIT_API_KEY=tu-key
LIVEKIT_API_SECRET=tu-secret
LIVEKIT_URL=ws://localhost:6080
DATABASE_URL=postgresql://think:think@localhost:5432/think
```

---

## 🎯 Próximos Pasos

1. **INMEDIATO**: Deshabilitar Deployment Protection (bloquea 100% del acceso público)
2. **Día 1**: Validar endpoints con tests en sección Testing
3. **Día 2**: (Opcional) Configurar LiveKit con credenciales reales
4. **Día 3**: (Opcional) Provisionar PostgreSQL en producción

---

## 📞 Troubleshooting

**Q: "401 Unauthorized" en la API**
→ Deployment Protection aún habilitado. Ve a Settings y desactívalo.

**Q: "/think/analyze" retorna error vacío**
→ Verifica que el `transcript` no esté vacío en el POST body.

**Q: LiveKit token es `null`**
→ Sin env vars configurados. Es normal. Configura si necesitas WebRTC real.

**Q: Reuniones no se guardan**
→ Sin PostgreSQL. Es normal (fallback a in-memory). Para persistencia, agrega DB.

---

**Última actualización**: 2026-03-05  
**Versión**: THINK v1 (Transform Coworking)
