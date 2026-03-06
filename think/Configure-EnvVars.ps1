# Script para configurar variables de entorno en Vercel projects
# Este es un TEMPLATE - requiere actualizar valores reales

Write-Host "=== THINK Platform - Configurar Environment Variables ===" -ForegroundColor Cyan
Write-Host ""

# Ejemplo: Configurar CORS_ORIGIN en API
Write-Host "1. Configurando CORS_ORIGIN en API..." -ForegroundColor Yellow
# vercel env add CORS_ORIGIN https://web-three-sooty-37.vercel.app --project=api

Write-Host "   📝 Comando deshabitado por defecto (evita sobrescribir)" -ForegroundColor Gray
Write-Host "   Para habilitar, editalo en el archivo" -ForegroundColor Gray
Write-Host ""

Write-Host "2. Variables disponibles para API (.env.api):" -ForegroundColor Yellow
Write-Host "   LIVEKIT_API_KEY        (opcional: tu-api-key)" -ForegroundColor Cyan
Write-Host "   LIVEKIT_API_SECRET     (opcional: tu-api-secret)" -ForegroundColor Cyan
Write-Host "   LIVEKIT_URL            (opcional: ws://tu-servidor.com)" -ForegroundColor Cyan
Write-Host "   CORS_ORIGIN            (opcional: https://web-three-sooty-37.vercel.app)" -ForegroundColor Cyan
Write-Host "   DATABASE_URL           (opcional: postgresql://...)" -ForegroundColor Cyan
Write-Host ""

Write-Host "3. Variables disponibles para Web (.env.web):" -ForegroundColor Yellow
Write-Host "   NEXT_PUBLIC_API_URL    (opcional: https://api-rose-xi-29.vercel.app)" -ForegroundColor Cyan
Write-Host ""

Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host "Para configurar vía UI de Vercel:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  API:  https://vercel.com/frankguiloz123-1994s-projects/api/settings/environment-variables" -ForegroundColor Cyan
Write-Host "  Web:  https://vercel.com/frankguiloz123-1994s-projects/web/settings/environment-variables" -ForegroundColor Cyan
Write-Host ""
Write-Host "Pasos:" -ForegroundColor Yellow
Write-Host "  1. Abre uno de los links arriba" -ForegroundColor White
Write-Host "  2. Click en 'Add New'" -ForegroundColor White
Write-Host "  3. Ingresa nombre y valor" -ForegroundColor White
Write-Host "  4. Selecciona ambientes: Production (mínimo)" -ForegroundColor White
Write-Host "  5. Save" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  IMPORTANTE: Después de cambiar env vars, Vercel redepliega automáticamente" -ForegroundColor Yellow
Write-Host ""
