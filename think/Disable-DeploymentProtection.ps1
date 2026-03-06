# Script para deshabilitar Deployment Protection en ambos proyectos de Vercel
# Requiere: Vercel CLI instalado y autenticado (vercel login)
# Ubicación: ejecutar desde C:\Users\Usuario\OneDrive\Escritorio\DARE\curso-react-intro\think

Write-Host "=== THINK Platform - Deshabilitando Deployment Protection ===" -ForegroundColor Cyan
Write-Host ""

# API Project
Write-Host "1. Deshabilitando Deployment Protection en API project..." -ForegroundColor Yellow
$apiResult = & vercel env rm DEPLOYMENT_PROTECTION --yes --project=api 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✓ API Deployment Protection deshabilitado" -ForegroundColor Green
} else {
    Write-Host "   ℹ️  API: $($apiResult)" -ForegroundColor Gray
}
Write-Host ""

# Web Project  
Write-Host "2. Deshabilitando Deployment Protection en Web project..." -ForegroundColor Yellow
$webResult = & vercel env rm DEPLOYMENT_PROTECTION --yes --project=web 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✓ Web Deployment Protection deshabilitado" -ForegroundColor Green
} else {
    Write-Host "   ℹ️  Web: $($webResult)" -ForegroundColor Gray
}
Write-Host ""

Write-Host "=== Esperando 30 segundos para propagación... ===" -ForegroundColor Cyan
for ($i = 30; $i -gt 0; $i--) {
    Write-Host -NoNewline "`r  Conteo: $i segundos... "
    Start-Sleep -Seconds 1
}
Write-Host "`n" 

Write-Host "3. Validando endpoints..." -ForegroundColor Yellow
Write-Host ""

# Test API Health
Write-Host "   Testing: https://api-rose-xi-29.vercel.app/health" -ForegroundColor Cyan
try {
    $healthResponse = Invoke-RestMethod -Uri "https://api-rose-xi-29.vercel.app/health" -Method GET -TimeoutSec 5
    $healthResponse | ConvertTo-Json | Write-Host
    Write-Host "   ✓ API respondiendo correctamente" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  Endpoint no responde aún (timeout o aún filtrando)" -ForegroundColor Yellow
    Write-Host "   Motivo: $($_.Exception.Message)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "✅ Comando ejecutado!" -ForegroundColor Green
Write-Host ""
Write-Host "IMPORTANTE - Próximos pasos:" -ForegroundColor Yellow
Write-Host "  1. Espera 60+ segundos para propagación global de cambios"
Write-Host "  2. Visita: https://api-rose-xi-29.vercel.app/health en el navegador"
Write-Host "  3. Si ves {ok:true,...} = ✅ Listo"
Write-Host "  4. Si ves 401 Unauthorized = Deployment Protection aún activo"
Write-Host ""
Write-Host "Si la protección aún está activa, habilítala manualmente en:" -ForegroundColor Yellow
Write-Host "  - API: https://vercel.com/frankguiloz123-1994s-projects/api/settings"
Write-Host "  - Web: https://vercel.com/frankguiloz123-1994s-projects/web/settings"
Write-Host "  Busca: 'Deployment Protection' y cambia a 'Disabled'"
Write-Host ""
