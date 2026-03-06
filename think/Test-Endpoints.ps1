# Script para validar endpoints de THINK API
# Ejecutar DESPUÉS de deshabilitar Deployment Protection

Write-Host "=== THINK Platform - Testing Endpoints ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  IMPORTANTE: Desactiva Deployment Protection primero (ejecuta Disable-DeploymentProtection.ps1)" -ForegroundColor Yellow
Write-Host ""

$API_URL = "https://api-rose-xi-29.vercel.app"

# Test 1: Health Check
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "TEST 1: Health Check" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Endpoint: GET $API_URL/health" -ForegroundColor Gray
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "$API_URL/health" -Method GET -TimeoutSec 5
    Write-Host "✅ SUCCESS (200)" -ForegroundColor Green
    Write-Host "Respuesta:" -ForegroundColor White
    $response | ConvertTo-Json | Write-Host -ForegroundColor Green
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "❌ FAIL (401 Unauthorized)" -ForegroundColor Red
        Write-Host "Causa: Deployment Protection aún está activo" -ForegroundColor Yellow
    } else {
        Write-Host "❌ FAIL ($($_.Exception.Response.StatusCode))" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""

# Test 2: Think Analyze
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "TEST 2: Think Engine Analysis" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Endpoint: POST $API_URL/think/analyze" -ForegroundColor Gray
Write-Host ""

$analysisBody = @{
    roomName = "test-reunion-20260305"
    transcript = "María: Decidimos usar React 19 y TypeScript. Juan: Ok, tarea para Carlos - setup de la base de datos PostgreSQL. Ana: Considero que la idea clave es implementar una arquitectura modular con componentes reutilizables."
    participants = @("María", "Juan", "Ana")
} | ConvertTo-Json

Write-Host "Request Body:" -ForegroundColor Gray
Write-Host $analysisBody -ForegroundColor Gray
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "$API_URL/think/analyze" `
        -Method POST `
        -ContentType "application/json" `
        -Body $analysisBody `
        -TimeoutSec 10
    
    Write-Host "✅ SUCCESS (200)" -ForegroundColor Green
    Write-Host "Respuesta:" -ForegroundColor White
    Write-Host ""
    
    # Mostrar componentes principales
    Write-Host "  📋 Summary:" -ForegroundColor Cyan
    Write-Host "     $($response.summary.Substring(0, [Math]::Min(100, $response.summary.Length)))..." -ForegroundColor Green
    Write-Host ""
    
    Write-Host "  ✅ Decisions:" -ForegroundColor Cyan
    $response.decisions | ForEach-Object { Write-Host "     • $_" -ForegroundColor Green }
    Write-Host ""
    
    Write-Host "  📌 Tasks:" -ForegroundColor Cyan
    $response.tasks | ForEach-Object { Write-Host "     • $_" -ForegroundColor Green }
    Write-Host ""
    
    Write-Host "  💡 Key Idea:" -ForegroundColor Cyan
    Write-Host "     $($response.keyIdea)" -ForegroundColor Green
    Write-Host ""
    
    # Mostrar JSON completo si quieres detalle
    # $response | ConvertTo-Json -Depth 10 | Write-Host -ForegroundColor Green
    
} catch {
    Write-Host "❌ FAIL" -ForegroundColor Red
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "Causa: Deployment Protection aún está activo (401)" -ForegroundColor Yellow
    } else {
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""

# Test 3: LiveKit Token
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "TEST 3: LiveKit Token Generation" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Endpoint: GET $API_URL/livekit/token?room=test-room&identity=test-user" -ForegroundColor Gray
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "$API_URL/livekit/token?room=test-room&identity=test-user" `
        -Method GET `
        -TimeoutSec 5
    
    Write-Host "✅ SUCCESS (200)" -ForegroundColor Green
    Write-Host "Respuesta:" -ForegroundColor White
    Write-Host ""
    
    if ($response.token) {
        Write-Host "  ✅ Token generado:" -ForegroundColor Green
        Write-Host "     Token: $($response.token.Substring(0, 50))..." -ForegroundColor Green
        Write-Host "     URL: $($response.url)" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Token no disponible" -ForegroundColor Yellow
        if ($response.warning) {
            Write-Host "     Aviso: $($response.warning)" -ForegroundColor Yellow
        }
        Write-Host ""
        Write-Host "     Esto es NORMAL si no has configurado credenciales LiveKit" -ForegroundColor Gray
        Write-Host "     Para usar LiveKit, agrega estos env vars en Vercel:" -ForegroundColor Gray
        Write-Host "     • LIVEKIT_API_KEY" -ForegroundColor Gray
        Write-Host "     • LIVEKIT_API_SECRET" -ForegroundColor Gray
        Write-Host "     • LIVEKIT_URL" -ForegroundColor Gray
    }
    
} catch {
    Write-Host "❌ FAIL" -ForegroundColor Red
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "Causa: Deployment Protection aún está activo (401)" -ForegroundColor Yellow
    } else {
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""

# Test 4: Meetings List
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "TEST 4: Meetings List (Historial)" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Endpoint: GET $API_URL/meetings?limit=5" -ForegroundColor Gray
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "$API_URL/meetings?limit=5" `
        -Method GET `
        -TimeoutSec 5
    
    Write-Host "✅ SUCCESS (200)" -ForegroundColor Green
    
    if ($response.Count -gt 0) {
        Write-Host "Reuniones encontradas: $($response.Count)" -ForegroundColor Green
        Write-Host ""
        $response | Select-Object -First 3 | ForEach-Object {
            Write-Host "  • $($_.roomName) - $($_.createdAt)" -ForegroundColor Green
        }
    } else {
        Write-Host "No hay reuniones guardadas (normal sin PostgreSQL)" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Para persistencia, configura DATABASE_URL en env vars de Vercel:" -ForegroundColor Gray
        Write-Host "  • Vercel Postgres, AWS RDS, Railway, etc." -ForegroundColor Gray
    }
    
} catch {
    Write-Host "❌ FAIL" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "✅ Testing completado!" -ForegroundColor Green
Write-Host ""
